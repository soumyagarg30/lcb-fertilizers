from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..models import Inventory, StockMovement, Order, Product, Warehouse, Notification, Customer

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/")
async def get_dashboard_summary(session: AsyncSession = Depends(get_session)):
    total_skus = (await session.execute(select(func.count()).select_from(Product))).scalar_one() or 0
    total_stock_units = (await session.execute(select(func.coalesce(func.sum(Inventory.quantity_on_hand), 0)))).scalar_one() or 0
    low_stock_items = (await session.execute(select(func.count()).select_from(Inventory).where(Inventory.quantity_on_hand < Inventory.min_threshold))).scalar_one() or 0
    out_of_stock_items = (await session.execute(select(func.count()).select_from(Inventory).where(Inventory.quantity_on_hand <= 0))).scalar_one() or 0
    orders_pending = (await session.execute(select(func.count()).select_from(Order).where(Order.status.in_(["Pending", "Confirmed", "Packed", "Shipped", "In Transit"])))).scalar_one() or 0

    stock_value = (await session.execute(
        select(func.coalesce(func.sum(Inventory.quantity_on_hand * Product.base_price), 0))
        .select_from(Inventory)
        .join(Product, Inventory.product_id == Product.id)
    )).scalar_one() or 0

    now = datetime.utcnow()
    window = now - timedelta(days=90)
    movements = (await session.execute(
        select(StockMovement).where(StockMovement.created_at >= window).order_by(StockMovement.created_at.desc())
    )).scalars().all()

    daily = {}
    for movement in movements:
        day = movement.created_at.date().isoformat()
        entry = daily.setdefault(day, {"inbound": 0.0, "outbound": 0.0})
        if movement.type.startswith("outbound") or movement.type in ["adjustment_remove", "cycle_count"]:
            entry["outbound"] += float(movement.quantity)
        else:
            entry["inbound"] += float(movement.quantity)

    movement_chart = [{"date": d, **daily[d]} for d in sorted(daily.keys())]

    top_products = (await session.execute(
        select(Product.name, Product.sku, func.coalesce(func.sum(Inventory.quantity_on_hand), 0).label("stock"))
        .join(Inventory, Inventory.product_id == Product.id)
        .group_by(Product.id)
        .order_by(func.sum(Inventory.quantity_on_hand).desc())
        .limit(10)
    )).all()

    top_products_payload = [{"name": p[0], "sku": p[1], "stock": int(p[2] or 0)} for p in top_products]

    recent_activity = [
        {
            "id": m.id,
            "product_id": m.product_id,
            "warehouse_id": m.warehouse_id,
            "type": m.type,
            "quantity": m.quantity,
            "quantity_before": m.quantity_before,
            "quantity_after": m.quantity_after,
            "batch_number": m.batch_number,
            "notes": m.notes,
            "created_at": m.created_at,
            "user_id": m.user_id,
        }
        for m in movements[:20]
    ]

    low_stock_records = (await session.execute(select(Inventory).where(Inventory.quantity_on_hand < Inventory.min_threshold).limit(20))).scalars().all()
    alert_items = []
    for inv in low_stock_records:
        product = await session.get(Product, inv.product_id)
        warehouse = await session.get(Warehouse, inv.warehouse_id)
        alert_items.append({
            "product": product.name if product else inv.product_id,
            "warehouse": warehouse.name if warehouse else inv.warehouse_id,
            "quantity": inv.quantity_on_hand,
            "threshold": inv.min_threshold,
            "type": "low_stock",
        })

    recent_notifications = (await session.execute(select(Notification).order_by(Notification.id.desc()).limit(10))).scalars().all()
    notifications_payload = [{"title": n.title, "message": n.message, "type": n.type, "created_at": n.created_at, "read": n.read} for n in recent_notifications]

    return {
        "summary": {
            "total_skus": int(total_skus),
            "total_stock_units": float(total_stock_units),
            "low_stock_items": int(low_stock_items),
            "out_of_stock_items": int(out_of_stock_items),
            "orders_pending": int(orders_pending),
            "inventory_value_inr": float(stock_value),
        },
        "movement_chart": movement_chart,
        "top_products": top_products_payload,
        "recent_activity": recent_activity,
        "alerts": alert_items,
        "notifications": notifications_payload,
    }
