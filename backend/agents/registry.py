import uuid
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from sqlalchemy import select, update, delete as sa_delete
from database import AsyncSessionLocal
from models import Agent as AgentModel


class AgentProfile(BaseModel):
    agent_id: str
    name: str
    specialty: str
    wallet_address: str
    reputation_score: float = Field(..., ge=0, le=100)
    completed_jobs: int
    price_per_task_usd: float
    erc8004_identity_hash: str
    avatar_seed: str
    creator_user_id: Optional[str] = None
    system_prompt: Optional[str] = None
    is_active: bool = True


class CreateAgentRequest(BaseModel):
    name: str
    specialty: str
    price_per_task_usd: float = 0.10
    system_prompt: Optional[str] = None


class UpdateAgentRequest(BaseModel):
    name: Optional[str] = None
    specialty: Optional[str] = None
    price_per_task_usd: Optional[float] = None
    system_prompt: Optional[str] = None
    is_active: Optional[bool] = None


DEFAULT_AGENTS = [
    AgentProfile(
        agent_id="a3b2c1d0-1234-5678-90ab-cdef01234567",
        name="ResearchBot",
        specialty="Research",
        wallet_address="0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        reputation_score=95.5,
        completed_jobs=0,
        price_per_task_usd=0.08,
        erc8004_identity_hash="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        avatar_seed="ResearchBot"
    ),
    AgentProfile(
        agent_id="b4c3d2e1-5678-90ab-cdef-0123456789ab",
        name="WriterAgent",
        specialty="Writing",
        wallet_address="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        reputation_score=92.0,
        completed_jobs=0,
        price_per_task_usd=0.10,
        erc8004_identity_hash="0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        avatar_seed="WriterAgent"
    ),
    AgentProfile(
        agent_id="c5d4e3f2-90ab-cdef-0123-456789abcdef",
        name="DataAnalystBot",
        specialty="Data Analysis",
        wallet_address="0x90F79bf6EB2c4f870365E785982E1f101E93b906",
        reputation_score=89.2,
        completed_jobs=0,
        price_per_task_usd=0.12,
        erc8004_identity_hash="0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234",
        avatar_seed="DataAnalystBot"
    ),
    AgentProfile(
        agent_id="d6e5f4a3-cdef-0123-4567-89abcdef0123",
        name="SummaryAgent",
        specialty="Summarization",
        wallet_address="0x15d34AAf54a67C681F28cd307200b3B814DE52d2",
        reputation_score=94.1,
        completed_jobs=0,
        price_per_task_usd=0.05,
        erc8004_identity_hash="0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
        avatar_seed="SummaryAgent"
    ),
    AgentProfile(
        agent_id="e7f6a5b4-0123-4567-89ab-cdef01234567",
        name="FactCheckerBot",
        specialty="Fact Checking",
        wallet_address="0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
        reputation_score=97.8,
        completed_jobs=0,
        price_per_task_usd=0.15,
        erc8004_identity_hash="0x90abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
        avatar_seed="FactCheckerBot"
    ),
]


PLATFORM_FEE_PERCENTAGE = 0.10  # 10% platform fee on user-deployed agents


class MockAgentRegistry:
    async def seed_if_empty(self):
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(AgentModel).limit(1))
            if result.scalar_one_or_none() is None:
                for a in DEFAULT_AGENTS:
                    session.add(AgentModel(**a.model_dump()))
                await session.commit()

    async def get_all_agents(self) -> List[AgentProfile]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(AgentModel).order_by(AgentModel.reputation_score.desc())
            )
            rows = result.scalars().all()
            return [_row_to_profile(r) for r in rows if r.is_active]

    async def get_agent(self, agent_id: str) -> Optional[AgentProfile]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(AgentModel).where(AgentModel.agent_id == agent_id))
            row = result.scalar_one_or_none()
            return _row_to_profile(row) if row else None

    async def find_by_specialty(self, specialty: str) -> List[AgentProfile]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(AgentModel).where(
                    AgentModel.specialty.ilike(f"%{specialty}%")
                )
            )
            rows = result.scalars().all()
            return [_row_to_profile(r) for r in rows if r.is_active]

    async def update_agent_reputation(self, agent_id: str, delta: float, success: bool) -> Optional[AgentProfile]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(AgentModel).where(AgentModel.agent_id == agent_id))
            row = result.scalar_one_or_none()
            if not row:
                return None
            new_score = max(0.0, min(100.0, row.reputation_score + delta))
            row.reputation_score = round(new_score, 1)
            row.completed_jobs += 1
            await session.commit()
            await session.refresh(row)
            return _row_to_profile(row)

    async def create_agent(self, req: CreateAgentRequest, creator_user_id: str, wallet_address: str) -> AgentProfile:
        agent_id = str(uuid.uuid4())
        avatar_seed = req.name.replace(" ", "")
        async with AsyncSessionLocal() as session:
            erc8004_hash = f"0x{uuid.uuid4().hex}"
            row = AgentModel(
                agent_id=agent_id,
                name=req.name,
                specialty=req.specialty,
                wallet_address=wallet_address,
                reputation_score=50.0,
                completed_jobs=0,
                price_per_task_usd=req.price_per_task_usd,
                erc8004_identity_hash=erc8004_hash,
                avatar_seed=avatar_seed,
                creator_user_id=creator_user_id,
                system_prompt=req.system_prompt,
                is_active=True,
            )
            session.add(row)
            await session.commit()
            await session.refresh(row)
            return _row_to_profile(row)

    async def update_agent(self, agent_id: str, req: UpdateAgentRequest) -> Optional[AgentProfile]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(AgentModel).where(AgentModel.agent_id == agent_id))
            row = result.scalar_one_or_none()
            if not row:
                return None
            if req.name is not None:
                row.name = req.name
            if req.specialty is not None:
                row.specialty = req.specialty
            if req.price_per_task_usd is not None:
                row.price_per_task_usd = req.price_per_task_usd
            if req.system_prompt is not None:
                row.system_prompt = req.system_prompt
            if req.is_active is not None:
                row.is_active = req.is_active
            await session.commit()
            await session.refresh(row)
            return _row_to_profile(row)

    async def delete_agent(self, agent_id: str) -> bool:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(AgentModel).where(AgentModel.agent_id == agent_id))
            row = result.scalar_one_or_none()
            if not row:
                return False
            row.is_active = False
            await session.commit()
            return True

    async def get_agents_by_creator(self, creator_user_id: str) -> List[AgentProfile]:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(AgentModel).where(
                    AgentModel.creator_user_id == creator_user_id,
                    AgentModel.is_active == True
                ).order_by(AgentModel.created_at.desc())
            )
            rows = result.scalars().all()
            return [_row_to_profile(r) for r in rows]


def _row_to_profile(row: AgentModel) -> AgentProfile:
    return AgentProfile(
        agent_id=row.agent_id,
        name=row.name,
        specialty=row.specialty,
        wallet_address=row.wallet_address,
        reputation_score=row.reputation_score,
        completed_jobs=row.completed_jobs,
        price_per_task_usd=row.price_per_task_usd,
        erc8004_identity_hash=row.erc8004_identity_hash,
        avatar_seed=row.avatar_seed,
        creator_user_id=row.creator_user_id,
        system_prompt=row.system_prompt,
        is_active=row.is_active,
    )


# Global Registry Instance
registry_instance = MockAgentRegistry()
