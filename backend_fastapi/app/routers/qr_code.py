import os
import uuid
import io
import base64
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlmodel import select, Session
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import qrcode

from ..db import get_session
from ..models import QRCode, QRCodeScan, Product, Inventory, Warehouse
from ..auth import get_current_user

router = APIRouter(tags=["qr-code"])


class QRCodeCreateRequest(BaseModel):
    item_name: Optional[str] = None
    product_id: Optional[str] = None
    warehouse_id: Optional[str] = None
    inventory_id: Optional[str] = None
    batch_number: Optional[str] = None
    item_metadata: Optional[Dict[str, Any]] = None
    frontend_origin: Optional[str] = None


class QRCodeCreate:
    def __init__(
        self,
        product_id: Optional[str] = None,
        warehouse_id: Optional[str] = None,
        inventory_id: Optional[str] = None,
        batch_number: Optional[str] = None,
        item_name: Optional[str] = None,
        item_metadata: Optional[dict] = None,
    ):
        self.product_id = product_id
        self.warehouse_id = warehouse_id
        self.inventory_id = inventory_id
        self.batch_number = batch_number
        self.item_name = item_name
        self.item_metadata = item_metadata or {}


class QRCodeResponse:
    def __init__(self, qr: QRCode):
        self.id = qr.id
        self.code = qr.code
        self.product_id = qr.product_id
        self.warehouse_id = qr.warehouse_id
        self.inventory_id = qr.inventory_id
        self.batch_number = qr.batch_number
        self.item_name = qr.item_name
        self.item_metadata = qr.item_metadata
        self.created_at = qr.created_at
        self.is_active = qr.is_active


class QRCodeScanRecord:
    def __init__(
        self,
        action: str,
        warehouse_id: Optional[str] = None,
        location: Optional[str] = None,
        notes: Optional[str] = None,
        coordinates: Optional[str] = None,
    ):
        self.action = action
        self.warehouse_id = warehouse_id
        self.location = location
        self.notes = notes
        self.coordinates = coordinates


