import React, { useState, useEffect, useRef } from 'react';
import './QRScanner.css';

export default function QRScanner() {
  const videoRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    action: 'scanned',
    warehouse_id: '',
    location: '',
    notes: ''
  });

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
        scanQRCode();
      }
    } catch (err) {
      setError('Failed to access camera: ' + err.message);
    }
  };

  const stopScanning = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setScanning(false);
  };

  const scanQRCode = () => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    const drawFrame = () => {
      if (!scanning) return;

      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        try {
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          // Simple QR code detection - in production, use jsQR or similar library
          // For now, we'll wait for manual entry or use a barcode scanner device
        } catch (err) {
          // Ignore errors in scanning loop
        }
      }
      requestAnimationFrame(drawFrame);
    };

    drawFrame();
  };

  const handleManualEntry = async (e) => {
    e.preventDefault();
    if (!scannedData) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/qr-code/${scannedData}/record-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('agriflow_token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to record scan');
      }

      const data = await response.json();
      setScanResult(data);
      setScannedData(null);
      setFormData({
        action: 'scanned',
        warehouse_id: '',
        location: '',
        notes: ''
      });

      // Fetch QR code info
      const infoResponse = await fetch(`/api/qr-code/scan/${scannedData}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('agriflow_token')}`
        }
      });
      if (infoResponse.ok) {
        const infoData = await infoResponse.json();
        setScanResult(prev => ({
          ...prev,
          qrInfo: infoData
        }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleQRCodeChange = (e) => {
    setScannedData(e.target.value);
  };

  return (
    <div className="qr-scanner">
      <h2>Scan QR Code</h2>

      <div className="scanner-section">
        <div className="camera-container">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`camera-feed ${scanning ? 'active' : ''}`}
          />
          {!scanning && (
            <div className="camera-placeholder">
              <p>Camera feed will appear here</p>
            </div>
          )}
        </div>

        <div className="scanner-controls">
          {!scanning ? (
            <button onClick={startScanning} className="btn-primary">Start Scanning</button>
          ) : (
            <button onClick={stopScanning} className="btn-danger">Stop Scanning</button>
          )}
        </div>
      </div>

      <div className="manual-entry-section">
        <h3>Or Enter QR Code Manually</h3>
        <form onSubmit={handleManualEntry} className="scan-form">
          <div className="form-group">
            <label htmlFor="scanned_code">QR Code / Barcode *</label>
            <input
              type="text"
              id="scanned_code"
              value={scannedData}
              onChange={handleQRCodeChange}
              required
              placeholder="Enter or paste QR code ID"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="action">Action *</label>
            <select
              id="action"
              name="action"
              value={formData.action}
              onChange={handleInputChange}
              required
            >
              <option value="scanned">Scanned</option>
              <option value="received">Received</option>
              <option value="moved">Moved</option>
              <option value="verified">Verified</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="warehouse_id">Warehouse ID</label>
            <input
              type="text"
              id="warehouse_id"
              name="warehouse_id"
              value={formData.warehouse_id}
              onChange={handleInputChange}
              placeholder="Enter warehouse ID"
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., Shelf A-12, Zone B"
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Add any notes about this scan"
              rows="3"
            />
          </div>

          <button type="submit" disabled={loading || !scannedData}>
            {loading ? 'Recording Scan...' : 'Record Scan'}
          </button>

          {error && <div className="error">{error}</div>}
        </form>
      </div>

      {scanResult && (
        <div className="scan-result">
          <h3>Scan Recorded Successfully</h3>
          <div className="result-info">
            <p><strong>Message:</strong> {scanResult.message}</p>
            {scanResult.qrInfo && (
              <>
                <p><strong>Item:</strong> {scanResult.qrInfo.item_name}</p>
                <p><strong>Batch:</strong> {scanResult.qrInfo.batch_number || 'N/A'}</p>
                <p><strong>Last Scanned:</strong> {new Date(scanResult.scanned_at).toLocaleString()}</p>
                {scanResult.qrInfo.scan_history && (
                  <div className="scan-history">
                    <h4>Recent Scans</h4>
                    <ul>
                      {scanResult.qrInfo.scan_history.slice(0, 5).map((scan, idx) => (
                        <li key={idx}>
                          <strong>{scan.action}</strong> - {new Date(scan.scanned_at).toLocaleString()}
                          {scan.location && <span> at {scan.location}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
          <button onClick={() => setScanResult(null)} className="btn-secondary">Clear</button>
        </div>
      )}
    </div>
  );
}
