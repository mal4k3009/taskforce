import uuid
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

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

class MockAgentRegistry:
    def __init__(self):
        # 5 hardcoded specialist agents with realistic UUIDs, wallets, and details
        self.agents: Dict[str, AgentProfile] = {
            "a3b2c1d0-1234-5678-90ab-cdef01234567": AgentProfile(
                agent_id="a3b2c1d0-1234-5678-90ab-cdef01234567",
                name="ResearchBot",
                specialty="Research",
                wallet_address="0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                reputation_score=95.5,
                completed_jobs=142,
                price_per_task_usd=0.08,
                erc8004_identity_hash="0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
                avatar_seed="ResearchBot"
            ),
            "b4c3d2e1-5678-90ab-cdef-0123456789ab": AgentProfile(
                agent_id="b4c3d2e1-5678-90ab-cdef-0123456789ab",
                name="WriterAgent",
                specialty="Writing",
                wallet_address="0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                reputation_score=92.0,
                completed_jobs=88,
                price_per_task_usd=0.10,
                erc8004_identity_hash="0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
                avatar_seed="WriterAgent"
            ),
            "c5d4e3f2-90ab-cdef-0123-456789abcdef": AgentProfile(
                agent_id="c5d4e3f2-90ab-cdef-0123-456789abcdef",
                name="DataAnalystBot",
                specialty="Data Analysis",
                wallet_address="0x90F79bf6EB2c4f870365E785982E1f101E93b906",
                reputation_score=89.2,
                completed_jobs=115,
                price_per_task_usd=0.12,
                erc8004_identity_hash="0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234",
                avatar_seed="DataAnalystBot"
            ),
            "d6e5f4a3-cdef-0123-4567-89abcdef0123": AgentProfile(
                agent_id="d6e5f4a3-cdef-0123-4567-89abcdef0123",
                name="SummaryAgent",
                specialty="Summarization",
                wallet_address="0x15d34AAf54a67C681F28cd307200b3B814DE52d2",
                reputation_score=94.1,
                completed_jobs=210,
                price_per_task_usd=0.05,
                erc8004_identity_hash="0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
                avatar_seed="SummaryAgent"
            ),
            "e7f6a5b4-0123-4567-89ab-cdef01234567": AgentProfile(
                agent_id="e7f6a5b4-0123-4567-89ab-cdef01234567",
                name="FactCheckerBot",
                specialty="Fact Checking",
                wallet_address="0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
                reputation_score=97.8,
                completed_jobs=76,
                price_per_task_usd=0.15,
                erc8004_identity_hash="0x90abcdef1234567890abcdef1234567890abcdef1234567890abcdef12345678",
                avatar_seed="FactCheckerBot"
            )
        }

    def get_all_agents(self) -> List[AgentProfile]:
        return list(self.agents.values())

    def get_agent(self, agent_id: str) -> Optional[AgentProfile]:
        return self.agents.get(agent_id)

    def find_by_specialty(self, specialty: str) -> List[AgentProfile]:
        # Perform normalized substring match or exact match on specialty
        return [
            agent for agent in self.agents.values()
            if specialty.lower() in agent.specialty.lower() or agent.specialty.lower() in specialty.lower()
        ]

    def update_agent_reputation(self, agent_id: str, delta: float, success: bool) -> Optional[AgentProfile]:
        agent = self.get_agent(agent_id)
        if agent:
            # Shift reputation score by delta, clamped between 0 and 100
            new_score = max(0.0, min(100.0, agent.reputation_score + delta))
            agent.reputation_score = round(new_score, 1)
            agent.completed_jobs += 1
            return agent
        return None

# Global Registry Instance
registry_instance = MockAgentRegistry()
