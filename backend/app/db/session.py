"""Database session and connection engine setup."""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base
from app.core.config import settings

# Engine setup
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

connect_args = {}
if "sqlite" in db_url:
    connect_args["check_same_thread"] = False
elif "asyncpg" in db_url:
    connect_args["statement_cache_size"] = 0

try:
    async_engine = create_async_engine(
        db_url,
        echo=settings.DEBUG,
        connect_args=connect_args,
        future=True,
    )
except Exception as exc:
    import logging
    logging.getLogger("loan_safety_checker").error(
        f"Database engine init failed for {db_url}: {exc}. Falling back to SQLite."
    )
    async_engine = create_async_engine(
        "sqlite+aiosqlite:///./loan_safety.db",
        echo=settings.DEBUG,
        connect_args={"check_same_thread": False},
        future=True,
    )

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
