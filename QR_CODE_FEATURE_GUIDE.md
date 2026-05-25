# QR Code Inventory Tracking System

A comprehensive QR code-based inventory tracking system for Agriflow that allows you to:

- Generate unique QR codes for inventory items
- Scan QR codes to track item movement and status
- View complete scan history and item journey
- Record actions at each step (received, moved, verified, packed, shipped, delivered)

## Features

### 1. **QR Code Generation**

Generate unique QR codes for inventory items with detailed metadata:

- Item name and description
- Product ID and batch number
- Warehouse location
- Custom metadata
- Automatic QR code image generation

### 2. **QR Code Scanning**

Track inventory movement with:

- Manual QR code entry or camera scanning
- Action logging (received, moved, verified, packed, shipped, delivered)
- Location tracking
- Scan notes and comments
- Timestamp recording

### 3. **Scan History Tracking**

Complete audit trail with:

- Timeline view of all scans
- Action-based filtering
- Location and warehouse tracking
- User information
- Pagination support

## Installation & Setup

### Backend Setup

1. **Install Python Dependencies**

```bash
cd backend_fastapi
pip install -r requirements.txt
```

The following packages have been added for QR code support:

- `qrcode[pil]` - For QR code generation
- `python-multipart` - For form data handling

2. **Update Database**
   The new `QRCode` and `QRCodeScan` tables will be created automatically on first run:

```bash
export DATABASE_URL='sqlite+aiosqlite:///./test.db'
export SECRET_KEY='change-me'
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

1. **Install Node Dependencies**

```bash
npm install
```

2. **Use Components in Your App**
   Import the QR code components in your application:

```jsx
import QRCodeGenerator from "./components/QRCodeGenerator";
import QRScanner from "./components/QRScanner";
import QRCodeHistory from "./components/QRCodeHistory";
```

## API Documentation

### QR Code Endpoints

#### Generate QR Code

```
POST /api/qr-code/generate
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "item_name": "Rice - 50kg bag",
  "product_id": "prod_123",
  "warehouse_id": "wh_001",
  "batch_number": "BATCH_2024_001",
  "metadata": {
    "supplier": "Farm XYZ",
    "weight": "50kg"
  }
}

Response:
{
  "id": "uuid",
  "code": "uuid",
  "qr_image_base64": "data:image/png;base64,...",
  "product_id": "prod_123",
  "warehouse_id": "wh_001",
  "batch_number": "BATCH_2024_001",
  "item_name": "Rice - 50kg bag",
  "created_at": "2024-05-25T10:30:00",
  "metadata": {...}
}
```

#### Get QR Code Info

```
GET /api/qr-code/{qr_code_id}
Authorization: Bearer {token}

Response:
{
  "id": "uuid",
  "code": "uuid",
  "product_id": "prod_123",
  "warehouse_id": "wh_001",
  "batch_number": "BATCH_2024_001",
  "item_name": "Rice - 50kg bag",
  "created_at": "2024-05-25T10:30:00",
  "is_active": true,
  "metadata": {...}
}
```

#### Scan QR Code

```
GET /api/qr-code/scan/{qr_code_id}
Authorization: Bearer {token}

Response:
{
  "id": "uuid",
  "code": "uuid",
  "item_name": "Rice - 50kg bag",
  "batch_number": "BATCH_2024_001",
  "scan_history": [
    {
      "id": "uuid",
      "action": "received",
      "warehouse_id": "wh_001",
      "location": "Shelf A-12",
      "notes": "Delivery received",
      "scanned_at": "2024-05-25T10:30:00"
    }
  ]
}
```

#### Record QR Code Scan

```
POST /api/qr-code/{qr_code_id}/record-scan
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "action": "moved",
  "warehouse_id": "wh_001",
  "location": "Shelf B-5",
  "notes": "Moved to different location",
  "coordinates": "40.7128,-74.0060"
}

Response:
{
  "id": "uuid",
  "qr_code_id": "uuid",
  "action": "moved",
  "warehouse_id": "wh_001",
  "location": "Shelf B-5",
  "scanned_at": "2024-05-25T10:35:00",
  "message": "QR code scanned: Rice - 50kg bag"
}
```

#### Get QR Code Scan History

```
GET /api/qr-code/{qr_code_id}/history?skip=0&limit=50
Authorization: Bearer {token}

Response:
{
  "qr_code_id": "uuid",
  "item_name": "Rice - 50kg bag",
  "batch_number": "BATCH_2024_001",
  "total_scans": 5,
  "scan_history": [
    {
      "id": "uuid",
      "action": "received",
      "warehouse_id": "wh_001",
      "location": "Receiving Dock",
      "notes": "Item received from supplier",
      "scanned_at": "2024-05-25T08:00:00"
    },
    ...
  ]
}
```

#### List QR Codes

```
GET /api/qr-code/list/all?skip=0&limit=50&warehouse_id=wh_001&is_active=true
Authorization: Bearer {token}

Response:
{
  "total": 100,
  "skip": 0,
  "limit": 50,
  "qr_codes": [
    {
      "id": "uuid",
      "code": "uuid",
      "product_id": "prod_123",
      "warehouse_id": "wh_001",
      "batch_number": "BATCH_2024_001",
      "item_name": "Rice - 50kg bag",
      "created_at": "2024-05-25T10:30:00",
      "is_active": true
    }
  ]
}
```

## Component Usage

### QRCodeGenerator Component

Generates QR codes for inventory items with a user-friendly form:

```jsx
import QRCodeGenerator from "./components/QRCodeGenerator";

