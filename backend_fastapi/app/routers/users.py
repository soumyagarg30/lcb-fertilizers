from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..models import User
from ..auth import get_password_hash, require_roles, get_current_user

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", dependencies=[Depends(require_roles("superadmin"))])
async def create_user(payload: dict = Body(...), session: AsyncSession = Depends(get_session)):
    u = User(name=payload.get("name"), email=payload.get("email"), password_hash=get_password_hash(payload.get("password","")), role=payload.get("role","viewer"), active=payload.get("active", True))
    session.add(u)
    await session.commit()
    await session.refresh(u)
    return u

@router.get("/")
async def list_users(session: AsyncSession = Depends(get_session)):
    q = await session.exec(select(User))
    return q.all()

@router.get("/me")
async def me(user=Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    uid = user.get("user_id")
    u = await session.get(User, uid)
    if not u: raise HTTPException(status_code=404, detail="Not found")
    return u
