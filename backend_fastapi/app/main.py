from fastapi import FastAPI
from .routers import auth as auth_router, inventory as inventory_router
from .db import init_db, AsyncSessionLocal
from .config import settings
from .models import User, Warehouse, Product
from .auth import get_password_hash
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI(title="Agriflow FastAPI")

app.include_router(auth_router.router, prefix="/api")
app.include_router(inventory_router.router, prefix="/api")
from .routers import users as users_router, products as products_router, orders as orders_router, transfers as transfers_router, notifications as notifications_router
app.include_router(users_router.router, prefix="/api")
app.include_router(products_router.router, prefix="/api")
app.include_router(orders_router.router, prefix="/api")
app.include_router(transfers_router.router, prefix="/api")
app.include_router(notifications_router.router, prefix="/api")


@app.on_event("startup")
async def on_startup():
    await init_db()
    # seed minimal data if empty
    async with AsyncSessionLocal() as session:
        q = await session.execute(select(func.count()).select_from(User))
        count = q.scalar_one()
        if count == 0:
            u = User(name="Admin User", email="admin@agriflow.in", password_hash=get_password_hash("admin123"), role="superadmin", active=True)
            session.add(u)
        q2 = await session.execute(select(func.count()).select_from(Warehouse))
        wcount = q2.scalar_one()
        if wcount == 0:
            session.add(Warehouse(name="Default Warehouse", code="WH-001"))
        q3 = await session.execute(select(func.count()).select_from(Product))
        pcount = q3.scalar_one()
        if pcount == 0:
            session.add(Product(name="Urea 46%", sku="CH-001", uom="bags", base_price=320))
        await session.commit()


@app.get("/")
async def root():
    return {"message": "Agriflow FastAPI running"}
