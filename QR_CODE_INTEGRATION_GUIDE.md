# QR Code Feature Integration Guide

This guide explains how to integrate the QR code components into your Agriflow application.

## Components Created

Three main components have been created in `src/components/`:

1. **QRCodeGenerator.jsx** - Generate QR codes for inventory items
2. **QRScanner.jsx** - Scan QR codes and record actions
3. **QRCodeHistory.jsx** - View scan history and item tracking

## Integration Steps

### Step 1: Update Main App Component

Edit your `src/App.jsx` to include the QR code components:

```jsx
import { useState } from "react";
import QRCodeGenerator from "./components/QRCodeGenerator";
import QRScanner from "./components/QRScanner";
import QRCodeHistory from "./components/QRCodeHistory";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("scanner");

  return (
    <div className="app">
      <header className="app-header">
        <h1>Agriflow Inventory System</h1>
      </header>

      <nav className="qr-tabs">
        <button
          className={`tab-button ${activeTab === "scanner" ? "active" : ""}`}
          onClick={() => setActiveTab("scanner")}
        >
          📱 Scan QR Code
        </button>
        <button
          className={`tab-button ${activeTab === "generator" ? "active" : ""}`}
          onClick={() => setActiveTab("generator")}
        >
          🏷️ Generate QR Code
        </button>
        <button
          className={`tab-button ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          📋 View History
        </button>
      </nav>

      <main className="app-content">
        {activeTab === "scanner" && <QRScanner />}
        {activeTab === "generator" && <QRCodeGenerator />}
        {activeTab === "history" && <QRCodeHistory />}
      </main>
    </div>
  );
}

export default App;
```

### Step 2: Add Styling to App.css

Add these styles to your `src/App.css`:

```css
.app {
  min-height: 100vh;
  background: #f5f5f5;
}

.app-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  margin: 0;
  font-size: 32px;
}

.qr-tabs {
  display: flex;
  gap: 10px;
  padding: 20px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow-x: auto;
}

