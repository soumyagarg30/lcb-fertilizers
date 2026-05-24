from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..models import Product

router = APIRouter(prefix="/products", tags=["products"])

@router.get("/")
async def list_products(q: str = None, category: str = None, page: int = 1, limit: int = 50, session: AsyncSession = Depends(get_session)):
    offset = (page - 1) * limit
    stmt = select(Product).offset(offset).limit(limit)
    if q:
        stmt = stmt.where((Product.name.ilike(f"%{q}%")) | (Product.sku.ilike(f"%{q}%")))
    if category:
        stmt = stmt.where(Product.category == category)
    res = await session.exec(stmt)
    return res.all()

@router.get("/{id}")
async def get_product(id: str, session: AsyncSession = Depends(get_session)):
    p = await session.get(Product, id)
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    return p

@router.post("/", dependencies=[Depends(lambda: True)])
async def create_product(payload: dict = Body(...), session: AsyncSession = Depends(get_session)):
    p = Product(
        name=payload.get("name"),
        sku=payload.get("sku"),
        category=payload.get("category"),
        subcategory=payload.get("subcategory"),
        description=payload.get("description"),
        uom=payload.get("uom"),
        base_price=payload.get("basePrice", 0),
        supplier=payload.get("supplier"),
        shelf_life_days=payload.get("shelfLifeDays"),
        tags=payload.get("tags"),
        image_urls=payload.get("imageUrls"),
        document_urls=payload.get("documentUrls"),
    )
    session.add(p)
    await session.commit()
    await session.refresh(p)
    return p
