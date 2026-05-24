from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..models import Customer

router = APIRouter(prefix="/customers", tags=["customers"])

@router.get("/")
async def list_customers(session: AsyncSession = Depends(get_session)):
    res = await session.exec(select(Customer))
    return res.all()

@router.post("/")
async def create_customer(payload: dict = Body(...), session: AsyncSession = Depends(get_session)):
    customer = Customer(
        name=payload.get("name"),
        email=payload.get("email"),
        phone=payload.get("phone"),
        city=payload.get("city"),
        state=payload.get("state"),
        tier=payload.get("tier")
    )
    session.add(customer)
    await session.commit()
    await session.refresh(customer)
    return customer