.tab-button {
  padding: 12px 20px;
  background: #f0f0f0;
  border: 2px solid transparent;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-button:hover {
  background: #e0e0e0;
}

.tab-button.active {
  background: #4caf50;
  color: white;
  border-color: #45a049;
}

.app-content {
  padding: 20px;
}

@media (max-width: 768px) {
  .app-header h1 {
    font-size: 24px;
  }

  .qr-tabs {
    flex-wrap: wrap;
  }

  .tab-button {
    flex: 1;
    min-width: 150px;
  }
}
```

### Step 3: Configure Backend

Make sure the FastAPI backend is running with the QR code router:

```bash
cd backend_fastapi

# Install dependencies (if not already done)
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL='sqlite+aiosqlite:///./test.db'
export SECRET_KEY='change-me'

# Run the server
uvicorn app.main:app --reload --port 8000
```

### Step 4: Configure Frontend API Base URL

Update your frontend API configuration to point to your backend. Create or update `src/config.js`:

```javascript
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8000/api";

export default {
  API_BASE_URL,
};
```

Update component imports to use the config:

```javascript
import config from "../config";

// In your fetch calls:
const response = await fetch(`${config.API_BASE_URL}/qr-code/generate`, {
  // ... options
});
```

### Step 5: Run the Application

```bash
# Terminal 1: Start Backend
cd backend_fastapi
export DATABASE_URL='sqlite+aiosqlite:///./test.db'
export SECRET_KEY='change-me'
uvicorn app.main:app --reload --port 8000

# Terminal 2: Start Frontend
npm run dev
```

Visit `http://localhost:5173` (or your Vite port) to access the application.

## Database Tables Created

When you run the backend for the first time, these tables are automatically created:

1. **qrcode** - Stores all generated QR codes
2. **qrcodescan** - Stores all scan events

These tables are integrated with your existing inventory system:

- Links to `product` table via `product_id`
- Links to `warehouse` table via `warehouse_id`
- Links to `inventory` table via `inventory_id`
- Links to `user` table via `created_by` and `user_id`

## Environment Variables

### Backend (.env or export)

```
DATABASE_URL=sqlite+aiosqlite:///./test.db
SECRET_KEY=your-secret-key
```

### Frontend (.env.local)

```
VITE_API_URL=http://localhost:8000
```

## Authentication

The components expect authentication tokens to be stored in `localStorage` with the key `token`:

```javascript
// After successful login
localStorage.setItem("token", authToken);

// In components, this is used automatically:
const headers = {
  Authorization: `Bearer ${localStorage.getItem("token")}`,
};
```

Update your authentication flow to store tokens properly.

## API Endpoints Available

All endpoints are prefixed with `/api`:

```
POST   /api/qr-code/generate           - Generate new QR code
GET    /api/qr-code/{id}               - Get QR code info
GET    /api/qr-code/scan/{id}          - Get QR code with history
POST   /api/qr-code/{id}/record-scan   - Record a scan
GET    /api/qr-code/{id}/history       - Get scan history
GET    /api/qr-code/list/all           - List all QR codes
```

## File Structure

After integration, your project structure should look like:

```
agriflow/
├── src/
│   ├── components/
│   │   ├── QRCodeGenerator.jsx
│   │   ├── QRCodeGenerator.css
│   │   ├── QRScanner.jsx
│   │   ├── QRScanner.css
│   │   ├── QRCodeHistory.jsx
│   │   ├── QRCodeHistory.css
│   │   └── ... other components
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── backend_fastapi/
│   ├── app/
│   │   ├── models.py          (updated with QRCode, QRCodeScan)
│   │   ├── main.py            (updated with qr_code router)
│   │   └── routers/
│   │       ├── qr_code.py     (new)
│   │       └── ... other routers
│   ├── requirements.txt        (updated)
│   └── ...
├── QR_CODE_FEATURE_GUIDE.md
├── QR_CODE_INTEGRATION_GUIDE.md (this file)
└── ...
```

## Testing the Integration

1. **Generate a QR Code**
   - Click on "Generate QR Code" tab
   - Fill in item name and details
   - Click "Generate QR Code"
   - Download or print the QR code

2. **Scan a QR Code**
   - Click on "Scan QR Code" tab
   - Manually enter the QR code ID (or use camera)
   - Select an action
   - Enter location and notes
   - Click "Record Scan"

3. **View History**
   - Click on "View History" tab
   - Enter the QR code ID
   - See the complete timeline of scans

## Customization

### Modify Actions

Edit the action options in `QRScanner.jsx`:

```jsx
<select id="action" name="action">
  <option value="received">Received</option>
  <option value="moved">Moved</option>
  <option value="verified">Verified</option>
  {/* Add more actions as needed */}
</select>
```

### Change Colors

Edit the CSS files to customize:

- Primary color: Change `#4CAF50` to your brand color
- Success color: Modify badge colors in `QRCodeHistory.css`
- Timeline colors: Update action colors in `getActionColor()` function

### Customize Form Fields

Add more input fields to the generator form by:

1. Adding to state in `QRCodeGenerator.jsx`
2. Adding form inputs
3. Including in API request payload

## Troubleshooting

### "Cannot GET /api/qr-code" Error

- Ensure backend is running on port 8000
- Check that qr_code router is imported in `main.py`
- Verify the router prefix is `/api`

### "Unauthorized" Error

- Ensure you're logged in and token is stored in localStorage
- Check that the token is valid and not expired
- Update your authentication flow to store tokens correctly

### QR Code Image Not Displaying

- Check browser console for API errors
- Verify the base64 image data is being returned correctly
- Ensure CORS is configured on backend

### Database Tables Not Created

- Run backend with fresh database
- Check database file permissions
- Verify SQLModel table definitions

## Next Steps

1. **Add User Roles** - Restrict QR scanning to specific roles
2. **Add Notifications** - Send alerts when items are moved
3. **Add Reports** - Create analytics dashboards
4. **Mobile App** - Build mobile version with offline scanning
5. **Integrate with Orders** - Link QR codes to customer orders
6. **Add Batch Operations** - Generate QR codes in bulk

## Support Resources

- **QR_CODE_FEATURE_GUIDE.md** - Complete feature documentation
- **Backend API Docs** - Available at `http://localhost:8000/docs`
- **Component Files** - Fully commented source code

## Notes

- Components use React hooks (useState, useEffect, useRef)
- CSS Grid and Flexbox for responsive layouts
- Fetch API for backend communication
- localStorage for token persistence
- No external UI libraries required (vanilla CSS)
