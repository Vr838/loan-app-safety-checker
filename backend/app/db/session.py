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
import urllib.parse
import logging

logger = logging.getLogger("loan_safety_checker")

import re

raw_db_url = settings.DATABASE_URL
db_url = raw_db_url
connect_args = {}

if "sqlite" in db_url:
    connect_args["check_same_thread"] = False
else:
    # Convert ANY postgresql variant to postgresql+asyncpg://
    db_url = re.sub(r"^postgres(ql)?(\+[a-zA-Z0-9_]+)?://", "postgresql+asyncpg://", db_url)
    connect_args["statement_cache_size"] = 0
    try:
        parsed = urllib.parse.urlsplit(db_url)
        query_params = urllib.parse.parse_qs(parsed.query)
        # asyncpg throws TypeError if sslmode is passed directly in query string
        sslmode = query_params.pop("sslmode", None)
        if sslmode and sslmode[0] in ("require", "prefer", "verify-ca", "verify-full"):
            connect_args["ssl"] = True
        
        # Reconstruct URL without sslmode query parameter
        new_query = urllib.parse.urlencode([(k, v[0]) for k, v in query_params.items()])
        db_url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment))
    except Exception as parse_err:
        logger.warning(f"Failed to parse database URL query params: {parse_err}")

try:
    async_engine = create_async_engine(
        db_url,
        echo=settings.DEBUG,
        connect_args=connect_args,
        future=True,
    )
except Exception as exc:
    logger.error(
        f"Database engine init failed for {raw_db_url}: {exc}. Falling back to SQLite."
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
