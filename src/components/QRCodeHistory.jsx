import React, { useState, useEffect } from 'react';
import './QRCodeHistory.css';

export default function QRCodeHistory() {
  const [qrCodeId, setQRCodeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qrInfo, setQRInfo] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [page, setPage] = useState(0);
  const itemsPerPage = 20;

  const handleFetchHistory = async (e) => {
    e.preventDefault();
    if (!qrCodeId.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/qr-code/scan/${qrCodeId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('agriflow_token')}`
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('QR code not found');
        }
        throw new Error('Failed to fetch QR code information');
      }

      const data = await response.json();
      setQRInfo(data);
      setScanHistory(data.scan_history || []);
      setPage(0);
    } catch (err) {
      setError(err.message);
      setQRInfo(null);
      setScanHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    const colors = {
      'received': '#4CAF50',
      'moved': '#2196F3',
      'verified': '#FF9800',
      'packed': '#9C27B0',
      'shipped': '#00BCD4',
      'delivered': '#4CAF50',
      'scanned': '#666'
    };
    return colors[action] || '#999';
  };

  const getActionIcon = (action) => {
    const icons = {
      'received': '📦',
      'moved': '🔄',
      'verified': '✓',
      'packed': '📦',
      'shipped': '🚚',
      'delivered': '✔️',
      'scanned': '📱'
    };
    return icons[action] || '•';
  };

  const paginatedHistory = scanHistory.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
  const totalPages = Math.ceil(scanHistory.length / itemsPerPage);

  return (
    <div className="qr-history">
      <h2>QR Code Scan History</h2>

      <form onSubmit={handleFetchHistory} className="search-form">
        <div className="form-group">
          <input
            type="text"
            placeholder="Enter QR Code ID"
            value={qrCodeId}
            onChange={(e) => setQRCodeId(e.target.value)}
            autoFocus
          />
          <button type="submit" disabled={loading || !qrCodeId.trim()}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </form>

      {qrInfo && (
        <div className="qr-info-section">
          <div className="qr-info-header">
            <h3>Item Information</h3>
          </div>
          <div className="qr-info-grid">
            <div className="info-card">
              <span className="label">Item Name</span>
              <span className="value">{qrInfo.item_name || 'N/A'}</span>
            </div>
            <div className="info-card">
              <span className="label">Batch Number</span>
              <span className="value">{qrInfo.batch_number || 'N/A'}</span>
            </div>
            <div className="info-card">
              <span className="label">Product ID</span>
              <span className="value">{qrInfo.product_id || 'N/A'}</span>
            </div>
            <div className="info-card">
              <span className="label">Warehouse ID</span>
              <span className="value">{qrInfo.warehouse_id || 'N/A'}</span>
            </div>
            <div className="info-card">
              <span className="label">Created Date</span>
              <span className="value">{new Date(qrInfo.created_at).toLocaleDateString()}</span>
            </div>
            <div className="info-card">
              <span className="label">Total Scans</span>
              <span className="value">{scanHistory.length}</span>
            </div>
          </div>
        </div>
      )}

      {scanHistory.length > 0 && (
        <div className="history-section">
          <h3>Scan History ({scanHistory.length} scans)</h3>
          
          <div className="timeline">
            {paginatedHistory.map((scan, index) => (
              <div key={scan.id || index} className="timeline-item">
                <div className="timeline-marker" style={{ backgroundColor: getActionColor(scan.action) }}>
                  <span className="timeline-icon">{getActionIcon(scan.action)}</span>
                </div>
                <div className="timeline-content">
                  <div className="scan-action">
                    <span className="action-badge" style={{ backgroundColor: getActionColor(scan.action) }}>
                      {scan.action?.toUpperCase()}
                    </span>
                    <span className="timestamp">
                      {new Date(scan.scanned_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="scan-details">
                    {scan.location && (
                      <p><strong>Location:</strong> {scan.location}</p>
                    )}
                    {scan.warehouse_id && (
                      <p><strong>Warehouse:</strong> {scan.warehouse_id}</p>
                    )}
                    {scan.notes && (
                      <p><strong>Notes:</strong> {scan.notes}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => setPage(Math.max(0, page - 1))} 
                disabled={page === 0}
              >
                ← Previous
              </button>
              <span className="page-info">
                Page {page + 1} of {totalPages}
              </span>
              <button 
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))} 
                disabled={page === totalPages - 1}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {qrInfo && scanHistory.length === 0 && (
        <div className="empty-state">
          <p>No scans recorded for this QR code yet.</p>
        </div>
      )}
    </div>
  );
}
