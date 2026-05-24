from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..models import Order, OrderItem, Inventory, StockMovement, Customer, Product
from datetime import datetime

router = APIRouter(prefix="/orders", tags=["orders"])

@router.get("/customers")
async def order_customers(session: AsyncSession = Depends(get_session)):
    res = await session.exec(select(Customer))
    return res.all()


@router.get("/")
async def list_orders(page: int = 1, limit: int = 50, session: AsyncSession = Depends(get_session)):
    stmt = select(Order).offset((page - 1) * limit).limit(limit).order_by(Order.order_date.desc())
    results = await session.exec(stmt)
    orders = results.all()
    return {"data": orders}

@router.get("/search")
async def search_orders(
    status: str | None = None,
    customer: str | None = None,
    product: str | None = None,
    warehouse_id: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    page: int = 1,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
):
    stmt = select(Order)
    if status:
        stmt = stmt.where(Order.status == status)
    if warehouse_id:
        stmt = stmt.where(Order.source_warehouse_id == warehouse_id)
    if start_date:
        stmt = stmt.where(Order.order_date >= datetime.fromisoformat(start_date))
    if end_date:
        stmt = stmt.where(Order.order_date <= datetime.fromisoformat(end_date))
    stmt = stmt.offset((page - 1) * limit).limit(limit).order_by(Order.order_date.desc())
    results = await session.exec(stmt)
    orders = results.all()

    if customer or product:
        filtered = []
        for order in orders:
            if customer:
                cust = await session.get(Customer, order.customer_id)
                if not cust or customer.lower() not in (cust.name or "").lower():
                    continue
            if product:
                items = await session.exec(select(OrderItem).where(OrderItem.order_id == order.id))
                products = [await session.get(Product, item.product_id) for item in items.all()]
                if not any(product.lower() in (((p.name or "") + (p.sku or "")).lower()) for p in products if p):
                    continue
            filtered.append(order)
        orders = filtered

    return {"data": orders}

@router.get("/{order_id}")
async def get_order(order_id: str, session: AsyncSession = Depends(get_session)):
    order = await session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Not found")
    items = await session.exec(select(OrderItem).where(OrderItem.order_id == order.id))
    return {"order": order, "items": items.all()}

@router.post("/")
async def create_order(payload: dict = Body(...), session: AsyncSession = Depends(get_session)):
    items = payload.get("items", [])
    order = Order(
        order_number=payload.get("orderNumber"),
        customer_id=payload.get("customerId"),
        source_warehouse_id=payload.get("sourceWarehouseId"),
        type=payload.get("type", "sale"),
        status=payload.get("status", "confirmed"),
        order_date=datetime.utcnow(),
        total_amount=payload.get("totalAmount", 0),
        created_by=payload.get("createdBy"),
        tracking_number=payload.get("trackingNumber"),
    )
    session.add(order)
    await session.commit()
    await session.refresh(order)

    for it in items:
        oi = OrderItem(
            order_id=order.id,
            product_id=it.get("productId"),
            quantity=it.get("quantity"),
            unit_price=it.get("unitPrice"),
            line_total=(it.get("quantity") or 0) * (it.get("unitPrice") or 0),
        )
        session.add(oi)
        q = await session.exec(select(Inventory).where(Inventory.product_id == it.get("productId"), Inventory.warehouse_id == order.source_warehouse_id))
        inv = q.one_or_none()
        if inv:
            before = float(inv.quantity_on_hand)
            inv.quantity_on_hand = before - float(it.get("quantity"))
            mv = StockMovement(
                product_id=it.get("productId"),
                warehouse_id=order.source_warehouse_id,
                type="outbound_sale",
                quantity=float(it.get("quantity")),
                quantity_before=before,
                quantity_after=inv.quantity_on_hand,
                user_id=order.created_by,
            )
            session.add(inv)
            session.add(mv)

    await session.commit()
    return {"success": True, "order": order}
