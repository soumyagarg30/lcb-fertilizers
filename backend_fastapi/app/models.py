from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column
from sqlalchemy import JSON as SA_JSON
import uuid
from enum import Enum
from datetime import datetime

class Role(str, Enum):
    superadmin = "superadmin"
    warehouse_manager = "warehouse_manager"
    sales = "sales"
    regional_manager = "regional_manager"
    finance = "finance"
    viewer = "viewer"

class User(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    email: str
    password_hash: Optional[str] = None
    role: Role = Role.viewer
    location_id: Optional[str] = None
    active: bool = True

class Warehouse(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    code: Optional[str]
    address: Optional[str] = None
    gps_coordinates: Optional[str] = None
    capacity: Optional[float] = None
    manager_id: Optional[str] = None
    currency: Optional[str] = "INR"
    unit_preference: Optional[str] = "bags"
    tax_code: Optional[str] = None

class Product(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    sku: Optional[str]
    category: Optional[str] = None
    subcategory: Optional[str] = None
    description: Optional[str] = None
    uom: Optional[str] = None
    base_price: Optional[float] = 0
    supplier: Optional[str] = None
    shelf_life_days: Optional[int] = None
    tags: Optional[List[str]] = Field(default=None, sa_column=Column(SA_JSON))
    image_urls: Optional[List[str]] = Field(default=None, sa_column=Column(SA_JSON))
    document_urls: Optional[List[str]] = Field(default=None, sa_column=Column(SA_JSON))

class Inventory(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    product_id: str
    warehouse_id: str
    quantity_on_hand: float = 0
    quantity_reserved: float = 0
    min_threshold: float = 0

class StockMovement(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    product_id: str
    warehouse_id: str
    type: str
    quantity: float
    quantity_before: float
    quantity_after: float
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    batch_number: Optional[str] = None
    notes: Optional[str] = None
    user_id: Optional[str] = None
    unit_cost: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CycleCount(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    warehouse_id: str
    status: str = "draft"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    notes: Optional[str] = None
    items: Optional[List[dict]] = Field(default=None, sa_column=Column(SA_JSON))
    user_id: Optional[str] = None

class AuditLog(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: Optional[str] = None
    action: str
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    before: Optional[dict] = Field(default=None, sa_column=Column(SA_JSON))
    after: Optional[dict] = Field(default=None, sa_column=Column(SA_JSON))
    notes: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Additional domain models: Customer, Order, OrderItem, Transfer, Notification
class Customer(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    tier: Optional[str] = None

class Order(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    order_number: Optional[str] = None
    customer_id: Optional[str] = None
    source_warehouse_id: Optional[str] = None
    type: Optional[str] = "sale"
    status: Optional[str] = "pending"
    order_date: Optional[datetime] = None
    expected_delivery: Optional[datetime] = None
    total_amount: Optional[float] = 0
    tracking_number: Optional[str] = None
    created_by: Optional[str] = None

class OrderItem(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    order_id: str
    product_id: str
    quantity: float
    unit_price: float
    line_total: float

class Transfer(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    transfer_number: Optional[str] = None
    source_warehouse_id: Optional[str] = None
    dest_warehouse_id: Optional[str] = None
    status: Optional[str] = "pending"
    items: Optional[List[dict]] = Field(default=None, sa_column=Column(SA_JSON))
    created_by: Optional[str] = None

class Notification(SQLModel, table=True):
    id: Optional[str] = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str
    type: str
    title: str
    message: str
    read: bool = False
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    priority: Optional[str] = "medium"
    created_at: datetime = Field(default_factory=datetime.utcnow)

