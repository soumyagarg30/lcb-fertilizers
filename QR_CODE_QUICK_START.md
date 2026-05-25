# QR Code Inventory Tracking - Quick Start Guide

## What Was Added

A complete QR code-based inventory tracking system has been implemented with:

### Backend (FastAPI)

- ✅ **New Python dependencies**: `qrcode[pil]`, `python-multipart`
- ✅ **New database models**: `QRCode`, `QRCodeScan` in `app/models.py`
- ✅ **New API router**: `app/routers/qr_code.py` with 6 endpoints
- ✅ **Updated main app**: `app/main.py` includes qr_code router

### Frontend (React)

- ✅ **3 React components** with full styling:
  - `QRCodeGenerator.jsx` - Create QR codes for items
  - `QRScanner.jsx` - Scan codes and track movements
  - `QRCodeHistory.jsx` - View complete scan history
- ✅ **3 CSS files** for responsive styling
- ✅ **2 Comprehensive guides**:
  - `QR_CODE_FEATURE_GUIDE.md` - Complete feature documentation
  - `QR_CODE_INTEGRATION_GUIDE.md` - Integration instructions

## Quick Setup (5 minutes)

### 1. Install Backend Dependencies

```bash
cd backend_fastapi
pip install -r requirements.txt
```

### 2. Start Backend Server

```bash
export DATABASE_URL='sqlite+aiosqlite:///./test.db'
export SECRET_KEY='change-me'
uvicorn app.main:app --reload --port 8000
```

### 3. Add Components to Frontend

Edit `src/App.jsx`:

```jsx
import QRCodeGenerator from "./components/QRCodeGenerator";
import QRScanner from "./components/QRScanner";
import QRCodeHistory from "./components/QRCodeHistory";

function App() {
  const [activeTab, setActiveTab] = useState("scanner");

  return (
    <div>
      <nav>
        <button onClick={() => setActiveTab("scanner")}>Scan</button>
        <button onClick={() => setActiveTab("generator")}>Generate</button>
        <button onClick={() => setActiveTab("history")}>History</button>
      </nav>

      {activeTab === "scanner" && <QRScanner />}
      {activeTab === "generator" && <QRCodeGenerator />}
      {activeTab === "history" && <QRCodeHistory />}
    </div>
  );
}
```

### 4. Start Frontend

```bash
npm run dev
```

## How It Works

### 1. Generate QR Codes

- Create unique QR codes for inventory items
- Attach physical QR code labels to products
- Store item info, batch numbers, warehouse details

### 2. Scan Items

- Scan QR code when item arrives or moves
- Record action: received, moved, verified, packed, shipped, delivered
- Add location and notes automatically

### 3. Track History

- View complete journey of any item
- See when and where it was scanned
- Track who handled it and what action was taken

## API Endpoints

All endpoints require authentication (`Authorization: Bearer {token}`):

| Method | Endpoint                        | Purpose               |
| ------ | ------------------------------- | --------------------- |
| POST   | `/api/qr-code/generate`         | Create new QR code    |
| GET    | `/api/qr-code/{id}`             | Get QR code info      |
| GET    | `/api/qr-code/scan/{id}`        | Get QR code + history |
| POST   | `/api/qr-code/{id}/record-scan` | Record a scan event   |
| GET    | `/api/qr-code/{id}/history`     | Get scan history      |
| GET    | `/api/qr-code/list/all`         | List all QR codes     |

## Database Schema

### QRCode Table

```
- id (UUID, primary key)
- code (string, unique) - QR code identifier
- product_id (string) - Links to Product
- warehouse_id (string) - Links to Warehouse
- inventory_id (string) - Links to Inventory
- batch_number (string) - Item batch
- item_name (string) - Human readable name
- metadata (JSON) - Custom data
- created_by (string) - User who created
- created_at (datetime)
- is_active (boolean)
```

### QRCodeScan Table

```
- id (UUID, primary key)
- qr_code_id (string) - Links to QRCode
- user_id (string) - Links to User
- warehouse_id (string) - Current warehouse
- location (string) - Physical location (e.g., "Shelf A-12")
- action (string) - Action type (received, moved, verified, etc.)
- notes (string) - Additional info
- coordinates (string) - GPS coordinates (optional)
- scanned_at (datetime)
```

