import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from "recharts";

// ─── Google OAuth Config ──────────────────────────────────────────────────────
// Use Vite environment variable `VITE_GOOGLE_CLIENT_ID` when provided.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "918832602642-k97oc05l15eh8bhqmck0odi9ku713e2s.apps.googleusercontent.com";

// ─── JWT Utilities ────────────────────────────────────────────────────────────

function base64url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function createJWT(payload) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 3600000 }));
  const sig = base64url(`${header}.${body}.agriflow-secret`);
  return `${header}.${body}.${sig}`;
}
function parseJWT(token) {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(decodeURIComponent(escape(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))));
  } catch { return null; }
}
function isTokenValid(token) {
  const p = parseJWT(token);
  return p && p.exp > Date.now();
}

// ─── API Helper ──────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";
async function apiFetch(path, opts = {}) {
  const url = `${API_BASE}${path}`;
  const headers = opts.headers || {};
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json", ...headers }, ...opts });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw { status: res.status, data };
    return data;
  } catch (err) {
    throw err;
  }
}

// ─── Mock User Store ───────────────────────────────────────────────────────────

const USERS_KEY = "agriflow_users";
const TOKEN_KEY = "agriflow_token";

function getUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const defaults = [
    { id: "u1", name: "Admin User", email: "admin@agriflow.in", password: "admin123", role: "superadmin", avatar: "AU", active: true, createdAt: "2024-01-01" },
    { id: "u2", name: "Sales Manager", email: "sales@agriflow.in", password: "sales123", role: "manager", avatar: "SM", active: true, createdAt: "2024-02-01" },
    { id: "u3", name: "Warehouse Staff", email: "warehouse@agriflow.in", password: "ware123", role: "staff", avatar: "WS", active: true, createdAt: "2024-03-01" },
  ];
  localStorage.setItem(USERS_KEY, JSON.stringify(defaults));
  return defaults;
}
function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

// ─── Seed Data ─────────────────────────────────────────────────────────────────

const ORDERS_KEY = "agriflow_orders";
const STOCK_KEY = "agriflow_stock";
const CUSTOMERS_KEY = "agriflow_customers";
const DISTRIBUTORS_KEY = "agriflow_distributors";

const seedOrders = [
  { id: "ORD-2841", customer: "Ravi Farms", product: "Urea 46%", qty: 20, amount: 6400, status: "Delivered", date: "2024-08-12", dist: "AgroServe Delhi", tracking: "TRK-9281" },
  { id: "ORD-2842", customer: "Green Valley Agro", product: "DAP Fertilizer", qty: 10, amount: 5800, status: "In Transit", date: "2024-08-13", dist: "FarmDirect UP", tracking: "TRK-9282" },
  { id: "ORD-2843", customer: "Patel Seeds", product: "Bio NPK Mix", qty: 50, amount: 21000, status: "Packed", date: "2024-08-14", dist: "AgroServe Delhi", tracking: "TRK-9283" },
  { id: "ORD-2844", customer: "Sunrise Horticulture", product: "Vermicompost", qty: 30, amount: 5400, status: "Confirmed", date: "2024-08-14", dist: "Punjab Agri", tracking: "TRK-9284" },
  { id: "ORD-2845", customer: "Kumar Agriculture", product: "Zinc Sulphate", qty: 8, amount: 3120, status: "Pending", date: "2024-08-15", dist: "-", tracking: "TRK-9285" },
  { id: "ORD-2846", customer: "Haryana Organics", product: "Neem Cake Organic", qty: 40, amount: 8400, status: "Cancelled", date: "2024-08-15", dist: "-", tracking: "TRK-9286" },
  { id: "ORD-2847", customer: "MP Farmtech", product: "Chlorpyrifos 20%", qty: 15, amount: 10050, status: "Shipped", date: "2024-08-15", dist: "AgroServe Delhi", tracking: "TRK-9287" },
];

const seedStock = [
  { id: "s1", name: "Urea 46%", stock: 840, min: 200, category: "Chemical", sku: "CH-001", price: 320, weight: "50kg", expiry: "Dec 2025", status: "ok" },
  { id: "s2", name: "DAP Fertilizer", stock: 120, min: 150, category: "Chemical", sku: "CH-002", price: 580, weight: "50kg", expiry: "Nov 2025", status: "low" },
  { id: "s3", name: "Neem Cake Organic", stock: 0, min: 100, category: "Organic", sku: "OR-001", price: 210, weight: "25kg", expiry: "Mar 2026", status: "out" },
  { id: "s4", name: "Vermicompost", stock: 560, min: 100, category: "Organic", sku: "OR-002", price: 180, weight: "30kg", expiry: "Jun 2026", status: "ok" },
  { id: "s5", name: "Bio NPK Mix", stock: 89, min: 120, category: "Bio", sku: "BIO-001", price: 420, weight: "10kg", expiry: "Jan 2026", status: "low" },
  { id: "s6", name: "Zinc Sulphate", stock: 310, min: 80, category: "Micronutrients", sku: "MN-001", price: 390, weight: "25kg", expiry: "Sep 2026", status: "ok" },
  { id: "s7", name: "Copper Sulphate", stock: 45, min: 60, category: "Micronutrients", sku: "MN-002", price: 450, weight: "25kg", expiry: "Aug 2026", status: "low" },
  { id: "s8", name: "Chlorpyrifos 20%", stock: 220, min: 80, category: "Pesticides", sku: "PS-001", price: 670, weight: "5L", expiry: "Oct 2025", status: "ok" },
];

const seedCustomers = [
  { id: "C001", name: "Ravi Farms", location: "Delhi", orders: 18, totalSpent: 92400, lastOrder: "Aug 12", tier: "Gold" },
  { id: "C002", name: "Green Valley Agro", location: "UP", orders: 12, totalSpent: 61200, lastOrder: "Aug 13", tier: "Silver" },
  { id: "C003", name: "Patel Seeds", location: "Gujarat", orders: 24, totalSpent: 138000, lastOrder: "Aug 14", tier: "Platinum" },
  { id: "C004", name: "Sunrise Horticulture", location: "Punjab", orders: 9, totalSpent: 38700, lastOrder: "Aug 14", tier: "Silver" },
  { id: "C005", name: "Kumar Agriculture", location: "Haryana", orders: 6, totalSpent: 21600, lastOrder: "Aug 15", tier: "Bronze" },
  { id: "C006", name: "MP Farmtech", location: "MP", orders: 15, totalSpent: 84500, lastOrder: "Aug 15", tier: "Gold" },
];

const seedDistributors = [
  { id: "D001", name: "AgroServe Delhi", territory: "Delhi NCR", orders: 147, revenue: 284000, commission: 8520, rating: 4.8, status: "Active" },
  { id: "D002", name: "FarmDirect UP", territory: "Uttar Pradesh", orders: 112, revenue: 198000, commission: 5940, rating: 4.5, status: "Active" },
  { id: "D003", name: "Punjab Agri", territory: "Punjab & Haryana", orders: 98, revenue: 231000, commission: 6930, rating: 4.7, status: "Active" },
  { id: "D004", name: "Rajasthan FarmCo", territory: "Rajasthan", orders: 63, revenue: 142000, commission: 4260, rating: 4.2, status: "Active" },
  { id: "D005", name: "Gujarat Seeds", territory: "Gujarat", orders: 41, revenue: 89000, commission: 2670, rating: 3.9, status: "Inactive" },
];

function getData(key, seed) {
  try { const r = localStorage.getItem(key); if (r) return JSON.parse(r); } catch {}
  localStorage.setItem(key, JSON.stringify(seed));
  return seed;
}
function setData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

const salesData = [
  { month: "Jan", revenue: 42000, orders: 128, target: 40000 },
  { month: "Feb", revenue: 38000, orders: 112, target: 40000 },
  { month: "Mar", revenue: 61000, orders: 187, target: 55000 },
  { month: "Apr", revenue: 55000, orders: 164, target: 55000 },
  { month: "May", revenue: 72000, orders: 218, target: 65000 },
  { month: "Jun", revenue: 68000, orders: 203, target: 65000 },
  { month: "Jul", revenue: 84000, orders: 251, target: 75000 },
  { month: "Aug", revenue: 91000, orders: 274, target: 80000 },
];

const categoryData = [
  { name: "Organic", value: 34, color: "#4ade80" },
  { name: "Chemical", value: 28, color: "#facc15" },
  { name: "Bio", value: 19, color: "#60a5fa" },
  { name: "Micronutrients", value: 12, color: "#fb923c" },
  { name: "Pesticides", value: 7, color: "#94a3b8" },
];

const weeklyDelivery = [
  { day: "Mon", delivered: 18, failed: 2 },
  { day: "Tue", delivered: 24, failed: 1 },
  { day: "Wed", delivered: 19, failed: 3 },
  { day: "Thu", delivered: 31, failed: 0 },
  { day: "Fri", delivered: 28, failed: 2 },
  { day: "Sat", delivered: 22, failed: 1 },
  { day: "Sun", delivered: 14, failed: 0 },
];

