from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..models import Order, OrderItem, Inventory, StockMovement
from datetime import datetime

router = APIRouter(prefix="/orders", tags=["orders"])

@router.post("/")
async def create_order(payload: dict = Body(...), session: AsyncSession = Depends(get_session)):
    # payload: {orderNumber, customerId, sourceWarehouseId, items: [{productId, quantity, unitPrice}]}
    items = payload.get("items", [])
    order = Order(order_number=payload.get("orderNumber"), customer_id=payload.get("customerId"), source_warehouse_id=payload.get("sourceWarehouseId"), type=payload.get("type","sale"), status="confirmed", order_date=datetime.utcnow(), total_amount=payload.get("totalAmount",0), created_by=payload.get("createdBy"))
    session.add(order)
    await session.commit()
    await session.refresh(order)
    # create items and reserve inventory
    for it in items:
        oi = OrderItem(order_id=order.id, product_id=it.get("productId"), quantity=it.get("quantity"), unit_price=it.get("unitPrice"), line_total=it.get("quantity")*it.get("unitPrice"))
        session.add(oi)
        # reduce inventory
        q = await session.exec(select(Inventory).where(Inventory.product_id == it.get("productId"), Inventory.warehouse_id == order.source_warehouse_id))
        inv = q.one_or_none()
        if inv:
            before = float(inv.quantity_on_hand)
            inv.quantity_on_hand = before - float(it.get("quantity"))
            mv = StockMovement(product_id=it.get("productId"), warehouse_id=order.source_warehouse_id, type="outbound_sale", quantity=float(it.get("quantity")), quantity_before=before, quantity_after=inv.quantity_on_hand, user_id=order.created_by)
            session.add(inv); session.add(mv)
    await session.commit()
    return {"success": True, "order": order}

@router.get("/")
async def list_orders(page: int = 1, limit: int = 50, session: AsyncSession = Depends(get_session)):
    offset = (page - 1) * limit
    res = await session.exec(select(Order).offset(offset).limit(limit).order_by(Order.order_date.desc()))
    return {"data": res.all()}
