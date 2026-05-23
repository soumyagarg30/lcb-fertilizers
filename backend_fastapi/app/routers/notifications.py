from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from ..db import get_session
from ..models import Notification

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.post("/")
async def create_notification(payload: dict = Body(...), session: AsyncSession = Depends(get_session)):
    n = Notification(user_id=payload.get("userId"), type=payload.get("type", "info"), title=payload.get("title"), message=payload.get("message"), entity_type=payload.get("entityType"), entity_id=payload.get("entityId"))
    session.add(n)
    await session.commit()
    await session.refresh(n)
    return n

@router.get("/user/{user_id}")
async def for_user(user_id: str, session: AsyncSession = Depends(get_session)):
    res = await session.exec(select(Notification).where(Notification.user_id == user_id))
    return res.all()