function App() {
  return <QRCodeGenerator />;
}
```

**Features:**

- Form to input item details
- Automatic QR code generation
- Download QR code as PNG
- Print QR code with item information
- Display generated QR codes

### QRScanner Component

Scans QR codes and records inventory actions:

```jsx
import QRScanner from "./components/QRScanner";

function App() {
  return <QRScanner />;
}
```

**Features:**

- Camera-based scanning (with manual entry fallback)
- Action selection (received, moved, verified, packed, shipped, delivered)
- Location tracking
- Notes and comments
- Displays recent scan history
- Real-time feedback

### QRCodeHistory Component

Views complete scan history for a QR code:

```jsx
import QRCodeHistory from "./components/QRCodeHistory";

function App() {
  return <QRCodeHistory />;
}
```

**Features:**

- Search by QR code ID
- Timeline view of all scans
- Action badges with color coding
- Pagination support
- Item information display
- Location and warehouse tracking

## Usage Workflow

### 1. Generate QR Codes

1. Go to QR Code Generator
2. Fill in item details (name, product ID, warehouse, batch number)
3. Click "Generate QR Code"
4. Download or print the QR code
5. Attach to physical inventory item

### 2. Scan Items

1. Go to QR Scanner
2. Start camera or manually enter QR code ID
3. Select action (received, moved, verified, etc.)
4. Enter location and notes
5. Click "Record Scan"
6. View recent scan history

### 3. Track History

1. Go to QR Code History
2. Enter QR code ID to search
3. View complete timeline of all scans
4. See action history with timestamps and locations
5. Verify item journey through inventory

## Data Models

### QRCode Model

```python
{
  "id": str,                    # Unique identifier (UUID)
  "code": str,                  # QR code identifier (unique)
  "product_id": str,            # Associated product
  "warehouse_id": str,          # Associated warehouse
  "inventory_id": str,          # Associated inventory
  "batch_number": str,          # Batch identifier
  "item_name": str,             # Human-readable name
  "metadata": dict,             # Custom metadata
  "created_by": str,            # Creator user ID
  "created_at": datetime,       # Creation timestamp
  "is_active": bool             # Active status
}
```

### QRCodeScan Model

```python
{
  "id": str,                    # Unique identifier (UUID)
  "qr_code_id": str,            # Associated QR code
  "user_id": str,               # Scanning user
  "warehouse_id": str,          # Warehouse ID
  "location": str,              # Physical location
  "action": str,                # Action performed (received, moved, etc.)
  "notes": str,                 # Additional notes
  "coordinates": str,           # GPS coordinates (optional)
  "scanned_at": datetime        # Scan timestamp
}
```

## Integration with Inventory System

### Recording Stock Movements

When a QR code is scanned, you can automatically create a `StockMovement` record:

```python
from app.models import StockMovement

async def create_stock_movement(qr_scan: QRCodeScan, session):
    movement = StockMovement(
        product_id=qr_scan.qr_code.product_id,
        warehouse_id=qr_scan.warehouse_id,
        type=qr_scan.action,
        quantity=1,
        quantity_before=inventory.quantity_on_hand,
        quantity_after=inventory.quantity_on_hand,
        reference_type="qr_scan",
        reference_id=qr_scan.id,
        user_id=qr_scan.user_id
    )
    session.add(movement)
    await session.commit()
```

### Linking to Orders and Transfers

QR codes can be linked to orders and transfers for end-to-end tracking:

```python
# In order fulfillment
qr_code = QRCode(
    item_name=f"Order Item - {order.order_number}",
    product_id=order_item.product_id,
    warehouse_id=order.source_warehouse_id,
    metadata={
        "order_id": order.id,
        "order_number": order.order_number,
        "customer_id": order.customer_id
    }
)
```

## Best Practices

1. **Generate QR Codes at Receipt**
   - Create QR codes when items arrive at warehouse
   - Link to incoming shipment/order

2. **Record Every Movement**
   - Scan QR code whenever item location changes
   - Include detailed location and notes

3. **Regular Verification**
   - Periodically scan items to verify location
   - Use verification action for physical audits

4. **Metadata Organization**
   - Store relevant business data in metadata
   - Include supplier, expiry date, quality grade

5. **Batch Operations**
   - Generate QR codes in bulk for efficiency
   - Pre-print labels for new inventory

6. **Archive Old Codes**
   - Mark QR codes as inactive when items are sold/discarded
   - Keep for historical reference

## Troubleshooting

### QR Code Not Generating

- Ensure all required fields (item_name) are filled
- Check database connection
- Verify user authentication token

### Scan Not Recording

- Verify QR code ID exists
- Check user permissions
- Ensure database connection

### Camera Not Working

- Check browser permissions
- Use HTTPS (required for camera access)
- Try manual entry as fallback

### History Not Showing

- Verify QR code has been scanned
- Check pagination limits
- Ensure user has view permissions

## API Authentication

All endpoints require Bearer token authentication:

```javascript
const headers = {
  Authorization: `Bearer ${localStorage.getItem("token")}`,
  "Content-Type": "application/json",
};
```

Ensure your authentication system provides and stores tokens properly.

## Future Enhancements

- [ ] Barcode scanning support
- [ ] Mobile app with offline scanning
- [ ] Advanced analytics and reporting
- [ ] Batch QR code printing
- [ ] Integration with shipping labels
- [ ] Real-time location tracking (GPS)
- [ ] Machine learning for anomaly detection
- [ ] Multi-language support
- [ ] Webhook notifications on scans
- [ ] Custom QR code templates

## Support

For issues or questions about the QR code system, refer to the API documentation or contact the development team.