const trackingHistory = {
  "TRK-9282": [
    { time: "Aug 13, 9:00 AM", status: "Order Received", loc: "Delhi Warehouse", done: true },
    { time: "Aug 13, 2:30 PM", status: "Processing", loc: "Delhi Warehouse", done: true },
    { time: "Aug 14, 8:00 AM", status: "Dispatched", loc: "Delhi Warehouse", done: true },
    { time: "Aug 14, 6:00 PM", status: "In Transit", loc: "Agra Highway", done: true },
    { time: "Aug 15, Est.", status: "Out for Delivery", loc: "Lucknow Hub", done: false },
    { time: "Aug 16, Est.", status: "Delivered", loc: "Customer Address", done: false },
  ],
};

// ─── Styles & Utilities ────────────────────────────────────────────────────────

const C = {
  bg: "#f7fbf5", surface: "#ffffff", border: "#e4ede3",
  primary: "#1a4d2e", accent: "#22c55e", accentLight: "#dcfce7",
  text: "#0f1f0f", muted: "#6b7c69", faint: "#9ca89a",
  danger: "#dc2626", dangerLight: "#fee2e2",
  warning: "#d97706", warningLight: "#fef3c7",
  info: "#2563eb", infoLight: "#dbeafe",
};

const statusColors = {
  Delivered: { background: "#dcfce7", color: "#166534" },
  "In Transit": { background: "#dbeafe", color: "#1e40af" },
  Shipped: { background: "#e0f2fe", color: "#0369a1" },
  Packed: { background: "#fef9c3", color: "#854d0e" },
  Confirmed: { background: "#f3e8ff", color: "#6b21a8" },
  Pending: { background: "#f1f5f9", color: "#475569" },
  Cancelled: { background: "#fee2e2", color: "#991b1b" },
};
const stockColors = {
  ok: { background: "#dcfce7", color: "#166534", label: "In Stock" },
  low: { background: "#fef9c3", color: "#854d0e", label: "Low Stock" },
  out: { background: "#fee2e2", color: "#991b1b", label: "Out of Stock" },
};
const tierColors = {
  Platinum: { background: "#e0f2fe", color: "#0369a1" },
  Gold: { background: "#fef9c3", color: "#854d0e" },
  Silver: { background: "#f1f5f9", color: "#475569" },
  Bronze: { background: "#fef3c7", color: "#92400e" },
};
const roleColors = {
  superadmin: { background: "#fce7f3", color: "#9d174d" },
  manager: { background: "#ede9fe", color: "#5b21b6" },
  staff: { background: "#dbeafe", color: "#1e40af" },
};

function fmt(n) { return "₹" + Number(n).toLocaleString("en-IN"); }
function uid() { return Math.random().toString(36).slice(2, 9); }
function getStockStatus(stock, min) {
  if (stock === 0) return "out";
  if (stock < min) return "low";
  return "ok";
}

function Badge({ children, style }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20, whiteSpace: "nowrap", ...style }}>
      {children}
    </span>
  );
}

function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, backdropFilter: "blur(2px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.surface, borderRadius: 16, padding: "28px 32px",
        width, maxWidth: "95vw", boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        border: `1px solid ${C.border}`, maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: C.muted, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", disabled }) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
      style={{
        width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
        fontSize: 13, color: C.text, outline: "none", background: disabled ? "#f9fafb" : C.surface,
        boxSizing: "border-box", fontFamily: "inherit",
      }}
    />
  );
}

// ─── Location Select (searchable) ────────────────────────────────────────────
const LOCATIONS = ["Delhi", "UP", "Punjab", "Haryana", "Gujarat", "MP", "Rajasthan", "Karnataka", "Maharashtra", "Tamil Nadu"];
function LocationSelect({ value, onChange, placeholder = "Select location" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const items = LOCATIONS.filter(l => l.toLowerCase().includes(q.toLowerCase()));

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <div role="button" tabIndex={0} onKeyDown={(e)=>{ if(e.key==="Enter") setOpen(s=>!s); }} onClick={() => setOpen(s => !s)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, cursor: "pointer", minHeight: 40, boxSizing: "border-box" }}>
        <div style={{ flex: 1, color: value ? C.text : C.faint }}>{value || placeholder}</div>
        <div style={{ width: 18, height: 18, borderRadius: 6, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: C.muted, background: C.accentLight }}>▾</div>
      </div>

      {open && (
        <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 8px)", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.08)", zIndex: 9999 }}>
          <div style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}>
            <input ref={searchRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search locations..."
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, fontSize: 13, boxSizing: "border-box", background: C.surface }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {items.length ? items.map((loc) => (
              <div key={loc} onClick={() => { onChange(loc); setOpen(false); setQ(""); }}
                style={{ padding: "10px 12px", cursor: "pointer", fontSize: 13, color: C.text, display: "flex", alignItems: "center", justifyContent: "space-between" }}
                onMouseEnter={e => e.currentTarget.style.background = C.accentLight}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <div>{loc}</div>
                {value === loc && <div style={{ fontSize: 12, color: C.primary, fontWeight: 700 }}>✓</div>}
              </div>
            )) : (
              <div style={{ padding: 12, color: C.faint }}>No locations</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Select({ value, onChange, children }) {
  return (
    <select value={value} onChange={onChange} style={{
      width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
      fontSize: 13, color: C.text, outline: "none", background: C.surface,
      boxSizing: "border-box", fontFamily: "inherit", cursor: "pointer",
    }}>
      {children}
    </select>
  );
}

function Btn({ onClick, children, variant = "primary", size = "md", disabled }) {
  const styles = {
    primary: { background: C.accent, color: "#fff", border: "none" },
    secondary: { background: C.surface, color: C.text, border: `1px solid ${C.border}` },
    danger: { background: C.dangerLight, color: C.danger, border: `1px solid #fecaca` },
    success: { background: C.accentLight, color: "#166534", border: `1px solid #bbf7d0` },
    info: { background: C.infoLight, color: C.info, border: `1px solid #bfdbfe` },
    ghost: { background: "transparent", color: C.muted, border: `1px solid ${C.border}` },
  };
  const sizes = { sm: "5px 10px", md: "8px 16px", lg: "10px 22px" };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: sizes[size], borderRadius: 8, fontSize: size === "sm" ? 11 : 13,
      fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: "inherit", transition: "opacity 0.15s", opacity: disabled ? 0.5 : 1,
      ...styles[variant],
    }}>{children}</button>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  const colors = { success: { bg: "#dcfce7", text: "#166534", border: "#bbf7d0" }, error: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" }, info: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" } };
  const c = colors[type] || colors.info;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, background: c.bg,
      border: `1px solid ${c.border}`, color: c.text,
      borderRadius: 10, padding: "12px 18px", fontSize: 13, fontWeight: 600,
      boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999,
      display: "flex", alignItems: "center", gap: 10,
      animation: "slideIn 0.2s ease",
    }}>
      {message}
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: c.text, fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}

// ─── Auth Context ──────────────────────────────────────────────────────────────

function useAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken && isTokenValid(savedToken)) {
      const payload = parseJWT(savedToken);
      const users = getUsers();
      const user = users.find(u => u.id === payload.userId);
      if (user && user.active) { setCurrentUser(user); setToken(savedToken); }
      else localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  useEffect(() => {
    const onServerLogin = (e) => {
      const { accessToken, user } = e.detail || {};
      if (accessToken && user) setServerSession(accessToken, user);
    };
    window.addEventListener("agriflow_server_login", onServerLogin);
    return () => window.removeEventListener("agriflow_server_login", onServerLogin);
  }, []);

  // Accept server-supplied session (access token + user)
  const setServerSession = (accessToken, user) => {
    try { localStorage.setItem(TOKEN_KEY, accessToken); } catch {}
    setToken(accessToken); setCurrentUser(user);
  };

  const login = (email, password) => {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password && u.active);
    if (!user) return { success: false, error: "Invalid email or password" };
    const jwt = createJWT({ userId: user.id, role: user.role });
    localStorage.setItem(TOKEN_KEY, jwt);
    setToken(jwt); setCurrentUser(user);
    return { success: true };
  };

  // Accepts decoded Google profile: { email, name, picture, sub }
  const googleLogin = (googleProfile) => {
    // Keep legacy local behavior for when backend isn't available.
    if (!googleProfile || googleProfile._fromServer) {
      // server flow handled via setServerSession
      return { success: true };
    }
    const users = getUsers();
    let user = users.find(u => u.email === googleProfile.email);
    if (!user) {
      const displayName = googleProfile.name || googleProfile.email.split("@")[0];
      user = {
        id: "u" + uid(),
        name: displayName,
        email: googleProfile.email,
        password: "",
        role: "staff",
        avatar: displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(),
        active: true,
        createdAt: new Date().toISOString().slice(0, 10),
        googleAuth: true,
        picture: googleProfile.picture || null,
      };
      users.push(user); saveUsers(users);
    }
    if (!user.active) return { success: false, error: "Account is disabled. Contact your administrator." };
    const jwt = createJWT({ userId: user.id, role: user.role });
    localStorage.setItem(TOKEN_KEY, jwt); setToken(jwt); setCurrentUser(user);
    return { success: true };
  };

  const logout = () => { localStorage.removeItem(TOKEN_KEY); setCurrentUser(null); setToken(null); };

  return { currentUser, token, login, logout, googleLogin };
}

