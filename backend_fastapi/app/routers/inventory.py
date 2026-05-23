from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from ..db import get_session
from ..models import Inventory, Product, Warehouse, StockMovement, CycleCount, AuditLog, User
from ..schemas import InventoryOut, StockMovementCreate, CycleCountCreate
from ..auth import get_current_user, require_roles
from datetime import datetime

router = APIRouter(prefix="/inventory", tags=["inventory"])

@router.get("/", response_model=list[InventoryOut])
async def list_inventory(page: int = 1, limit: int = 50, search: Optional[str] = None, warehouseId: Optional[str] = None, user=Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    offset = (page - 1) * limit
    q = select(Inventory).offset(offset).limit(limit)
    if warehouseId:
        q = q.where(Inventory.warehouse_id == warehouseId)
    results = await session.exec(q)
    rows = results.all()
    return rows

@router.get("/movements/history")
async def movements_history(page: int = 1, limit: int = 50, productId: Optional[str] = None, warehouseId: Optional[str] = None, session: AsyncSession = Depends(get_session)):
    offset = (page - 1) * limit
    q = select(StockMovement).offset(offset).limit(limit)
    if productId: q = q.where(StockMovement.product_id == productId)
    if warehouseId: q = q.where(StockMovement.warehouse_id == warehouseId)
    results = await session.exec(q)
    return {"data": results.all()}

@router.get("/cycle-counts")
async def cycle_counts(session: AsyncSession = Depends(get_session)):
    q = select(CycleCount).order_by(CycleCount.started_at.desc())
    results = await session.exec(q)
    return {"data": results.all()}

@router.get("/{id}")
async def get_inventory(id: str, session: AsyncSession = Depends(get_session)):
    inv = await session.get(Inventory, id)
    if not inv:
        raise HTTPException(status_code=404, detail="Not found")
    return inv

@router.patch("/{id}/threshold", dependencies=[Depends(require_roles("superadmin","warehouse_manager","regional_manager"))])
async def patch_threshold(id: str, body: dict, session: AsyncSession = Depends(get_session)):
    inv = await session.get(Inventory, id)
    if not inv:
        raise HTTPException(status_code=404, detail="Not found")
    inv.min_threshold = float(body.get("minThreshold", inv.min_threshold))
    session.add(inv)
    await session.commit()
    await session.refresh(inv)
    return inv

@router.post("/movements", dependencies=[Depends(require_roles("superadmin","warehouse_manager","sales"))])
async def create_movement(payload: StockMovementCreate, request: Request, user=Depends(get_current_user), session: AsyncSession = Depends(get_session)):
        # find or create inventory
        q = await session.exec(select(Inventory).where(Inventory.product_id == payload.product_id, Inventory.warehouse_id == payload.warehouse_id))
        inv = q.one_or_none()
        if not inv:
            inv = Inventory(product_id=payload.product_id, warehouse_id=payload.warehouse_id, quantity_on_hand=0)
            session.add(inv)
            await session.commit()
            await session.refresh(inv)

        before = float(inv.quantity_on_hand)
        is_outbound = payload.type.startswith("outbound") or payload.type == "adjustment_remove"
        if is_outbound and before < payload.quantity:
            raise HTTPException(status_code=400, detail=f"Insufficient stock. Available: {before}")
        after = before - payload.quantity if is_outbound else before + payload.quantity
        inv.quantity_on_hand = after
        session.add(inv)
        movement = StockMovement(product_id=payload.product_id, warehouse_id=payload.warehouse_id, type=payload.type,
                                 quantity=payload.quantity, quantity_before=before, quantity_after=after,
                                 reference_type=payload.reference_type, reference_id=payload.reference_id,
                                 batch_number=payload.batch_number, notes=payload.notes, user_id=user.get("user_id"))
        session.add(movement)
        log = AuditLog(user_id=user.get("user_id"), action="STOCK_MOVEMENT", entity_type="Inventory", entity_id=inv.id,
                       before={"quantity": before}, after={"quantity": after, "type": payload.type}, notes=payload.notes, ip_address=request.client.host)
        session.add(log)
        await session.commit()
        await session.refresh(movement)
        return movement

@router.post("/cycle-counts", dependencies=[Depends(require_roles("superadmin","warehouse_manager"))])
async def start_cycle_count(payload: CycleCountCreate, user=Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    q = await session.exec(select(Inventory).where(Inventory.warehouse_id == payload.warehouse_id))
    inventories = q.all()
    items = []
    for inv in inventories:
        # product minimal info
        items.append({"productId": inv.product_id, "expected": float(inv.quantity_on_hand), "counted": None, "variance": None})
    cc = CycleCount(warehouse_id=payload.warehouse_id, notes=payload.notes, user_id=user.get("user_id"), status="in_progress", started_at=datetime.utcnow(), items=items)
    session.add(cc)
    await session.commit()
    await session.refresh(cc)
    return cc

@router.patch("/cycle-counts/{id}", dependencies=[Depends(require_roles("superadmin","warehouse_manager"))])
async def update_cycle_count(id: str, body: dict, session: AsyncSession = Depends(get_session)):
    cc = await session.get(CycleCount, id)
    if not cc:
        raise HTTPException(status_code=404, detail="Not found")
    submitted = body.get("counts") or []
    items = []
    for item in cc.items or []:
        found = next((c for c in submitted if c.get("productId") == item.get("productId")), None)
        if found is not None:
            counted = float(found.get("counted"))
            items.append({**item, "counted": counted, "variance": counted - item.get("expected", 0)})
        else:
            items.append(item)
    cc.items = items
    cc.status = "pending_approval" if body.get("submit") else "in_progress"
    cc.completed_at = datetime.utcnow() if body.get("submit") else None
    session.add(cc)
    await session.commit()
    await session.refresh(cc)
    return cc

@router.post("/cycle-counts/{id}/approve", dependencies=[Depends(require_roles("superadmin","regional_manager"))])
async def approve_cycle_count(id: str, user=Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    cc = await session.get(CycleCount, id)
    if not cc:
        raise HTTPException(status_code=404, detail="Not found")
    if cc.status != "pending_approval":
        raise HTTPException(status_code=400, detail="Not pending approval")
    for item in cc.items or []:
        variance = item.get("variance")
        if not variance:
            continue
        q = await session.exec(select(Inventory).where(Inventory.product_id == item.get("productId"), Inventory.warehouse_id == cc.warehouse_id))
        inv = q.one_or_none()
        if not inv: continue
        before = float(inv.quantity_on_hand)
        inv.quantity_on_hand = float(item.get("counted"))
        session.add(inv)
        movement = StockMovement(product_id=item.get("productId"), warehouse_id=cc.warehouse_id, type="cycle_count",
                                 quantity=abs(variance), quantity_before=before, quantity_after=item.get("counted"),
                                 reference_type="CycleCount", reference_id=cc.id, notes=f"Variance: {variance}", user_id=user.get("user_id"))
        session.add(movement)
    cc.status = "approved"
    cc.approved_by = user.get("user_id")
    cc.approved_at = datetime.utcnow()
    session.add(cc)
    await session.commit()
    await session.refresh(cc)
    return cc