@router.post("/qr-code/generate")
async def generate_qr_code(
    qr_data: QRCodeCreateRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Generate a new QR code for tracking inventory"""
    try:
        # Generate unique QR code identifier
        qr_id = str(uuid.uuid4())
        
        # Determine frontend app URL for QR code scanning.
        app_base_url = os.getenv("APP_BASE_URL")
        if not app_base_url and qr_data.frontend_origin:
            app_base_url = qr_data.frontend_origin
        if not app_base_url:
            app_base_url = request.headers.get("origin") or "http://localhost:3000"
        app_base_url = app_base_url.rstrip("/")
        qr_view_url = f"{app_base_url}/qr/{qr_id}"

        # Create QR code object
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_view_url)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        img_buffer = io.BytesIO()
        img.save(img_buffer, format="PNG")
        img_buffer.seek(0)
        img_base64 = base64.b64encode(img_buffer.read()).decode("utf-8")
        
        # Save QR code to database
        db_qr = QRCode(
            id=qr_id,
            code=qr_id,
            product_id=qr_data.product_id,
            warehouse_id=qr_data.warehouse_id,
            inventory_id=qr_data.inventory_id,
            batch_number=qr_data.batch_number,
            item_name=qr_data.item_name,
            item_metadata=qr_data.item_metadata or {},
            created_by=None,
        )
        
        session.add(db_qr)
        await session.commit()
        await session.refresh(db_qr)
        
        return {
            "id": db_qr.id,
            "code": db_qr.code,
            "qr_url": qr_view_url,
            "qr_image_base64": img_base64,
            "product_id": db_qr.product_id,
            "warehouse_id": db_qr.warehouse_id,
            "inventory_id": db_qr.inventory_id,
            "batch_number": db_qr.batch_number,
            "item_name": db_qr.item_name,
            "item_metadata": db_qr.item_metadata,
            "created_at": db_qr.created_at,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/qr-code/{qr_code_id}")
async def get_qr_code_info(
    qr_code_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Get information about a specific QR code (public endpoint)"""
    try:
        result = await session.execute(select(QRCode).where(QRCode.id == qr_code_id))
        qr = result.scalars().first()
        
        if not qr:
            raise HTTPException(status_code=404, detail="QR code not found")
        
        return {
            "id": qr.id,
            "code": qr.code,
            "product_id": qr.product_id,
            "warehouse_id": qr.warehouse_id,
            "inventory_id": qr.inventory_id,
            "batch_number": qr.batch_number,
            "item_name": qr.item_name,
            "item_metadata": qr.item_metadata,
            "created_at": qr.created_at,
            "is_active": qr.is_active,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/qr-code/scan/{qr_code_id}")
async def scan_qr_code(
    qr_code_id: str,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Get full QR code info with recent scan history"""
    try:
        result = await session.execute(select(QRCode).where(QRCode.id == qr_code_id))
        qr = result.scalars().first()
        
        if not qr:
            raise HTTPException(status_code=404, detail="QR code not found")
        
        # Get last 10 scans
        scans_result = await session.execute(
            select(QRCodeScan)
            .where(QRCodeScan.qr_code_id == qr_code_id)
            .order_by(QRCodeScan.scanned_at.desc())
            .limit(10)
        )
        scans = scans_result.scalars().all()
        
        return {
            "id": qr.id,
            "code": qr.code,
            "product_id": qr.product_id,
            "warehouse_id": qr.warehouse_id,
            "inventory_id": qr.inventory_id,
            "batch_number": qr.batch_number,
            "item_name": qr.item_name,
            "item_metadata": qr.item_metadata,
            "created_at": qr.created_at,
            "is_active": qr.is_active,
            "scan_history": [
                {
                    "id": scan.id,
                    "action": scan.action,
                    "warehouse_id": scan.warehouse_id,
                    "location": scan.location,
                    "notes": scan.notes,
                    "coordinates": scan.coordinates,
                    "scanned_at": scan.scanned_at,
                }
                for scan in scans
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/qr-code/{qr_code_id}/record-scan")
async def record_qr_scan(
    qr_code_id: str,
    scan_data: dict,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Record a QR code scan event"""
    try:
        # Verify QR code exists
        result = await session.execute(select(QRCode).where(QRCode.id == qr_code_id))
        qr = result.scalars().first()
        
        if not qr:
            raise HTTPException(status_code=404, detail="QR code not found")
        
        # Create scan record
        scan = QRCodeScan(
            qr_code_id=qr_code_id,
            user_id=current_user.get("user_id") or current_user.get("id"),
            warehouse_id=scan_data.get("warehouse_id"),
            location=scan_data.get("location"),
            action=scan_data.get("action", "scanned"),
            notes=scan_data.get("notes"),
            coordinates=scan_data.get("coordinates"),
        )
        
        session.add(scan)
        await session.commit()
        await session.refresh(scan)
        
        return {
            "id": scan.id,
            "qr_code_id": scan.qr_code_id,
            "action": scan.action,
            "warehouse_id": scan.warehouse_id,
            "location": scan.location,
            "notes": scan.notes,
            "scanned_at": scan.scanned_at,
            "message": f"QR code scanned: {qr.item_name or 'Unknown item'}",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/qr-code/{qr_code_id}/history")
async def get_qr_scan_history(
    qr_code_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Get complete scan history for a QR code"""
    try:
        result = await session.execute(select(QRCode).where(QRCode.id == qr_code_id))
        qr = result.scalars().first()
        
        if not qr:
            raise HTTPException(status_code=404, detail="QR code not found")
        
        # Get total count
        count_result = await session.execute(
            select(QRCode).from_statement(
                f"SELECT COUNT(*) FROM qrcodescan WHERE qr_code_id = '{qr_code_id}'"
            )
        )
        
        # Get paginated scans
        scans_result = await session.execute(
            select(QRCodeScan)
            .where(QRCodeScan.qr_code_id == qr_code_id)
            .order_by(QRCodeScan.scanned_at.desc())
            .offset(skip)
            .limit(limit)
        )
        scans = scans_result.scalars().all()
        
        return {
            "qr_code_id": qr_code_id,
            "item_name": qr.item_name,
            "batch_number": qr.batch_number,
            "total_scans": len(scans),
            "scan_history": [
                {
                    "id": scan.id,
                    "action": scan.action,
                    "warehouse_id": scan.warehouse_id,
                    "location": scan.location,
                    "notes": scan.notes,
                    "coordinates": scan.coordinates,
                    "scanned_at": scan.scanned_at,
                }
                for scan in scans
            ],
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/qr-code/list/all")
async def list_qr_codes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    warehouse_id: Optional[str] = None,
    product_id: Optional[str] = None,
    is_active: Optional[bool] = None,
    session: AsyncSession = Depends(get_session),
    current_user: dict = Depends(get_current_user),
) -> dict:
    """List all QR codes with filters"""
    try:
        query = select(QRCode)
        
        if warehouse_id:
            query = query.where(QRCode.warehouse_id == warehouse_id)
        if product_id:
            query = query.where(QRCode.product_id == product_id)
        if is_active is not None:
            query = query.where(QRCode.is_active == is_active)
        
        # Get count
        count_result = await session.execute(query)
        total = len(count_result.scalars().all())
        
        # Get paginated results
        result = await session.execute(
            query.order_by(QRCode.created_at.desc()).offset(skip).limit(limit)
        )
        qr_codes = result.scalars().all()
        
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "qr_codes": [
                {
                    "id": qr.id,
                    "code": qr.code,
                    "product_id": qr.product_id,
                    "warehouse_id": qr.warehouse_id,
                    "inventory_id": qr.inventory_id,
                    "batch_number": qr.batch_number,
                    "item_name": qr.item_name,
                    "created_at": qr.created_at,
                    "is_active": qr.is_active,
                }
                for qr in qr_codes
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
