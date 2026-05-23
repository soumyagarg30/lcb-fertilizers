from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..models import Product

router = APIRouter(prefix="/products", tags=["products"])

@router.get("/")
async def list_products(q: str = None, page: int = 1, limit: int = 50, session: AsyncSession = Depends(get_session)):
    offset = (page - 1) * limit
    stmt = select(Product).offset(offset).limit(limit)
    if q:
        stmt = stmt.where(Product.name.ilike(f"%{q}%"))
    res = await session.exec(stmt)
    return res.all()

@router.get("/{id}")
async def get_product(id: str, session: AsyncSession = Depends(get_session)):
    p = await session.get(Product, id)
    if not p: raise HTTPException(status_code=404, detail="Not found")
    return p

@router.post("/", dependencies=[Depends(lambda: True)])
async def create_product(payload: dict = Body(...), session: AsyncSession = Depends(get_session)):
    p = Product(name=payload.get("name"), sku=payload.get("sku"), uom=payload.get("uom"), base_price=payload.get("basePrice", 0))
    session.add(p)
    await session.commit()
    await session.refresh(p)
    return p
