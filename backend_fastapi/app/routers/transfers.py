from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from ..db import get_session
from ..models import Transfer, Inventory
from datetime import datetime

router = APIRouter(prefix="/transfers", tags=["transfers"])

@router.post("/")
async def create_transfer(payload: dict = Body(...), session: AsyncSession = Depends(get_session)):
    t = Transfer(transfer_number=payload.get("transferNumber"), source_warehouse_id=payload.get("sourceWarehouseId"), dest_warehouse_id=payload.get("destWarehouseId"), items=payload.get("items", []), created_by=payload.get("createdBy"), status="pending")
    session.add(t)
    await session.commit()
    await session.refresh(t)
    return t

@router.get("/")
async def list_transfers(session: AsyncSession = Depends(get_session)):
    res = await session.exec(select(Transfer))
    return res.all()
