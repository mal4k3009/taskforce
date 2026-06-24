import uuid
import time
from sqlalchemy import Column, String, Float, Integer, Text, ForeignKey, DateTime, func, Index, Boolean
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    wallet_address: Mapped[str] = mapped_column(String(128), nullable=True, default=None)
    full_name: Mapped[str] = mapped_column(String(128), nullable=True, default=None)
    bio: Mapped[str] = mapped_column(Text, nullable=True, default=None)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index("ix_users_email", "email"),
        Index("ix_users_wallet", "wallet_address"),
    )


class Agent(Base):
    __tablename__ = "agents"

    agent_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    specialty: Mapped[str] = mapped_column(String(64), nullable=False)
    wallet_address: Mapped[str] = mapped_column(String(128), nullable=False)
    reputation_score: Mapped[float] = mapped_column(Float, default=80.0)
    completed_jobs: Mapped[int] = mapped_column(Integer, default=0)
    price_per_task_usd: Mapped[float] = mapped_column(Float, default=0.10)
    erc8004_identity_hash: Mapped[str] = mapped_column(String(128), default="")
    avatar_seed: Mapped[str] = mapped_column(String(64), default="")
    creator_user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.user_id"), nullable=True, default=None)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=True, default=None)
    api_endpoint: Mapped[str] = mapped_column(String(255), nullable=True, default=None)
    api_key: Mapped[str] = mapped_column(String(255), nullable=True, default=None)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    subtasks = relationship("Subtask", back_populates="agent")
    creator = relationship("User", foreign_keys=[creator_user_id])


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.user_id"), nullable=True)
    agent_id: Mapped[str] = mapped_column(String(64), nullable=True, default=None)
    job_id: Mapped[str] = mapped_column(String(128), nullable=False)
    from_wallet: Mapped[str] = mapped_column(String(128), nullable=False)
    to_wallet: Mapped[str] = mapped_column(String(128), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    platform_fee: Mapped[float] = mapped_column(Float, default=0.0)
    tx_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    timestamp: Mapped[float] = mapped_column(Float, default=time.time)
    status: Mapped[str] = mapped_column(String(32), default="CONFIRMED")

    __table_args__ = (
        Index("ix_payments_user_id", "user_id"),
        Index("ix_payments_agent_id", "agent_id"),
    )


class Task(Base):
    __tablename__ = "tasks"

    task_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), ForeignKey("users.user_id"), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="RUNNING")
    final_result: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[DateTime] = mapped_column(DateTime, nullable=True)

    subtasks = relationship("Subtask", back_populates="task", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_tasks_user_id", "user_id"),
    )


class Subtask(Base):
    __tablename__ = "subtasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id: Mapped[str] = mapped_column(String(64), ForeignKey("tasks.task_id"), nullable=False)
    agent_id: Mapped[str] = mapped_column(String(64), ForeignKey("agents.agent_id"), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    output: Mapped[str] = mapped_column(Text, nullable=True)
    cost: Mapped[float] = mapped_column(Float, default=0.0)
    reputation_change: Mapped[str] = mapped_column(String(16), default="+1.0")

    task = relationship("Task", back_populates="subtasks")
    agent = relationship("Agent", back_populates="subtasks")
