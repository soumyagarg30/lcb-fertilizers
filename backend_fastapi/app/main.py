from fastapi import FastAPI
from .routers import auth as auth_router, inventory as inventory_router
from .db import init_db, AsyncSessionLocal
from .config import settings
from .models import User, Warehouse, Product, Inventory, Customer, Order, OrderItem, StockMovement, Notification, QRCode, QRCodeScan
from .auth import get_password_hash
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI(title="Agriflow FastAPI")

app.include_router(auth_router.router, prefix="/api")
app.include_router(inventory_router.router, prefix="/api")
from .routers import users as users_router, products as products_router, orders as orders_router, transfers as transfers_router, notifications as notifications_router, dashboard as dashboard_router, customers as customers_router, qr_code as qr_code_router
app.include_router(users_router.router, prefix="/api")
app.include_router(products_router.router, prefix="/api")
app.include_router(orders_router.router, prefix="/api")
app.include_router(transfers_router.router, prefix="/api")
app.include_router(notifications_router.router, prefix="/api")
app.include_router(dashboard_router.router, prefix="/api")
app.include_router(qr_code_router.router, prefix="/api")
app.include_router(customers_router.router, prefix="/api")


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
            session.add_all([
                Warehouse(name="Central Warehouse", code="WH-001", address="Sector 18, Noida", gps_coordinates="28.5744,77.3319", capacity=12000, currency="INR", unit_preference="bags", tax_code="GST18"),
                Warehouse(name="North Hub", code="WH-002", address="Ghaziabad Industrial Area", gps_coordinates="28.6692,77.4538", capacity=9000, currency="INR", unit_preference="bags", tax_code="GST18"),
            ])
        q3 = await session.execute(select(func.count()).select_from(Product))
        pcount = q3.scalar_one()
        if pcount == 0:
            session.add_all([
                Product(name="Urea 46%", sku="CH-001", category="Chemical", subcategory="Urea", uom="bags", base_price=320, supplier="FarmChem", shelf_life_days=730, tags=["nitrogen"], image_urls=["/images/urea.jpg"], document_urls=["/docs/urea-msds.pdf"]),
                Product(name="DAP Fertilizer", sku="CH-002", category="Chemical", subcategory="DAP", uom="bags", base_price=580, supplier="AgriPro", shelf_life_days=540, tags=["phosphate"], image_urls=["/images/dap.jpg"]),
                Product(name="Neem Cake Organic", sku="OR-001", category="Organic", subcategory="Organic Fertilizer", uom="bags", base_price=210, supplier="GreenGrow", shelf_life_days=365, tags=["organic"], image_urls=["/images/neem.jpg"]),
                Product(name="Zinc Sulphate", sku="MN-001", category="Micronutrients", subcategory="Zinc", uom="bags", base_price=390, supplier="MicroNutrients Co", shelf_life_days=540, tags=["zinc"], image_urls=["/images/zinc.jpg"]),
            ])
        q4 = await session.execute(select(func.count()).select_from(Customer))
        ccount = q4.scalar_one()
        if ccount == 0:
            session.add_all([
                Customer(name="Ravi Farms", email="ravi@farms.in", phone="+911234567890", city="Delhi", state="Delhi", tier="Gold"),
                Customer(name="Green Valley Agro", email="contact@greenvalley.in", phone="+911098765432", city="Lucknow", state="Uttar Pradesh", tier="Silver"),
            ])
            q5 = await session.execute(select(func.count()).select_from(Inventory))
            invcount = q5.scalar_one()
            if invcount == 0:
                products = await session.exec(select(Product))
                product_list = products.scalars().all()
                warehouses = (await session.exec(select(Warehouse))).scalars().all()
            mapping = {"CH-001": 840, "CH-002": 120, "OR-001": 0, "MN-001": 310}
            for product in product_list:
                for warehouse in warehouses:
                    qty = mapping.get(product.sku, 60)
                    session.add(Inventory(product_id=product.id, warehouse_id=warehouse.id, quantity_on_hand=qty, quantity_reserved=0, min_threshold=(200 if product.sku == "CH-001" else 80)))
        q6 = await session.execute(select(func.count()).select_from(Order))
        ocount = q6.scalar_one()
        if ocount == 0:
            customers = (await session.exec(select(Customer))).scalars().all()
            warehouses = (await session.exec(select(Warehouse))).scalars().all()
            products = {p.sku: p for p in (await session.exec(select(Product))).scalars().all()}
            sample_orders = [
                {"order_number": "ORD-2841", "customer_id": customers[0].id, "source_warehouse_id": warehouses[0].id, "type": "sale", "status": "Delivered", "order_date": None, "expected_delivery": None, "tracking_number": "TRK-9281", "total_amount": 6400.0, "created_by": None, "items": [{"sku": "CH-001", "qty": 20, "price": 320}]},
                {"order_number": "ORD-2842", "customer_id": customers[1].id, "source_warehouse_id": warehouses[0].id, "type": "transfer", "status": "In Transit", "order_date": None, "expected_delivery": None, "tracking_number": "TRK-9282", "total_amount": 5800.0, "created_by": None, "items": [{"sku": "CH-002", "qty": 10, "price": 580}]},
            ]
            for sample in sample_orders:
                order = Order(order_number=sample["order_number"], customer_id=sample["customer_id"], source_warehouse_id=sample["source_warehouse_id"], type=sample["type"], status=sample["status"], order_date=None, expected_delivery=None, tracking_number=sample["tracking_number"], total_amount=sample["total_amount"], created_by=sample["created_by"])
                session.add(order)
                await session.commit()
                await session.refresh(order)
                for item in sample["items"]:
                    product = products.get(item["sku"])
                    if product:
                        session.add(OrderItem(order_id=order.id, product_id=product.id, quantity=item["qty"], unit_price=item["price"], line_total=item["qty"] * item["price"]))
        q7 = await session.execute(select(func.count()).select_from(Notification))
        ncount = q7.scalar_one()
        if ncount == 0:
            user = (await session.exec(select(User))).scalars().first()
            session.add(Notification(user_id=user.id if user else None, type="alert", title="Low stock alert", message="DAP Fertilizer stock is below minimum threshold in Central Warehouse.", priority="high"))
        await session.commit()


@app.get("/")
async def root():
    return {"message": "Agriflow FastAPI running"}
