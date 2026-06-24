import os
import uuid
import json
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict
from fastapi import FastAPI, BackgroundTasks, Request, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel, field_validator
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import select
from database import init_db, AsyncSessionLocal, engine
from models import Task as TaskModel, Subtask as SubtaskModel, Agent as AgentModel, User as UserModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from agents.registry import registry_instance, CreateAgentRequest, UpdateAgentRequest
from agents.orchestrator import orchestrate_task
from x402.payment import payment_processor
from auth import router as auth_router, get_current_user


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database...")
    await init_db()
    logger.info("Seeding default agents if empty...")
    await registry_instance.seed_if_empty()
    yield
    await engine.dispose()


app = FastAPI(title="TaskForce Autonomous Agent Network", version="1.0.0", lifespan=lifespan)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": str(exc)})


CORS_ORIGINS = (os.getenv("CORS_ORIGINS") or "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

# In-memory SSE queues only — task state lives in DB
task_queues: Dict[str, asyncio.Queue] = {}


class TaskRequest(BaseModel):
    task: str

    @field_validator("task")
    @classmethod
    def task_length(cls, v):
        if len(v) > 10000:
            raise ValueError("Task description must be under 10,000 characters")
        return v


@app.post("/api/task")
async def create_task(
    request: TaskRequest,
    background_tasks: BackgroundTasks,
    current_user: UserModel = Depends(get_current_user),
):
    task_id = str(uuid.uuid4())

    async with AsyncSessionLocal() as session:
        task_row = TaskModel(
            task_id=task_id,
            user_id=current_user.user_id,
            description=request.task,
            status="RUNNING",
        )
        session.add(task_row)
        await session.commit()

    task_queues[task_id] = asyncio.Queue()

    background_tasks.add_task(orchestrate_task, task_id, request.task, task_queues[task_id], current_user.user_id)

    return {"task_id": task_id, "status": "RUNNING"}


@app.get("/api/task/{task_id}/stream")
async def stream_task(task_id: str, request: Request):
    if task_id not in task_queues:
        return {"error": "Task not found"}

    queue = task_queues[task_id]

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                event_data = await queue.get()
                if event_data is None:
                    break
                yield {"data": json.dumps(event_data)}
        except asyncio.CancelledError:
            pass

    return EventSourceResponse(event_generator())


@app.get("/api/task/{task_id}/result")
async def get_task_result(
    task_id: str,
    current_user: UserModel = Depends(get_current_user),
):
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(TaskModel).where(
                TaskModel.task_id == task_id,
                TaskModel.user_id == current_user.user_id,
            )
        )
        task_row = result.scalar_one_or_none()
        if not task_row:
            return {"error": "Task not found"}

        subtasks_result = await session.execute(
            select(SubtaskModel, AgentModel.name).join(
                AgentModel, SubtaskModel.agent_id == AgentModel.agent_id
            ).where(SubtaskModel.task_id == task_id)
        )
        subtask_rows = subtasks_result.all()

    return {
        "status": task_row.status,
        "description": task_row.description,
        "final_result": task_row.final_result,
        "subtasks": [
            {
                "agent": agent_name,
                "description": s.description,
                "output": s.output,
                "cost": s.cost,
                "reputation_change": s.reputation_change,
            }
            for s, agent_name in subtask_rows
        ],
    }


@app.get("/api/agents")
async def get_agents():
    return [a.model_dump() for a in await registry_instance.get_all_agents()]


@app.get("/api/agents/mine")
async def get_my_agents(current_user: UserModel = Depends(get_current_user)):
    agents = await registry_instance.get_agents_by_creator(current_user.user_id)
    return [a.model_dump() for a in agents]


@app.get("/api/agents/{agent_id}")
async def get_agent(agent_id: str):
    agent = await registry_instance.get_agent(agent_id)
    if not agent:
        return {"error": "Agent not found"}
    return agent.model_dump()


@app.post("/api/agents")
async def create_agent(
    req: CreateAgentRequest,
    current_user: UserModel = Depends(get_current_user),
):
    if not current_user.wallet_address:
        raise HTTPException(status_code=400, detail="You must connect a wallet before deploying an agent")
    agent = await registry_instance.create_agent(req, current_user.user_id, current_user.wallet_address)
    return agent.model_dump()


@app.put("/api/agents/{agent_id}")
async def update_agent(
    agent_id: str,
    req: UpdateAgentRequest,
    current_user: UserModel = Depends(get_current_user),
):
    agent = await registry_instance.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.creator_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the agent creator can update this agent")
    updated = await registry_instance.update_agent(agent_id, req)
    return updated.model_dump()


@app.delete("/api/agents/{agent_id}")
async def delete_agent(
    agent_id: str,
    current_user: UserModel = Depends(get_current_user),
):
    agent = await registry_instance.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if agent.creator_user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Only the agent creator can delete this agent")
    success = await registry_instance.delete_agent(agent_id)
    return {"deleted": success}


@app.get("/api/earnings")
async def get_earnings(current_user: UserModel = Depends(get_current_user)):
    try:
        earnings = await payment_processor.get_earnings_by_creator(current_user.user_id)
        return earnings
    except Exception as e:
        logger.error(f"get_earnings error for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/payments")
async def get_payments(current_user: UserModel = Depends(get_current_user)):
    try:
        history = await payment_processor.get_payment_history(current_user.user_id)
        return [
            {
                "job_id": p.job_id,
                "from_wallet": p.from_wallet,
                "to_wallet": p.to_wallet,
                "amount": p.amount,
                "tx_hash": p.tx_hash,
                "timestamp": p.timestamp,
                "status": p.status,
            }
            for p in history
        ]
    except Exception as e:
        logger.error(f"get_payments error for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats")
async def get_stats(current_user: UserModel = Depends(get_current_user)):
    try:
        agents = await registry_instance.get_all_agents()
        payments = await payment_processor.get_payment_history(current_user.user_id)

        total_tasks = sum(a.completed_jobs for a in agents)
        avg_rep = sum(a.reputation_score for a in agents) / len(agents) if agents else 0.0
        total_value = sum(p.amount for p in payments)

        return {
            "total_tasks": total_tasks,
            "total_payments": len(payments),
            "average_reputation": round(avg_rep, 1),
            "total_value_settled_usd": round(total_value, 2),
        }
    except Exception as e:
        logger.error(f"get_stats error for user {current_user.user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("ENV", "production") == "development",
    )
