import os
import uuid
import json
import asyncio
from typing import Dict, Any
from fastapi import FastAPI, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Load env variables if .env exists
load_dotenv()

from agents.registry import registry_instance
from agents.orchestrator import orchestrate_task
from x402.payment import payment_processor

app = FastAPI(title="TaskForce Autonomous Agent Network", version="1.0.0")

# Enable CORS for localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory state
tasks_state: Dict[str, Dict[str, Any]] = {}
task_queues: Dict[str, asyncio.Queue] = {}

class TaskRequest(BaseModel):
    task: str

@app.post("/api/task")
async def create_task(request: TaskRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    tasks_state[task_id] = {
        "status": "RUNNING",
        "description": request.task,
        "subtasks": [],
        "final_result": None
    }
    task_queues[task_id] = asyncio.Queue()
    
    # Start orchestration in the background
    background_tasks.add_task(orchestrate_task, task_id, request.task, task_queues[task_id], tasks_state[task_id])
    
    return {"task_id": task_id, "status": "RUNNING"}

@app.get("/api/task/{task_id}/stream")
async def stream_task(task_id: str, request: Request):
    """Server-Sent Events endpoint to stream live orchestration events."""
    if task_id not in task_queues:
        return {"error": "Task not found"}
        
    queue = task_queues[task_id]
    
    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                event_data = await queue.get()
                
                if event_data is None: # Sentinel for completion
                    break
                    
                yield {
                    "data": json.dumps(event_data)
                }
        except asyncio.CancelledError:
            pass

    return EventSourceResponse(event_generator())

@app.get("/api/task/{task_id}/result")
def get_task_result(task_id: str):
    if task_id not in tasks_state:
        return {"error": "Task not found"}
    return tasks_state[task_id]

@app.get("/api/agents")
def get_agents():
    return [agent.model_dump() for agent in registry_instance.get_all_agents()]

@app.get("/api/agents/{agent_id}")
def get_agent_profile(agent_id: str):
    agent = registry_instance.get_agent(agent_id)
    if not agent:
        return {"error": "Agent not found"}
    return agent.model_dump()

@app.get("/api/payments")
def get_payments():
    # Return latest payments first
    history = payment_processor.get_payment_history()
    return sorted([vars(p) for p in history], key=lambda x: x["timestamp"], reverse=True)

@app.get("/api/stats")
def get_stats():
    agents = registry_instance.get_all_agents()
    payments = payment_processor.get_payment_history()
    
    total_tasks = sum(a.completed_jobs for a in agents)
    avg_rep = sum(a.reputation_score for a in agents) / len(agents) if agents else 0.0
    total_value = sum(p.amount for p in payments)
    
    return {
        "total_tasks": total_tasks,
        "total_payments": len(payments),
        "average_reputation": round(avg_rep, 1),
        "total_value_settled_usd": round(total_value, 2)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
