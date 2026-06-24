import os
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{os.path.join(os.path.dirname(__file__), 'taskforce.db')}"
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_session():
    async with AsyncSessionLocal() as session:
        yield session


async def _migrate_add_columns():
    """Add new columns to existing tables if they don't exist. Each migration in its own connection to avoid transaction issues with DDL."""
    async with engine.connect() as conn:
        dialect = conn.dialect.name
        await conn.close()

    migrations = [
        ("agents", "creator_user_id", "VARCHAR(64)"),
        ("agents", "system_prompt", "TEXT"),
        ("agents", "is_active", "BOOLEAN DEFAULT false"),
        ("payments", "agent_id", "VARCHAR(64)"),
        ("payments", "platform_fee", "FLOAT DEFAULT 0.0"),
    ]
    for table, col, col_type in migrations:
        try:
            async with engine.connect() as conn:
                if dialect == "postgresql":
                    await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_type}"))
                else:
                    await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}"))
                await conn.commit()
            logger.info(f"Added column {table}.{col}")
        except Exception as e:
            err = str(e).lower()
            if "already exists" in err or "duplicate column" in err or "near \"exists\"" in err:
                logger.debug(f"Column {table}.{col} already exists")
            else:
                logger.warning(f"Could not add column {table}.{col}: {e}")


async def init_db():
    from models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _migrate_add_columns()
    # Force schema cache refresh: dispose pool so new connections pick up new columns
    await engine.dispose()
