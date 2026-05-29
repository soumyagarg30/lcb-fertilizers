import React, { useState, useEffect } from 'react';

export default function QRCodeViewPage({ qrId }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE || `http://${window.location.hostname}:8000`;

  useEffect(() => {
    const fetchQRData = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/qr-code/${qrId}`);
        if (!response.ok) {
          throw new Error('QR code not found');
        }
        const data = await response.json();
        setQrData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (qrId) {
      fetchQRData();
    }
  }, [qrId]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        fontFamily: 'Arial, sans-serif',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, color: '#6b7c69', marginBottom: 12 }}>Loading QR Data...</div>
          <div style={{ width: 40, height: 40, border: '4px solid #dcfce7', borderTop: '4px solid #1a4d2e', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f9fafb',
        fontFamily: 'Arial, sans-serif',
        padding: 20,
      }}>
        <div style={{
          textAlign: 'center',
          background: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: 12,
          padding: 28,
          maxWidth: 480,
        }}>
          <div style={{ fontSize: 20, color: '#991b1b', fontWeight: 'bold', marginBottom: 8 }}>Error</div>
          <div style={{ fontSize: 16, color: '#7f1d1d' }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f7fbf5 0%, #ffffff 50%, #e8f6f3 100%)',
      padding: 24,
      fontFamily: 'Arial, sans-serif',
    }}>
      <div style={{
        maxWidth: 700,
        margin: '0 auto',
        background: '#ffffff',
        borderRadius: 20,
        boxShadow: '0 20px 60px rgba(15, 23, 42, 0.15)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1a4d2e 0%, #22c55e 100%)',
          padding: 32,
          textAlign: 'center',
          color: '#ffffff',
        }}>
          <div style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 8 }}>QR Code Data</div>
          <div style={{ fontSize: 14, opacity: 0.9 }}>Item Information</div>
        </div>

        {/* Content */}
        <div style={{ padding: 32 }}>
          {qrData && (
            <div>
              {/* Item Name */}
              {qrData.item_name && (
                <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 12, color: '#6b7c69', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Item Name</div>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1a4d2e' }}>{qrData.item_name}</div>
                </div>
              )}

              {/* Batch Number */}
              {qrData.batch_number && (
                <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 12, color: '#6b7c69', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Batch Number</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#475569', fontFamily: 'monospace' }}>{qrData.batch_number}</div>
                </div>
              )}

              {/* Product ID */}
              {qrData.product_id && (
                <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 12, color: '#6b7c69', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Product ID</div>
                  <div style={{ fontSize: 16, fontFamily: 'monospace', color: '#475569' }}>{qrData.product_id}</div>
                </div>
              )}

              {/* Warehouse ID */}
              {qrData.warehouse_id && (
                <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 12, color: '#6b7c69', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Warehouse</div>
                  <div style={{ fontSize: 16, fontFamily: 'monospace', color: '#475569' }}>{qrData.warehouse_id}</div>
                </div>
              )}

              {/* QR Code ID */}
              <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 12, color: '#6b7c69', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>QR Code ID</div>
                <div style={{ fontSize: 14, fontFamily: 'monospace', color: '#475569', wordBreak: 'break-all' }}>{qrData.code}</div>
              </div>

              {/* Created Date */}
              <div>
                <div style={{ fontSize: 12, color: '#6b7c69', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Created</div>
                <div style={{ fontSize: 16, color: '#475569' }}>
                  {new Date(qrData.created_at).toLocaleString()}
                </div>
              </div>

              {/* Metadata */}
              {qrData.item_metadata && Object.keys(qrData.item_metadata).length > 0 && (
                <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 12, color: '#6b7c69', fontWeight: 600, textTransform: 'uppercase', marginBottom: 16 }}>Additional Details</div>
                  <div style={{ background: '#f3f4f6', padding: 16, borderRadius: 12 }}>
                    <pre style={{ margin: 0, fontSize: 13, color: '#475569', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace' }}>
                      {JSON.stringify(qrData.item_metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