// ─── Google JWT decoder (no library needed) ───────────────────────────────────
function decodeGoogleJWT(token) {
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return { email: decoded.email, name: decoded.name, picture: decoded.picture, sub: decoded.sub };
  } catch { return null; }
}

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage({ onLogin, onGoogleLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const googleBtnRef = useRef(null);

  const handleGoogleLogin = () => {
    setError("Google sign-in is available via the button below. Please use the Google sign-in control or continue with email.");
  };

  // Load Google Identity Services script
  useEffect(() => {
    if (document.getElementById("gis-script")) {
      if (window.google?.accounts) { initGIS(); return; }
    }
    const script = document.createElement("script");
    script.id = "gis-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => initGIS();
    script.onerror = () => setError("Failed to load Google Sign-In. Check your network.");
    document.head.appendChild(script);

    return () => { /* keep script loaded */ };
  }, []);

  const initGIS = () => {
    if (!window.google?.accounts?.id) return;
    if (window._agriflow_gis_initialized) { setGisReady(true); return; }
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCallback,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
    window._agriflow_gis_initialized = true;
    setGisReady(true);
  };

  // Re-render the Google button when ready or mode changes
  useEffect(() => {
    if (!gisReady || !googleBtnRef.current) return;
    googleBtnRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(googleBtnRef.current, {
      theme: "outline",
      size: "large",
      width: 356,
      text: "continue_with",
      shape: "rectangular",
      logo_alignment: "center",
    });
  }, [gisReady, mode]);

  const handleGoogleCallback = (response) => {
    if (!response?.credential) {
      setError("Google sign-in failed. Please try again.");
      return;
    }
    // Try server-side verification first
    (async () => {
      try {
        const r = await fetch((import.meta.env.VITE_API_BASE || "http://localhost:8000") + "/api/auth/google", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ credential: response.credential })
        });
        const data = await r.json();
        if (r.ok && data.success && data.accessToken) {
          // Use server session token and user
          if (onGoogleLogin && typeof onGoogleLogin === "function") {
            // onGoogleLogin is provided by App -> useAuth.googleLogin; we will call setServerSession via a property on it if present
          }
          // store token and set user in app via a custom event
          window.dispatchEvent(new CustomEvent("agriflow_server_login", { detail: { accessToken: data.accessToken, user: data.user } }));
        } else {
          // fallback to client decode
          const profile = decodeGoogleJWT(response.credential);
          if (!profile?.email) { setError("Could not read Google account info."); return; }
          const result = onGoogleLogin(profile);
          if (!result.success) setError(result.error);
        }
      } catch (err) {
        // fallback to client decode
        const profile = decodeGoogleJWT(response.credential);
        if (!profile?.email) { setError("Could not read Google account info."); return; }
        const result = onGoogleLogin(profile);
        if (!result.success) setError(result.error);
      }
    })();
  };

  const handleSubmit = () => {
    setError("");
    if (!email || !password) { setError("Please fill in all fields"); return; }
    if (mode === "signup") {
      if (!name.trim()) { setError("Name is required"); return; }
      if (password !== confirmPassword) { setError("Passwords do not match"); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
      const users = getUsers();
      if (users.find(u => u.email === email)) { setError("Email already registered"); return; }
      const newUser = { id: "u" + uid(), name, email, password, role: "staff", avatar: name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(), active: true, createdAt: new Date().toISOString().slice(0, 10) };
      users.push(newUser); saveUsers(users);
      const result = onLogin(email, password);
      if (!result.success) setError(result.error);
    } else {
      setLoading(true);
      setTimeout(() => {
        const result = onLogin(email, password);
        if (!result.success) setError(result.error);
        setLoading(false);
      }, 500);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      background: "linear-gradient(135deg, #0f2910 0%, #1a4d2e 50%, #0f2910 100%)",
      alignItems: "stretch",
    }}>
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        input:focus { border-color: #22c55e !important; box-shadow: 0 0 0 3px rgba(34,197,94,0.12); }
        button:hover { opacity: 0.88; }
      `}</style>

      {/* Left panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px 32px", color: "#fff", textAlign: "center" }}>
        <h1 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1.5, marginBottom: 20 }}>
          Manage your<br />
          <span style={{ color: "#4ade80" }}>agri-business</span><br />
          with precision.
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)", lineHeight: 1.7, maxWidth: 380 }}>
          Complete ERP for fertilizer distribution — orders, inventory, tracking, analytics, and distributor management in one platform.
        </p>
        <div style={{ marginTop: 48, display: "flex", gap: 28 }}>
          {[["247", "Active Orders"], ["94%", "Delivery Rate"], ["5.1L", "Monthly Revenue"]].map(([v, l]) => (
            <div key={l}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#4ade80" }}>{v}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ width: 460, background: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 32px" }}>
        <div style={{ animation: "fadeUp 0.4s ease", maxWidth: 380, width: "100%", margin: "0 auto", textAlign: "left" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 4 }}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 28 }}>
            {mode === "login" ? "Sign in to your AgriFlow account" : "Set up your AgriFlow account"}
          </p>

          {/* Google Login - show fallback button only until GIS is ready to avoid duplicate controls */}
          <div style={{ marginBottom: 18 }}>
            {!gisReady && (
              <button onClick={handleGoogleLogin} disabled={loading} style={{
                width: "100%", padding: "11px", borderRadius: 10, border: `1px solid ${C.border}`,
                background: C.surface, cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.text,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                fontFamily: "inherit", transition: "all 0.15s",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            )}
            <div ref={googleBtnRef} style={{ width: "100%", marginTop: gisReady ? 0 : 12, minHeight: 46 }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ fontSize: 12, color: C.faint }}>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          {mode === "signup" && (
            <Field label="Full Name">
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
            </Field>
          )}

          <Field label="Email Address">
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@agriflow.in" />
          </Field>

          <Field label="Password">
            <div style={{ position: "relative" }}>
              <Input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
              <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 12, fontFamily: "inherit" }}>
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
          </Field>

          {mode === "signup" && (
            <Field label="Confirm Password">
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm password" />
            </Field>
          )}

          {error && (
            <div style={{ background: C.dangerLight, border: `1px solid #fecaca`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.danger, marginBottom: 14 }}>
              {error}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{
            width: "100%", padding: "12px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, #22c55e, #16a34a)`,
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "inherit", marginBottom: 14, opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "Signing in..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <div style={{ textAlign: "center", fontSize: 13, color: C.muted }}>
            {mode === "login" ? (
              <>Don't have an account?{" "}
                <span onClick={() => { setMode("signup"); setError(""); }} style={{ color: C.accent, fontWeight: 700, cursor: "pointer" }}>Sign up</span>
              </>
            ) : (
              <>Already have an account?{" "}
                <span onClick={() => { setMode("login"); setError(""); }} style={{ color: C.accent, fontWeight: 700, cursor: "pointer" }}>Sign in</span>
              </>
            )}
          </div>

          {mode === "login" && (
            <div style={{ marginTop: 24, padding: "14px", background: "#f0fdf4", borderRadius: 10, border: `1px solid #bbf7d0` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Demo Credentials</div>
              {[["admin@agriflow.in", "admin123", "Super Admin"], ["sales@agriflow.in", "sales123", "Manager"]].map(([e, p, r]) => (
                <div key={e} onClick={() => { setEmail(e); setPassword(p); }} style={{ fontSize: 11, color: "#4a7c59", cursor: "pointer", marginBottom: 3, display: "flex", justifyContent: "space-between" }}>
                  <span>{e}</span><span style={{ color: C.faint }}>{r}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ active, setActive, collapsed, currentUser }) {
  const allNav = [
    { section: "Main" },
    { id: "dashboard", label: "Dashboard", roles: ["superadmin", "manager", "staff"] },
    { id: "orders", label: "Orders", badge: 3, roles: ["superadmin", "manager", "staff"] },
    { id: "tracking", label: "Track Shipment", roles: ["superadmin", "manager", "staff"] },
    { section: "Catalog" },
    { id: "products", label: "Products", roles: ["superadmin", "manager"] },
    { id: "inventory", label: "Inventory", roles: ["superadmin", "manager", "staff"] },
    { section: "Network" },
    { id: "distributors", label: "Distributors", roles: ["superadmin", "manager"] },
    { id: "customers", label: "Customers", roles: ["superadmin", "manager"] },
    { section: "Insights" },
    { id: "reports", label: "Reports & Analytics", roles: ["superadmin", "manager"] },
    { section: "Administration" },
    { id: "admin", label: "Admin Panel", roles: ["superadmin"] },
    { section: "System" },
    { id: "settings", label: "Settings", roles: ["superadmin"] },
  ];

  const nav = allNav.filter(item => !item.roles || item.roles.includes(currentUser?.role));

  const icons = { dashboard: "D", orders: "O", tracking: "T", products: "P", inventory: "I", distributors: "N", customers: "C", reports: "R", admin: "A", settings: "S" };

  return (
    <div style={{ width: collapsed ? 58 : 218, background: "linear-gradient(160deg, #1a4d2e 0%, #0f2910 100%)", display: "flex", flexDirection: "column", transition: "width 0.25s", overflow: "hidden", flexShrink: 0 }}>
      <div style={{ padding: "18px 14px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#4ade80", flexShrink: 0 }}>A</div>
          {!collapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#fff", letterSpacing: -0.3 }}>AgriFlow</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: 1.2, textTransform: "uppercase" }}>ERP System</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
        {nav.map((item, i) => {
          if (item.section) {
            return !collapsed ? (
              <div key={i} style={{ fontSize: 9.5, letterSpacing: 1.3, color: "rgba(255,255,255,0.25)", padding: "12px 14px 3px", textTransform: "uppercase", fontWeight: 700 }}>{item.section}</div>
            ) : <div key={i} style={{ height: 6 }} />;
          }
          const isActive = active === item.id;
          return (
            <div key={item.id} onClick={() => setActive(item.id)} style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: collapsed ? "9px 0" : "8px 14px",
              cursor: "pointer",
              background: isActive ? "rgba(74,222,128,0.14)" : "transparent",
              borderLeft: `2px solid ${isActive ? "#4ade80" : "transparent"}`,
              transition: "all 0.12s",
              justifyContent: collapsed ? "center" : "flex-start",
              margin: "1px 0",
            }}>
              <span style={{ width: 22, height: 22, borderRadius: 6, background: isActive ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: isActive ? "#4ade80" : "rgba(255,255,255,0.4)", flexShrink: 0 }}>
                {icons[item.id] || "•"}
              </span>
              {!collapsed && (
                <span style={{ flex: 1, fontSize: 12.5, color: isActive ? "#fff" : "rgba(255,255,255,0.58)", fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: 9 }}>{item.badge}</span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
              {currentUser?.avatar || "?"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser?.name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "capitalize" }}>{currentUser?.role}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

function TopBar({ active, collapsed, setCollapsed, onLogout, currentUser, selectedLocation, setSelectedLocation }) {
  const titles = { dashboard: "Dashboard", orders: "Order Management", tracking: "Shipment Tracking", products: "Product Catalog", inventory: "Inventory", distributors: "Distributor Network", customers: "Customers", reports: "Reports & Analytics", admin: "Admin Panel", settings: "Settings" };
  const [userMenu, setUserMenu] = useState(false);

  return (
    <div style={{ height: 54, background: C.surface, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0, position: "relative", zIndex: 50 }}>
      <style>{`@keyframes slideIn { from { opacity:0;transform:translateX(20px); } to { opacity:1;transform:translateX(0); } }`}</style>
      <button onClick={() => setCollapsed(!collapsed)} style={{ width: 30, height: 30, border: `1px solid ${C.border}`, borderRadius: 7, background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: C.muted }}>☰</button>
      <h1 style={{ flex: 1, fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: -0.3 }}>{titles[active]}</h1>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 220 }}>
          <LocationSelect value={selectedLocation} onChange={setSelectedLocation} placeholder="Pick location" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: `1px solid #bbf7d0`, borderRadius: 8, padding: "6px 12px", width: 260 }}>
          <span style={{ fontSize: 12, color: C.muted }}>Search</span>
          <input placeholder="Search anything..." style={{ border: "none", background: "none", outline: "none", fontSize: 12, color: C.text, width: "100%", fontFamily: "inherit" }} />
        </div>
      </div>
      <div style={{ position: "relative" }}>
        <button onClick={() => setUserMenu(!userMenu)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "none", cursor: "pointer" }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "#fff" }}>{currentUser?.avatar}</div>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{currentUser?.name}</span>
          <span style={{ fontSize: 10, color: C.faint }}>v</span>
        </button>
        {userMenu && (
          <div onClick={() => setUserMenu(false)} style={{ position: "absolute", top: 40, right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", minWidth: 180, zIndex: 100, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{currentUser?.name}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{currentUser?.email}</div>
              <Badge style={{ ...roleColors[currentUser?.role], marginTop: 4, display: "inline-block" }}>{currentUser?.role}</Badge>
            </div>
            <button onClick={onLogout} style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.danger, textAlign: "left", fontFamily: "inherit", fontWeight: 600 }}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ orders }) {
  const totalRevenue = orders.filter(o => o.status === "Delivered").reduce((s, o) => s + o.amount, 0);
  const activeOrders = orders.filter(o => !["Delivered", "Cancelled"].includes(o.status)).length;
  const stock = getData(STOCK_KEY, seedStock);
  const lowStock = stock.filter(s => s.status !== "ok").length;

  return (
    <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Total Revenue", value: fmt(totalRevenue), sub: "Delivered orders", color: "#16a34a" },
          { label: "Active Orders", value: activeOrders, sub: "In progress", color: C.info },
          { label: "Low Stock Items", value: lowStock, sub: "Needs attention", color: C.warning },
          { label: "Delivered Today", value: 38, sub: "94% success rate", color: "#0891b2" },
        ].map((s, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.faint, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: -1, lineHeight: 1, marginBottom: 5 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 20 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Revenue vs Target</div>
          <div style={{ fontSize: 12, color: C.faint, marginBottom: 14 }}>Monthly performance</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.faint }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.faint }} axisLine={false} tickLine={false} tickFormatter={v => "₹" + v / 1000 + "k"} />
              <Tooltip formatter={v => [fmt(v)]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
              <Area type="monotone" dataKey="target" stroke="#e5e7eb" strokeDasharray="4 4" fill="none" strokeWidth={2} />
              <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2.5} fill="url(#rg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Sales by Category</div>
          <div style={{ fontSize: 12, color: C.faint, marginBottom: 14 }}>Product distribution</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {categoryData.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Pie>
              <Tooltip formatter={v => [v + "%"]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {categoryData.map((c, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: c.color, display: "inline-block" }} />
                {c.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Recent Orders</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Order ID", "Customer", "Amount", "Status"].map(h => (
              <th key={h} style={{ textAlign: "left", fontSize: 10.5, fontWeight: 700, color: C.faint, padding: "4px 0 10px", borderBottom: `1px solid ${C.border}`, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
            ))}</tr></thead>
            <tbody>{orders.slice(0, 5).map(o => (
              <tr key={o.id} style={{ borderBottom: `1px solid #f9fafb` }}>
                <td style={{ padding: "8px 0", fontSize: 12, fontWeight: 700, color: C.accent }}>{o.id}</td>
                <td style={{ padding: "8px 0", fontSize: 12, color: C.muted }}>{o.customer}</td>
                <td style={{ padding: "8px 0", fontSize: 12, fontWeight: 700, color: C.text }}>{fmt(o.amount)}</td>
                <td style={{ padding: "8px 0" }}><Badge style={statusColors[o.status]}>{o.status}</Badge></td>
              </tr>
            ))}</tbody>
          </table>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Weekly Deliveries</div>
          <div style={{ fontSize: 12, color: C.faint, marginBottom: 14 }}>Delivered vs failed</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyDelivery} barSize={11}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.faint }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.faint }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
              <Bar dataKey="delivered" fill="#4ade80" radius={[4, 4, 0, 0]} />
              <Bar dataKey="failed" fill="#fca5a5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ─── Orders Page ──────────────────────────────────────────────────────────────

function OrdersPage({ showToast }) {
  const [orders, setOrders] = useState(() => getData(ORDERS_KEY, seedOrders));
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(null); // null | "new" | "view" | "edit"
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ customer: "", product: "", qty: "", amount: "", status: "Pending", dist: "-", date: new Date().toISOString().slice(0, 10) });

  const statuses = ["All", "Pending", "Confirmed", "Packed", "Shipped", "In Transit", "Delivered", "Cancelled"];
  const filtered = filter === "All" ? orders : orders.filter(o => o.status === filter);

  const save = (data) => { setData(ORDERS_KEY, data); setOrders(data); };

  const openNew = () => { setForm({ customer: "", product: "", qty: "", amount: "", status: "Pending", dist: "-", date: new Date().toISOString().slice(0, 10) }); setModal("new"); };
  const openEdit = (o) => { setSelected(o); setForm({ ...o }); setModal("edit"); };
  const openView = (o) => { setSelected(o); setModal("view"); };

  const handleSave = () => {
    if (!form.customer || !form.product || !form.qty) { showToast("Please fill required fields", "error"); return; }
    const updated = [...orders];
    if (modal === "new") {
      const newOrder = { ...form, id: "ORD-" + Math.floor(Math.random() * 9000 + 1000), tracking: "TRK-" + Math.floor(Math.random() * 9000 + 1000), qty: +form.qty, amount: +form.amount };
      updated.unshift(newOrder);
      showToast("Order created successfully", "success");
    } else {
      const idx = updated.findIndex(o => o.id === selected.id);
      updated[idx] = { ...selected, ...form, qty: +form.qty, amount: +form.amount };
      showToast("Order updated", "success");
    }
    save(updated); setModal(null);
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this order?")) return;
    const updated = orders.filter(o => o.id !== id);
    save(updated); showToast("Order deleted", "info");
  };

  const handleStatusUpdate = (id, newStatus) => {
    const updated = orders.map(o => o.id === id ? { ...o, status: newStatus } : o);
    save(updated); showToast(`Status updated to ${newStatus}`, "success");
  };

  return (
    <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {statuses.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: "pointer", border: filter === s ? `1px solid #16a34a` : `1px solid ${C.border}`, background: filter === s ? "#16a34a" : C.surface, color: filter === s ? "#fff" : C.muted, fontFamily: "inherit" }}>{s}</button>
          ))}
        </div>
        <Btn onClick={openNew}>+ New Order</Btn>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f0fdf4" }}>
            <tr>{["Order ID", "Customer", "Product", "Qty", "Amount", "Status", "Date", "Actions"].map(h => (
              <th key={h} style={{ textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#4a7c59", padding: "11px 14px", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map((o, i) => (
              <tr key={o.id} style={{ borderBottom: `1px solid #f9fafb`, background: i % 2 === 0 ? C.surface : "#fafff9" }}>
                <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: C.accent }}>{o.id}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: C.text, fontWeight: 500 }}>{o.customer}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: C.muted }}>{o.product}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, color: C.muted, textAlign: "center" }}>{o.qty}</td>
                <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 700, color: C.text }}>{fmt(o.amount)}</td>
                <td style={{ padding: "10px 14px" }}>
                  <select value={o.status} onChange={e => handleStatusUpdate(o.id, e.target.value)} style={{ fontSize: 11, borderRadius: 14, padding: "2px 8px", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, ...statusColors[o.status] }}>
                    {statuses.slice(1).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ padding: "10px 14px", fontSize: 11, color: C.faint }}>{o.date}</td>
                <td style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    <Btn size="sm" variant="info" onClick={() => openView(o)}>View</Btn>
                    <Btn size="sm" variant="success" onClick={() => openEdit(o)}>Edit</Btn>
                    <Btn size="sm" variant="danger" onClick={() => handleDelete(o.id)}>Delete</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: "48px", textAlign: "center", color: C.faint, fontSize: 13 }}>No orders found</div>}
      </div>

      {/* New / Edit Modal */}
      <Modal open={modal === "new" || modal === "edit"} onClose={() => setModal(null)} title={modal === "new" ? "Create New Order" : `Edit Order — ${selected?.id}`}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Customer Name *"><Input value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} placeholder="e.g. Ravi Farms" /></Field>
          <Field label="Product *"><Input value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} placeholder="e.g. Urea 46%" /></Field>
          <Field label="Quantity *"><Input type="number" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} placeholder="0" /></Field>
          <Field label="Amount (₹)"><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" /></Field>
          <Field label="Distributor"><Input value={form.dist} onChange={e => setForm({ ...form, dist: e.target.value })} placeholder="-" /></Field>
          <Field label="Date"><Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Status">
            <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {statuses.slice(1).map(s => <option key={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <Btn onClick={handleSave}>{modal === "new" ? "Create Order" : "Save Changes"}</Btn>
          <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal open={modal === "view"} onClose={() => setModal(null)} title={`Order Details — ${selected?.id}`}>
        {selected && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {[["Order ID", selected.id], ["Customer", selected.customer], ["Product", selected.product], ["Quantity", selected.qty], ["Amount", fmt(selected.amount)], ["Status", selected.status], ["Distributor", selected.dist], ["Tracking", selected.tracking], ["Date", selected.date]].map(([k, v]) => (
              <div key={k} style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 10.5, fontWeight: 600, color: C.faint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{k}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{v}</div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

// ─── Tracking Page ─────────────────────────────────────────────────────────────

function TrackingPage() {
  const [trackId, setTrackId] = useState("");
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleTrack = () => {
    setSearched(true);
    const id = trackId.trim().toUpperCase();
    if (trackingHistory[id]) {
      const orders = getData(ORDERS_KEY, seedOrders);
      const order = orders.find(o => o.tracking === id);
      setResult({ history: trackingHistory[id], order });
    } else { setResult(null); }
  };

  return (
    <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <div style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: `1px solid #bbf7d0`, borderRadius: 16, padding: "28px 32px", marginBottom: 20, textAlign: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>Track Your Shipment</h2>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Enter your tracking number to get real-time delivery updates</p>
          <div style={{ display: "flex", gap: 8, maxWidth: 440, margin: "0 auto" }}>
            <input value={trackId} onChange={e => setTrackId(e.target.value)} onKeyDown={e => e.key === "Enter" && handleTrack()} placeholder="e.g. TRK-9282"
              style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: `1px solid #bbf7d0`, fontSize: 14, outline: "none", background: C.surface, color: C.text, fontFamily: "inherit" }} />
            <Btn onClick={handleTrack} size="lg">Track</Btn>
          </div>
          <p style={{ fontSize: 11, color: C.faint, marginTop: 10 }}>Try: TRK-9282</p>
        </div>

        {searched && !result && (
          <div style={{ background: C.surface, border: `1px solid #fecaca`, borderRadius: 14, padding: "32px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.danger, marginBottom: 4 }}>Tracking ID not found</div>
            <div style={{ fontSize: 12, color: C.faint }}>Please check and try again.</div>
          </div>
        )}

        {result && (
          <>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 24px", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                {[["Order", result.order?.id], ["Customer", result.order?.customer], ["Product", result.order?.product]].map(([k, v]) => (
                  <div key={k}><div style={{ fontSize: 10.5, color: C.faint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{k}</div><div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{v}</div></div>
                ))}
                <div><div style={{ fontSize: 10.5, color: C.faint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Status</div><Badge style={statusColors[result.order?.status]}>{result.order?.status}</Badge></div>
                <div><div style={{ fontSize: 10.5, color: C.faint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Est. Delivery</div><div style={{ fontSize: 14, fontWeight: 700, color: "#16a34a" }}>Aug 16, 2024</div></div>
              </div>
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 20 }}>Shipment Timeline</div>
              {result.history.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: step.done ? "#16a34a" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: step.done ? "#fff" : C.faint, fontWeight: 700 }}>{step.done ? "✓" : "○"}</div>
                    {i < result.history.length - 1 && <div style={{ width: 2, flex: 1, background: step.done ? "#bbf7d0" : "#e5e7eb", margin: "4px 0", minHeight: 28 }} />}
                  </div>
                  <div style={{ paddingBottom: 20, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: step.done ? C.text : C.faint }}>{step.status}</div>
                    <div style={{ fontSize: 12, color: step.done ? C.muted : C.faint, marginTop: 1 }}>{step.loc}</div>
                    <div style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>{step.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Products Page ─────────────────────────────────────────────────────────────

function ProductsPage({ showToast }) {
  const [products, setProducts] = useState(() => getData(STOCK_KEY, seedStock));
  const [catFilter, setCatFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", category: "Chemical", sku: "", price: "", weight: "", min: "", stock: "", expiry: "" });

  const cats = ["All", "Organic", "Chemical", "Bio", "Micronutrients", "Pesticides"];
  const filtered = catFilter === "All" ? products : products.filter(p => p.category === catFilter);

  const save = (data) => { setData(STOCK_KEY, data); setProducts(data); };

  const openNew = () => { setForm({ name: "", category: "Chemical", sku: "", price: "", weight: "", min: "", stock: "", expiry: "" }); setModal("new"); };
  const openEdit = (p) => { setSelected(p); setForm({ ...p }); setModal("edit"); };

  const handleSave = () => {
    if (!form.name || !form.sku) { showToast("Name and SKU are required", "error"); return; }
    const updated = [...products];
    const stockNum = +form.stock || 0;
    const minNum = +form.min || 0;
    const status = getStockStatus(stockNum, minNum);
    if (modal === "new") {
      updated.push({ ...form, id: "s" + uid(), price: +form.price, min: minNum, stock: stockNum, status });
      showToast("Product added", "success");
    } else {
      const idx = updated.findIndex(p => p.id === selected.id);
      updated[idx] = { ...selected, ...form, price: +form.price, min: minNum, stock: stockNum, status };
      showToast("Product updated", "success");
    }
    save(updated); setModal(null);
  };

  const handleDelete = (id) => {
    if (!confirm("Remove this product?")) return;
    save(products.filter(p => p.id !== id));
    showToast("Product removed", "info");
  };

  return (
    <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {cats.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11.5, fontWeight: 600, cursor: "pointer", border: catFilter === c ? `1px solid #16a34a` : `1px solid ${C.border}`, background: catFilter === c ? "#16a34a" : C.surface, color: catFilter === c ? "#fff" : C.muted, fontFamily: "inherit" }}>{c}</button>
          ))}
        </div>
        <Btn onClick={openNew}>+ Add Product</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {filtered.map((p) => (
          <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <Badge style={stockColors[p.status]}>{stockColors[p.status].label}</Badge>
              <span style={{ fontSize: 10, color: C.faint, background: "#f9fafb", padding: "2px 7px", borderRadius: 5, border: `1px solid ${C.border}` }}>{p.category}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{p.name}</div>
            <div style={{ fontSize: 11, color: C.faint, marginBottom: 10 }}>{p.sku} · {p.weight}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div><div style={{ fontSize: 10.5, color: C.faint }}>Price</div><div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>₹{p.price}</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 10.5, color: C.faint }}>Stock</div><div style={{ fontSize: 16, fontWeight: 800, color: p.stock === 0 ? C.danger : p.stock < p.min ? C.warning : "#16a34a" }}>{p.stock} units</div></div>
            </div>
            <div style={{ height: 4, background: "#f0fdf4", borderRadius: 4, overflow: "hidden", marginBottom: 4 }}>
              <div style={{ height: "100%", borderRadius: 4, width: `${Math.min(100, (p.stock / (p.min * 3)) * 100)}%`, background: p.stock === 0 ? C.danger : p.stock < p.min ? "#f59e0b" : "#4ade80" }} />
            </div>
            <div style={{ fontSize: 10, color: C.faint, marginBottom: 12 }}>Min: {p.min} · Expires: {p.expiry}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn size="sm" variant="success" onClick={() => openEdit(p)}>Edit</Btn>
              <Btn size="sm" variant="danger" onClick={() => handleDelete(p.id)}>Remove</Btn>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal === "new" || modal === "edit"} onClose={() => setModal(null)} title={modal === "new" ? "Add New Product" : "Edit Product"} width={560}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Product Name *"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Urea 46%" /></Field>
          <Field label="SKU *"><Input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="CH-001" /></Field>
          <Field label="Category">
            <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {["Chemical", "Organic", "Bio", "Micronutrients", "Pesticides"].map(c => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Price (₹)"><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0" /></Field>
          <Field label="Weight / Unit"><Input value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} placeholder="50kg" /></Field>
          <Field label="Expiry Date"><Input value={form.expiry} onChange={e => setForm({ ...form, expiry: e.target.value })} placeholder="Dec 2025" /></Field>
          <Field label="Current Stock"><Input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="0" /></Field>
          <Field label="Minimum Stock"><Input type="number" value={form.min} onChange={e => setForm({ ...form, min: e.target.value })} placeholder="0" /></Field>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <Btn onClick={handleSave}>{modal === "new" ? "Add Product" : "Save Changes"}</Btn>
          <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Inventory Page ────────────────────────────────────────────────────────────

function InventoryPage({ showToast }) {
  const [stock, setStock] = useState(() => getData(STOCK_KEY, seedStock));
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ id: "", qty: "", type: "add" });

  const alertItems = stock.filter(s => s.status !== "ok");

  const handleAdjust = () => {
    if (!form.id || !form.qty) { showToast("Fill all fields", "error"); return; }
    const updated = stock.map(p => {
      if (p.id !== form.id) return p;
      const newStock = form.type === "add" ? p.stock + +form.qty : Math.max(0, p.stock - +form.qty);
      return { ...p, stock: newStock, status: getStockStatus(newStock, p.min) };
    });
    setData(STOCK_KEY, updated); setStock(updated); setModal(false);
    showToast("Stock adjusted successfully", "success");
  };

  return (
    <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
      {alertItems.length > 0 && (
        <div style={{ background: C.warningLight, border: `1px solid #fde68a`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.warning }}>Warning:</span>
          <div style={{ fontSize: 13, color: "#92400e" }}>{alertItems.length} items need attention — {alertItems.map(a => a.name).join(", ")}</div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total SKUs", value: stock.length, color: C.info },
          { label: "In Stock", value: stock.filter(s => s.status === "ok").length, color: "#16a34a" },
          { label: "Low Stock", value: stock.filter(s => s.status === "low").length, color: C.warning },
          { label: "Out of Stock", value: stock.filter(s => s.status === "out").length, color: C.danger },
        ].map((s, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10.5, color: C.faint, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Stock Levels</span>
          <Btn onClick={() => setModal(true)}>+ Adjust Stock</Btn>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f0fdf4" }}>
            <tr>{["Product", "SKU", "Category", "Stock", "Min Required", "Stock Level", "Expiry", "Status"].map(h => (
              <th key={h} style={{ textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#4a7c59", padding: "11px 16px", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {stock.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: `1px solid #f9fafb`, background: i % 2 === 0 ? C.surface : "#fafff9" }}>
                <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</td>
                <td style={{ padding: "11px 16px", fontSize: 12, color: C.faint, fontFamily: "monospace" }}>{p.sku}</td>
                <td style={{ padding: "11px 16px", fontSize: 12, color: C.muted }}>{p.category}</td>
                <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: p.stock === 0 ? C.danger : C.text }}>{p.stock}</td>
                <td style={{ padding: "11px 16px", fontSize: 12, color: C.faint }}>{p.min}</td>
                <td style={{ padding: "11px 16px" }}>
                  <div style={{ width: 100, height: 5, background: "#f0fdf4", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${Math.min(100, (p.stock / (p.min * 3)) * 100)}%`, background: p.stock === 0 ? C.danger : p.stock < p.min ? "#f59e0b" : "#4ade80" }} />
                  </div>
                </td>
                <td style={{ padding: "11px 16px", fontSize: 12, color: C.muted }}>{p.expiry}</td>
                <td style={{ padding: "11px 16px" }}><Badge style={stockColors[p.status]}>{stockColors[p.status].label}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Adjust Stock" width={400}>
        <Field label="Product">
          <Select value={form.id} onChange={e => setForm({ ...form, id: e.target.value })}>
            <option value="">Select product</option>
            {stock.map(p => <option key={p.id} value={p.id}>{p.name} (Current: {p.stock})</option>)}
          </Select>
        </Field>
        <Field label="Adjustment Type">
          <Select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="add">Add Stock</option>
            <option value="remove">Remove Stock</option>
          </Select>
        </Field>
        <Field label="Quantity"><Input type="number" value={form.qty} onChange={e => setForm({ ...form, qty: e.target.value })} placeholder="0" /></Field>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Btn onClick={handleAdjust}>Confirm Adjustment</Btn>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Distributors Page ─────────────────────────────────────────────────────────

function DistributorsPage({ showToast }) {
  const [distributors, setDistributors] = useState(() => getData(DISTRIBUTORS_KEY, seedDistributors));
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", territory: "", status: "Active", rating: "4.5" });

  const save = (d) => { setData(DISTRIBUTORS_KEY, d); setDistributors(d); };

  const openNew = () => { setForm({ name: "", territory: "", status: "Active", rating: "4.5" }); setModal("new"); };
  const openEdit = (d) => { setSelected(d); setForm({ ...d }); setModal("edit"); };

  const handleSave = () => {
    if (!form.name || !form.territory) { showToast("Name and territory required", "error"); return; }
    const updated = [...distributors];
    if (modal === "new") {
      updated.push({ ...form, id: "D" + uid(), orders: 0, revenue: 0, commission: 0, rating: +form.rating });
      showToast("Distributor added", "success");
    } else {
      const idx = updated.findIndex(d => d.id === selected.id);
      updated[idx] = { ...selected, ...form, rating: +form.rating };
      showToast("Distributor updated", "success");
    }
    save(updated); setModal(null);
  };

  const toggleStatus = (id) => {
    const updated = distributors.map(d => d.id === id ? { ...d, status: d.status === "Active" ? "Inactive" : "Active" } : d);
    save(updated); showToast("Status updated", "success");
  };

  const handleDelete = (id) => {
    if (!confirm("Remove distributor?")) return;
    save(distributors.filter(d => d.id !== id));
    showToast("Distributor removed", "info");
  };

  return (
    <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <Btn onClick={openNew}>+ Add Distributor</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
        {distributors.map((d) => (
          <div key={d.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: "linear-gradient(135deg, #bbf7d0, #4ade80)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#166534" }}>{d.name.charAt(0)}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: C.faint }}>{d.territory}</div>
                </div>
              </div>
              <Badge style={d.status === "Active" ? { background: "#dcfce7", color: "#166534" } : { background: "#fee2e2", color: "#991b1b" }}>
                {d.status}
              </Badge>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, padding: "12px 0", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
              {[["Orders", d.orders], ["Revenue", fmt(d.revenue)], ["Commission", fmt(d.commission)]].map(([l, v]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{v}</div>
                  <div style={{ fontSize: 10, color: C.faint, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} style={{ color: s <= Math.round(d.rating) ? "#fbbf24" : "#e5e7eb", fontSize: 13 }}>★</span>
                ))}
                <span style={{ fontSize: 11, color: C.faint, marginLeft: 4 }}>{d.rating}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn size="sm" variant="success" onClick={() => openEdit(d)}>Edit</Btn>
                <Btn size="sm" variant="ghost" onClick={() => toggleStatus(d.id)}>{d.status === "Active" ? "Deactivate" : "Activate"}</Btn>
                <Btn size="sm" variant="danger" onClick={() => handleDelete(d.id)}>Remove</Btn>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal === "new" || modal === "edit"} onClose={() => setModal(null)} title={modal === "new" ? "Add Distributor" : "Edit Distributor"} width={440}>
        <Field label="Company Name *"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="AgroServe Delhi" /></Field>
        <Field label="Territory *"><Input value={form.territory} onChange={e => setForm({ ...form, territory: e.target.value })} placeholder="Delhi NCR" /></Field>
        <Field label="Rating (1–5)"><Input type="number" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} placeholder="4.5" /></Field>
        <Field label="Status">
          <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option>Active</option><option>Inactive</option>
          </Select>
        </Field>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Btn onClick={handleSave}>{modal === "new" ? "Add Distributor" : "Save Changes"}</Btn>
          <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Customers Page ────────────────────────────────────────────────────────────

function CustomersPage({ showToast, selectedLocation }) {
  const [customers, setCustomers] = useState([]);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", location: "", tier: "Bronze" });

  const saveLocal = (d) => { setData(CUSTOMERS_KEY, d); setCustomers(d); };

  // Load customers from backend, fallback to localStorage
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await apiFetch("/api/orders/customers");
        if (mounted && res && res.success) setCustomers(res.data || []);
      } catch (err) {
        // fallback to local seed
        setCustomers(getData(CUSTOMERS_KEY, seedCustomers));
      }
    })();
    return () => { mounted = false; };
  }, []);

  // default new-customer uses selected location if available
  const openNew = () => { setForm({ name: "", location: selectedLocation || "", tier: "Bronze" }); setModal("new"); };
  const openEdit = (c) => { setSelected(c); setForm({ ...c }); setModal("edit"); };

  const handleSave = async () => {
    if (!form.name || !form.location) { showToast("Name and location required", "error"); return; }
    // Try backend create first
    if (modal === "new") {
      try {
        const res = await apiFetch("/api/orders/customers", { method: "POST", body: JSON.stringify(form) });
        if (res && res.success && res.data) {
          setCustomers(prev => [res.data, ...prev]);
          showToast("Customer added", "success");
          setModal(null);
          return;
        }
      } catch (err) {
        // fallthrough to local
      }
      // local fallback
      const updated = [...customers, { ...form, id: "C" + uid(), orders: 0, totalSpent: 0, lastOrder: "-" }];
      saveLocal(updated); showToast("Customer added (local)", "info"); setModal(null); return;
    }
    // Edit: no server patch implemented; update locally
    const idx = customers.findIndex(c => c.id === selected?.id);
    if (idx >= 0) {
      const updated = [...customers]; updated[idx] = { ...updated[idx], ...form };
      saveLocal(updated); showToast("Customer updated", "success"); setModal(null); return;
    }
    showToast("Could not update customer", "error");
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this customer?")) return;
    // no server delete endpoint; do local removal
    saveLocal(customers.filter(c => c.id !== id));
    showToast("Customer deleted", "info");
  };

  return (
    <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
        <Btn onClick={openNew}>+ Add Customer</Btn>
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f0fdf4" }}>
            <tr>{["Customer", "Location", "Orders", "Total Spent", "Last Order", "Tier", "Actions"].map(h => (
              <th key={h} style={{ textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#4a7c59", padding: "12px 16px", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {customers.filter(c => !selectedLocation || c.location === selectedLocation).map((c, i) => (
              <tr key={c.id} style={{ borderBottom: `1px solid #f9fafb` }}>
                <td style={{ padding: "11px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #bbf7d0, #4ade80)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#166534" }}>{c.name.split(" ").map(w => w[0]).join("").slice(0, 2)}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: C.faint }}>{c.id}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "11px 16px", fontSize: 12, color: C.muted }}>{c.location}</td>
                <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: C.text }}>{c.orders}</td>
                <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 700, color: C.text }}>{fmt(c.totalSpent)}</td>
                <td style={{ padding: "11px 16px", fontSize: 12, color: C.faint }}>{c.lastOrder}</td>
                <td style={{ padding: "11px 16px" }}><Badge style={tierColors[c.tier]}>{c.tier}</Badge></td>
                <td style={{ padding: "11px 16px" }}>
                  <div style={{ display: "flex", gap: 5 }}>
                    <Btn size="sm" variant="success" onClick={() => openEdit(c)}>Edit</Btn>
                    <Btn size="sm" variant="danger" onClick={() => handleDelete(c.id)}>Delete</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={modal === "new" || modal === "edit"} onClose={() => setModal(null)} title={modal === "new" ? "Add Customer" : "Edit Customer"} width={400}>
        <Field label="Customer Name *"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ravi Farms" /></Field>
        <Field label="Location *"><LocationSelect value={form.location} onChange={v => setForm({ ...form, location: v })} placeholder="Search or pick a location" /></Field>
        <Field label="Tier">
          <Select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })}>
            {["Bronze", "Silver", "Gold", "Platinum"].map(t => <option key={t}>{t}</option>)}
          </Select>
        </Field>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Btn onClick={handleSave}>{modal === "new" ? "Add Customer" : "Save Changes"}</Btn>
          <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Reports Page ──────────────────────────────────────────────────────────────

function ReportsPage() {
  const distributors = getData(DISTRIBUTORS_KEY, seedDistributors);

  const handleExport = (type) => {
    if (type === "csv") {
      const orders = getData(ORDERS_KEY, seedOrders);
      const rows = [["Order ID", "Customer", "Product", "Qty", "Amount", "Status", "Date"], ...orders.map(o => [o.id, o.customer, o.product, o.qty, o.amount, o.status, o.date])];
      const csv = rows.map(r => r.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "orders-report.csv"; a.click();
    } else {
      alert("PDF export would require a server-side renderer. CSV export is available.");
    }
  };

  return (
    <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Monthly Sales Trend</div>
          <div style={{ fontSize: 12, color: C.faint, marginBottom: 14 }}>Order volume Jan–Aug 2024</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.faint }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.faint }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
              <Line type="monotone" dataKey="orders" stroke="#16a34a" strokeWidth={2.5} dot={{ fill: "#16a34a", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 4 }}>Distributor Performance</div>
          <div style={{ fontSize: 12, color: C.faint, marginBottom: 14 }}>Revenue by distributor</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distributors.filter(d => d.status === "Active")} layout="vertical" barSize={13}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
              <XAxis type="number" tick={{ fontSize: 11, fill: C.faint }} axisLine={false} tickLine={false} tickFormatter={v => "₹" + v / 1000 + "k"} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: C.faint }} axisLine={false} tickLine={false} width={100} />
              <Tooltip formatter={v => [fmt(v), "Revenue"]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
              <Bar dataKey="revenue" fill="#4ade80" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Revenue vs Target — Full Year</div>
            <div style={{ fontSize: 12, color: C.faint }}>Monthly comparison</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn size="sm" variant="secondary" onClick={() => handleExport("pdf")}>Export PDF</Btn>
            <Btn size="sm" variant="success" onClick={() => handleExport("csv")}>Export CSV</Btn>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={salesData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.faint }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: C.faint }} axisLine={false} tickLine={false} tickFormatter={v => "₹" + v / 1000 + "k"} />
            <Tooltip formatter={v => [fmt(v)]} contentStyle={{ borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 12 }} />
            <Bar dataKey="revenue" fill="#4ade80" radius={[4, 4, 0, 0]} name="Revenue" />
            <Bar dataKey="target" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="Target" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────

function AdminPanel({ currentUser, showToast }) {
  const [users, setUsers] = useState(() => getUsers());
  const [tab, setTab] = useState("users");
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "staff" });

  const saveU = (u) => { saveUsers(u); setUsers(u); };

  const openNew = () => { setForm({ name: "", email: "", password: "", role: "staff" }); setModal("new"); };
  const openEdit = (u) => { setSelected(u); setForm({ name: u.name, email: u.email, password: "", role: u.role }); setModal("edit"); };

  const handleSave = () => {
    if (!form.name || !form.email) { showToast("Name and email required", "error"); return; }
    const updated = [...users];
    if (modal === "new") {
      if (!form.password) { showToast("Password required for new user", "error"); return; }
      if (updated.find(u => u.email === form.email)) { showToast("Email already exists", "error"); return; }
      updated.push({ ...form, id: "u" + uid(), avatar: form.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(), active: true, createdAt: new Date().toISOString().slice(0, 10) });
      showToast("User created", "success");
    } else {
      const idx = updated.findIndex(u => u.id === selected.id);
      updated[idx] = { ...selected, name: form.name, email: form.email, role: form.role, avatar: form.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase(), ...(form.password ? { password: form.password } : {}) };
      showToast("User updated", "success");
    }
    saveU(updated); setModal(null);
  };

  const toggleUser = (id) => {
    if (id === currentUser.id) { showToast("Cannot disable your own account", "error"); return; }
    const updated = users.map(u => u.id === id ? { ...u, active: !u.active } : u);
    saveU(updated); showToast("User status updated", "success");
  };

  const handleDelete = (id) => {
    if (id === currentUser.id) { showToast("Cannot delete your own account", "error"); return; }
    if (!confirm("Delete this user?")) return;
    saveU(users.filter(u => u.id !== id));
    showToast("User deleted", "info");
  };

  const orders = getData(ORDERS_KEY, seedOrders);
  const stock = getData(STOCK_KEY, seedStock);
  const systemStats = [
    { label: "Total Users", value: users.length },
    { label: "Active Users", value: users.filter(u => u.active).length },
    { label: "Total Orders", value: orders.length },
    { label: "Total Products", value: stock.length },
  ];

  return (
    <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {systemStats.map((s, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 10.5, color: C.faint, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {["users", "system"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", border: tab === t ? `1px solid #16a34a` : `1px solid ${C.border}`, background: tab === t ? "#16a34a" : C.surface, color: tab === t ? "#fff" : C.muted, fontFamily: "inherit", textTransform: "capitalize" }}>{t === "users" ? "User Management" : "System Info"}</button>
        ))}
      </div>

      {tab === "users" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Btn onClick={openNew}>+ Add User</Btn>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f0fdf4" }}>
                <tr>{["User", "Email", "Role", "Status", "Created", "Actions"].map(h => (
                  <th key={h} style={{ textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#4a7c59", padding: "12px 16px", textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid #f9fafb`, background: i % 2 === 0 ? C.surface : "#fafff9" }}>
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #4ade80, #16a34a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff" }}>{u.avatar}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.name}{u.id === currentUser.id && <span style={{ fontSize: 10, color: C.accent, marginLeft: 6, fontWeight: 400 }}>You</span>}</div>
                      </div>
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: C.muted }}>{u.email}</td>
                    <td style={{ padding: "11px 16px" }}><Badge style={roleColors[u.role] || { background: "#f1f5f9", color: "#475569" }}>{u.role}</Badge></td>
                    <td style={{ padding: "11px 16px" }}><Badge style={u.active ? { background: "#dcfce7", color: "#166534" } : { background: "#fee2e2", color: "#991b1b" }}>{u.active ? "Active" : "Disabled"}</Badge></td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: C.faint }}>{u.createdAt}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", gap: 5 }}>
                        <Btn size="sm" variant="success" onClick={() => openEdit(u)}>Edit</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => toggleUser(u.id)}>{u.active ? "Disable" : "Enable"}</Btn>
                        <Btn size="sm" variant="danger" onClick={() => handleDelete(u.id)}>Delete</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "system" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { title: "Authentication", items: [["Method", "JWT (HS256)"], ["Token Expiry", "1 hour"], ["Google OAuth", "Simulated (demo mode)"], ["Password Hashing", "Plain text (demo)"], ["Session Storage", "localStorage"]] },
            { title: "Data Storage", items: [["Type", "localStorage (browser)"], ["Orders", `${orders.length} records`], ["Products", `${stock.length} SKUs`], ["Users", `${users.length} accounts`], ["Last Sync", new Date().toLocaleString()]] },
            { title: "Roles & Permissions", items: [["superadmin", "Full access — all modules"], ["manager", "Orders, products, reports"], ["staff", "Dashboard, orders, inventory"], ["google user", "Auto-assigned as staff"]] },
            { title: "Application Info", items: [["Version", "2.0.0"], ["Build", "AgriFlow ERP"], ["Framework", "React 18"], ["Charts", "Recharts"], ["Auth", "JWT + Google OAuth"]] },
          ].map(({ title, items }) => (
            <div key={title} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>{title}</div>
              {items.map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                  <span style={{ color: C.muted, fontWeight: 500 }}>{k}</span>
                  <span style={{ color: C.text, fontWeight: 600, textAlign: "right", maxWidth: "55%" }}>{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal === "new" || modal === "edit"} onClose={() => setModal(null)} title={modal === "new" ? "Create New User" : `Edit User — ${selected?.name}`} width={440}>
        <Field label="Full Name *"><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" /></Field>
        <Field label="Email Address *"><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@agriflow.in" /></Field>
        <Field label={modal === "new" ? "Password *" : "New Password (leave blank to keep)"}>
          <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={modal === "new" ? "min 6 characters" : "Leave blank to keep current"} />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="superadmin">Super Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </Select>
        </Field>
        <div style={{ background: "#f0fdf4", border: `1px solid #bbf7d0`, borderRadius: 8, padding: "10px 12px", marginTop: 4, fontSize: 11.5, color: "#4a7c59" }}>
          <strong>superadmin</strong> — full access &nbsp;|&nbsp; <strong>manager</strong> — orders, products, reports &nbsp;|&nbsp; <strong>staff</strong> — view only
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <Btn onClick={handleSave}>{modal === "new" ? "Create User" : "Save Changes"}</Btn>
          <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Settings Page ─────────────────────────────────────────────────────────────

function SettingsPage({ currentUser, showToast }) {
  const [profile, setProfile] = useState({ name: currentUser?.name || "", email: currentUser?.email || "" });
  const [password, setPassword] = useState({ current: "", newPass: "", confirm: "" });
  const [notifs, setNotifs] = useState({ email: true, sms: true, lowStock: true });

  const handleSaveProfile = () => {
    if (!profile.name || !profile.email) { showToast("Name and email required", "error"); return; }
    const users = getUsers();
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx >= 0) { users[idx] = { ...users[idx], name: profile.name, email: profile.email }; saveUsers(users); }
    showToast("Profile updated", "success");
  };

  const handleChangePassword = () => {
    if (!password.current || !password.newPass) { showToast("Fill all fields", "error"); return; }
    const users = getUsers();
    const user = users.find(u => u.id === currentUser.id);
    if (user?.password !== password.current) { showToast("Current password incorrect", "error"); return; }
    if (password.newPass !== password.confirm) { showToast("Passwords do not match", "error"); return; }
    if (password.newPass.length < 6) { showToast("Password too short", "error"); return; }
    const idx = users.findIndex(u => u.id === currentUser.id);
    users[idx] = { ...users[idx], password: password.newPass };
    saveUsers(users);
    setPassword({ current: "", newPass: "", confirm: "" });
    showToast("Password changed successfully", "success");
  };

  const Toggle = ({ val, set }) => (
    <div onClick={() => set(!val)} style={{ width: 40, height: 21, borderRadius: 10.5, background: val ? "#16a34a" : "#e5e7eb", position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: val ? 21 : 2, width: 17, height: 17, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </div>
  );

  return (
    <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
      <div style={{ maxWidth: 600 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Profile Settings</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <Field label="Full Name"><Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Btn onClick={handleSaveProfile}>Save Profile</Btn>
            <span style={{ fontSize: 11, color: C.faint }}>Role: <strong style={{ color: C.muted }}>{currentUser?.role}</strong></span>
          </div>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Change Password</div>
          <Field label="Current Password"><Input type="password" value={password.current} onChange={e => setPassword({ ...password, current: e.target.value })} placeholder="Current password" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="New Password"><Input type="password" value={password.newPass} onChange={e => setPassword({ ...password, newPass: e.target.value })} placeholder="Min 6 characters" /></Field>
            <Field label="Confirm New Password"><Input type="password" value={password.confirm} onChange={e => setPassword({ ...password, confirm: e.target.value })} placeholder="Confirm new password" /></Field>
          </div>
          <Btn onClick={handleChangePassword}>Update Password</Btn>
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 14 }}>Notification Preferences</div>
          {[
            { key: "email", label: "Email Notifications", desc: "Receive updates via email" },
            { key: "sms", label: "SMS Notifications", desc: "Send SMS alerts on status changes" },
            { key: "lowStock", label: "Low Stock Alerts", desc: "Alert when inventory falls below minimum" },
          ].map((item, i) => (
            <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.label}</div>
                <div style={{ fontSize: 11, color: C.faint }}>{item.desc}</div>
              </div>
              <Toggle val={notifs[item.key]} set={v => setNotifs({ ...notifs, [item.key]: v })} />
            </div>
          ))}
        </div>

        <Btn onClick={() => showToast("All settings saved", "success")} size="lg">Save All Settings</Btn>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const { currentUser, login, logout, googleLogin } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState("");

  const showToast = (message, type = "info") => setToast({ message, type });

  if (!currentUser) {
    return <LoginPage onLogin={login} onGoogleLogin={googleLogin} />;
  }

  const orders = getData(ORDERS_KEY, seedOrders);

  const pages = {
    dashboard: <Dashboard orders={orders} />,
    orders: <OrdersPage showToast={showToast} />,
    tracking: <TrackingPage />,
    products: <ProductsPage showToast={showToast} />,
    inventory: <InventoryPage showToast={showToast} />,
    distributors: <DistributorsPage showToast={showToast} />,
    customers: <CustomersPage showToast={showToast} selectedLocation={selectedLocation} />,
    reports: <ReportsPage />,
    admin: <AdminPanel currentUser={currentUser} showToast={showToast} />,
    settings: <SettingsPage currentUser={currentUser} showToast={showToast} />,
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", overflow: "hidden", background: C.bg }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #d1fae5; borderRadius: 10px; }
        button:hover { opacity: 0.85; transition: opacity 0.15s; }
        input:focus, select:focus { border-color: #22c55e !important; box-shadow: 0 0 0 3px rgba(34,197,94,0.12); outline: none; }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      <Sidebar active={activePage} setActive={setActivePage} collapsed={collapsed} currentUser={currentUser} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <TopBar active={activePage} collapsed={collapsed} setCollapsed={setCollapsed} onLogout={logout} currentUser={currentUser}
          selectedLocation={selectedLocation} setSelectedLocation={setSelectedLocation} />
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {pages[activePage] || <div style={{ padding: 40, textAlign: "center", color: C.faint }}>Page not found or access restricted.</div>}
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}