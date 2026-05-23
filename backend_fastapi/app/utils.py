from .models import AuditLog
from .db import AsyncSessionLocal
import asyncio

async def log_async(entry: dict):
    async with AsyncSessionLocal() as session:
        al = AuditLog(**entry)
        session.add(al)
        await session.commit()

def log(entry: dict):
    # fire-and-forget
    try:
        asyncio.create_task(log_async(entry))
    except RuntimeError:
        # if event loop not running, ignore
        pass
