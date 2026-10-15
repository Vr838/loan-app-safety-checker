#!/usr/bin/env python3
"""CLI utility to manually seed or reset the database with the labeled demo dataset."""

import asyncio
import os
import sys

# Ensure backend is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.db.session import AsyncSessionLocal, async_engine, Base
from app.services.seed import seed_database


async def main():
    print("Connecting to database...")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("Seeding demo applications, reviews, evidence, and risk assessments...")
    async with AsyncSessionLocal() as session:
        await seed_database(session)

    print("Seeding completed successfully!")
    await async_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
