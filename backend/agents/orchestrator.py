import os
import json
import uuid
import time
import asyncio
import logging
import google.generativeai as genai
from typing import Dict, Any, List, AsyncGenerator
from pydantic import BaseModel

from .erc8004_client import discover_agents_by_specialty, update_reputation
from x402.payment import payment_processor

logger = logging.getLogger(__name__)

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

LEAD_AGENT_WALLET = os.getenv("LEAD_AGENT_WALLET_ADDRESS", "0xLeadAgentDefaultWalletAddress000123")

class Subtask(BaseModel):
    subtask_id: str
    description: str
    required_specialty: str
    estimated_complexity: str
    suggested_price_usd: float

async def generate_gemini_content(prompt: str, is_json: bool = False) -> str:
    """Helper to mock or call Gemini if key is available."""
    if not GEMINI_API_KEY:
        await asyncio.sleep(1.5) # Simulate API delay
        if is_json:
            # Fallback mock JSON
            return json.dumps([
                {
                    "subtask_id": "sub-1",
                    "description": "Gather initial data",
                    "required_specialty": "Research",
                    "estimated_complexity": "low",
                    "suggested_price_usd": 0.05
                },
                {
                    "subtask_id": "sub-2",
                    "description": "Draft a summary",
                    "required_specialty": "Writing",
                    "estimated_complexity": "medium",
                    "suggested_price_usd": 0.10
                }
            ])
        else:
            return "This is a mock response from the agent."

    try:
        model = genai.GenerativeModel('gemini-2.5-flash')
        response = await model.generate_content_async(prompt)
        text = response.text
        if is_json:
            # clean up markdown codeblocks if any
            if text.startswith("```json"):
                text = text.strip("```json").strip("```").strip()
        return text
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return "[]" if is_json else f"Error generating content: {str(e)}"

async def orchestrate_task(task_id: str, task_description: str, event_queue: asyncio.Queue, task_state: Dict):
    """
    The main orchestration engine.
    Runs async and puts events into the event_queue.
    """
    def emit(event_type: str, message: str, agent_name: str = "Lead Agent", amount: float = 0.0, tx_hash: str = "", step: int = 0):
        event_data = {
            "event_type": event_type,
            "message": message,
            "agent_name": agent_name,
            "amount": amount,
            "tx_hash": tx_hash,
            "timestamp": time.time(),
            "step": step
        }
        event_queue.put_nowait(event_data)

    emit("TASK_STARTED", "Lead agent received the task. Analyzing...", step=1)
    
    # Step 1: Decomposition
    decomposition_prompt = f"""
    You are the Lead Orchestrator AI. Your job is to break down the user's task into 2-4 subtasks.
    Specialties available: Research, Writing, Data Analysis, Summarization, Fact Checking.
    User Task: {task_description}
    Output ONLY a valid JSON array of objects with keys: subtask_id, description, required_specialty, estimated_complexity, suggested_price_usd.
    """
    
    decomposition_result = await generate_gemini_content(decomposition_prompt, is_json=True)
    
    try:
        subtasks_data = json.loads(decomposition_result)
        if not isinstance(subtasks_data, list):
            subtasks_data = [subtasks_data]
    except Exception as e:
        logger.error("Failed to parse Gemini JSON output. Using fallback.")
        subtasks_data = [
            {"subtask_id": "sub-fallback", "description": "Process task", "required_specialty": "Writing", "estimated_complexity": "low", "suggested_price_usd": 0.1}
        ]

    emit("SUBTASK_CREATED", f"Decomposed into {len(subtasks_data)} subtasks.", step=1)
    task_state["subtasks"] = []
    
    results_collected = []

    # Step 2 & 3: Agent Discovery and Execution
    for idx, st in enumerate(subtasks_data):
        step_num = 2 + idx
        subtask_desc = st.get("description", "Unknown subtask")
        req_specialty = st.get("required_specialty", "Writing")
        price = st.get("suggested_price_usd", 0.05)
        
        emit("AGENT_SELECTED", f"Discovering agent for specialty: {req_specialty}", step=step_num)
        
        candidates = discover_agents_by_specialty(req_specialty)
        # Filter reputation > 60 and sort descending
        valid_candidates = sorted([c for c in candidates if c.reputation_score > 60], key=lambda x: x.reputation_score, reverse=True)
        
        if not valid_candidates:
            emit("ERROR", f"No agent found for {req_specialty}. Task aborted.", step=step_num)
            task_state["status"] = "FAILED"
            return
            
        chosen_agent = valid_candidates[0]
        emit("AGENT_SELECTED", f"Selected {chosen_agent.name} (Reputation: {chosen_agent.reputation_score})", agent_name=chosen_agent.name, step=step_num)
        
        # Payment
        emit("PAYMENT_INITIATED", f"Initiating payment of ${price} to {chosen_agent.name}", agent_name=chosen_agent.name, amount=price, step=step_num)
        tx_hash = payment_processor.initiate_payment(LEAD_AGENT_WALLET, chosen_agent.wallet_address, price, task_id)
        
        await asyncio.sleep(1) # Simulate network tx time
        
        if payment_processor.verify_payment(tx_hash):
            emit("PAYMENT_CONFIRMED", f"Payment confirmed.", agent_name=chosen_agent.name, amount=price, tx_hash=tx_hash, step=step_num)
        else:
            emit("ERROR", f"Payment verification failed for {chosen_agent.name}.", step=step_num)
            continue
            
        # Execute Subtask
        emit("TASK_STARTED", f"Agent working on: {subtask_desc}", agent_name=chosen_agent.name, step=step_num)
        
        agent_prompt = f"You are {chosen_agent.name}, an expert in {chosen_agent.specialty}. Complete this subtask: {subtask_desc}. Context: {task_description}"
        agent_output = await generate_gemini_content(agent_prompt, is_json=False)
        
        results_collected.append({"agent": chosen_agent.name, "task": subtask_desc, "output": agent_output})
        
        emit("SUBTASK_COMPLETED", f"Subtask completed successfully.", agent_name=chosen_agent.name, step=step_num)
        
        # Update Reputation
        update_reputation(chosen_agent.agent_id, job_success=True, feedback="Excellent work")
        emit("REPUTATION_UPDATED", f"{chosen_agent.name} reputation increased.", agent_name=chosen_agent.name, step=step_num)
        
        task_state["subtasks"].append({
            "agent": chosen_agent.name,
            "description": subtask_desc,
            "output": agent_output,
            "cost": price,
            "reputation_change": "+1.0"
        })

    # Step 4: Final Synthesis
    emit("TASK_SYNTHESIZING", "All subtasks completed. Synthesizing final output...", step=99)
    synthesis_prompt = f"Synthesize these subtask outputs into a cohesive final result for the original task: '{task_description}'.\nOutputs: {json.dumps(results_collected)}"
    
    final_result = await generate_gemini_content(synthesis_prompt, is_json=False)
    task_state["final_result"] = final_result
    task_state["status"] = "COMPLETED"
    
    emit("TASK_COMPLETED", "Orchestration complete.", step=100)
    # Put a sentinel to stop the stream
    event_queue.put_nowait(None)
