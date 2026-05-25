import React, { useState } from 'react';
import './QRCodeGenerator.css';

export default function QRCodeGenerator() {
  const [formData, setFormData] = useState({
    item_name: '',
    product_id: '',
    warehouse_id: '',
    batch_number: '',
    metadata: {}
  });
  
  const [generatedQR, setGeneratedQR] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const apiBase = import.meta.env.VITE_API_URL || '/api';

  const handleGenerateQR = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiBase}/qr-code/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('agriflow_token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = data?.detail || data?.message || response.statusText || 'Failed to generate QR code';
        throw new Error(detail);
      }

      setGeneratedQR(data);
      setGeneratedQR(data);
      setFormData({
        item_name: '',
        product_id: '',
        warehouse_id: '',
        batch_number: '',
        metadata: {}
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = () => {
    if (!generatedQR) return;

    const link = document.createElement('a');
    link.href = `data:image/png;base64,${generatedQR.qr_image_base64}`;
    link.download = `qr-${generatedQR.code}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintQR = () => {
    if (!generatedQR) return;

    const printWindow = window.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${generatedQR.item_name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 20px;
            }
            .qr-container {
              border: 2px solid #333;
              padding: 20px;
              margin: 20px 0;
            }
            img {
              max-width: 300px;
            }
            .info {
              margin-top: 20px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <h2>QR Code</h2>
          <div class="qr-container">
            <img src="data:image/png;base64,${generatedQR.qr_image_base64}" alt="QR Code" />
          </div>
          <div class="info">
            <p><strong>Item:</strong> ${generatedQR.item_name || 'N/A'}</p>
            <p><strong>Batch:</strong> ${generatedQR.batch_number || 'N/A'}</p>
            <p><strong>Code:</strong> ${generatedQR.code}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="qr-generator">
      <h2>Generate QR Code for Inventory</h2>

      <form onSubmit={handleGenerateQR} className="qr-form">
        <div className="form-group">
          <label htmlFor="item_name">Item Name *</label>
          <input
            type="text"
            id="item_name"
            name="item_name"
            value={formData.item_name}
            onChange={handleInputChange}
            required
            placeholder="e.g., Rice - 50kg bag"
          />
        </div>

        <div className="form-group">
          <label htmlFor="product_id">Product ID</label>
          <input
            type="text"
            id="product_id"
            name="product_id"
            value={formData.product_id}
            onChange={handleInputChange}
            placeholder="Enter product ID"
          />
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
          <label htmlFor="batch_number">Batch Number</label>
          <input
            type="text"
            id="batch_number"
            name="batch_number"
            value={formData.batch_number}
            onChange={handleInputChange}
            placeholder="Enter batch number"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Generating...' : 'Generate QR Code'}
        </button>

        {error && <div className="error">{error}</div>}
      </form>

      {generatedQR && (
        <div className="qr-result">
          <h3>QR Code Generated</h3>
          <div className="qr-display">
            <img 
              src={`data:image/png;base64,${generatedQR.qr_image_base64}`} 
              alt="Generated QR Code"
              className="qr-image"
            />
          </div>
          <div className="qr-info">
            <p><strong>Code ID:</strong> {generatedQR.code}</p>
            <p><strong>Item:</strong> {generatedQR.item_name}</p>
            {generatedQR.batch_number && <p><strong>Batch:</strong> {generatedQR.batch_number}</p>}
            <p><strong>Created:</strong> {new Date(generatedQR.created_at).toLocaleString()}</p>
          </div>
          <div className="qr-actions">
            <button onClick={handleDownloadQR} className="btn-secondary">Download QR Code</button>
            <button onClick={handlePrintQR} className="btn-secondary">Print QR Code</button>
          </div>
        </div>
      )}
    </div>
  );
}
