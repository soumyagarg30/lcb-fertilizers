from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from ..db import get_session
from ..models import User
from ..schemas import Token, UserOut
from ..auth import create_access_token, verify_password, get_password_hash

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/token", response_model=Token)
async def token(form: dict = Body(...), session: AsyncSession = Depends(get_session)):
    # Minimal compat: accept json {username, password}
    username = form.get("username") or form.get("email")
    password = form.get("password")
    if not username or not password:
        raise HTTPException(status_code=400, detail="username and password required")
    q = await session.exec(select(User).where(User.email == username))
    user = q.one_or_none()
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"user_id": user.id, "role": user.role})
    return {"access_token": token, "token_type": "bearer"}