## File Locations

```
agriflow/
├── src/components/
│   ├── QRCodeGenerator.jsx
│   ├── QRCodeGenerator.css
│   ├── QRScanner.jsx
│   ├── QRScanner.css
│   ├── QRCodeHistory.jsx
│   └── QRCodeHistory.css
├── backend_fastapi/
│   ├── app/
│   │   ├── models.py (updated)
│   │   ├── main.py (updated)
│   │   └── routers/
│   │       └── qr_code.py (new)
│   └── requirements.txt (updated)
├── QR_CODE_FEATURE_GUIDE.md
└── QR_CODE_INTEGRATION_GUIDE.md
```

## Key Features

✅ **Unique QR Codes** - Each item gets a unique identifier
✅ **Action Tracking** - Log different types of movements
✅ **Location Tracking** - Record where items are stored
✅ **History Timeline** - Complete audit trail of all scans
✅ **User Attribution** - Know who performed each action
✅ **Notes & Comments** - Add context to each scan
✅ **Responsive UI** - Works on desktop and mobile
✅ **No External Libraries** - Pure React and CSS
✅ **Integrated Authentication** - Uses existing auth system
✅ **Batch Support** - Track batches of items

## Workflow Example

### Scenario: Receiving Rice Shipment

1. **Generate** - Create QR code with:
   - Item: "Rice - 50kg bag"
   - Batch: "BATCH_2024_001"
   - Warehouse: "WH_001"

2. **Scan at Receiving** - Record:
   - Action: "Received"
   - Location: "Receiving Dock"
   - Notes: "Shipment from Farm XYZ"

3. **Scan at Storage** - Record:
   - Action: "Moved"
   - Location: "Shelf A-12"
   - Notes: "Stored for bulk sale"

4. **Scan for Order** - Record:
   - Action: "Packed"
   - Location: "Packing Station"
   - Notes: "Packed for Order #12345"

5. **View History** - See complete timeline:
   - 08:00 - Received at Receiving Dock
   - 09:15 - Moved to Shelf A-12
   - 14:30 - Packed for Order #12345

## Next Steps

1. **Test the system** - Generate and scan a QR code
2. **Customize actions** - Add more action types as needed
3. **Add notifications** - Alert when items are moved
4. **Create reports** - Analyze inventory flow
5. **Mobile integration** - Deploy to mobile devices
6. **Batch operations** - Generate multiple QR codes at once

## Troubleshooting

### Backend won't start

```bash
# Check Python version (3.8+)
python --version

# Check if dependencies installed
pip list | grep -i qrcode

# Reset database
rm test.db
```

### Frontend components not showing

- Ensure components are imported correctly
- Check browser console for errors
- Verify API URL is correct
- Check authentication token

### QR codes not scanning

- Try manual entry of QR code ID
- Check QR code ID format
- Verify item exists in database
- Check user permissions

## API Documentation

Full API documentation available at:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

After starting the backend, visit these URLs to explore all endpoints.

## Authentication

The system uses JWT tokens. Make sure:

1. User is logged in
2. Token is stored in `localStorage.getItem('token')`
3. Token is valid (not expired)
4. User has appropriate role/permissions

## Support

For detailed information:

- **Feature Guide**: Read `QR_CODE_FEATURE_GUIDE.md`
- **Integration Guide**: Read `QR_CODE_INTEGRATION_GUIDE.md`
- **API Docs**: Open Swagger UI at `/docs`
- **Component Code**: Fully commented source in `src/components/`

## Success Checklist

- [ ] Backend dependencies installed
- [ ] Backend server running on port 8000
- [ ] QR code router included in main.py
- [ ] Database tables created (QRCode, QRCodeScan)
- [ ] Components added to frontend
- [ ] Frontend running on port 5173
- [ ] Can generate a QR code
- [ ] Can scan/record a QR code
- [ ] Can view scan history
- [ ] Authentication working

## Ready to Go! 🚀

Your QR code inventory tracking system is ready. Start by:

1. Generating a test QR code
2. Recording a scan
3. Viewing the history

Then integrate into your main application workflow!
