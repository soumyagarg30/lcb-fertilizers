from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str

class InventoryOut(BaseModel):
    id: str
    product_id: str
    warehouse_id: str
    quantity_on_hand: float
    quantity_reserved: float
    min_threshold: float

class StockMovementCreate(BaseModel):
    product_id: str
    warehouse_id: str
    type: str
    quantity: float
    batch_number: Optional[str] = None
    notes: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    unit_cost: Optional[float] = None

class CycleCountCreate(BaseModel):
    warehouse_id: str
    notes: Optional[str] = None
