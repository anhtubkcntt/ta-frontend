import React, { useState } from 'react';
import { exportSupabaseDataToExcel } from '../utils/exportData';

export default function BackupModal({ onClose }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    const result = await exportSupabaseDataToExcel(startDate, endDate);
    setLoading(false);
    
    if (result.success) {
      alert("Backup downloaded successfully!");
      onClose();
    } else {
      alert(`Failed to export data: ${result.error}`);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', padding: '32px', position: 'relative', backgroundColor: 'var(--bg-color)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: `1px solid var(--border-color)`, paddingBottom: '16px' }}>
          <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem' }}>📥 Backup Data</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-main)' }}>&times;</button>
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Start Date (Optional)</label>
          <input 
            type="date" 
            style={{ width: '100%', padding: '10px', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }} 
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </div>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>End Date (Optional)</label>
          <input 
            type="date" 
            style={{ width: '100%', padding: '10px', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }} 
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button 
            className="btn glass-panel" 
            onClick={onClose}
            disabled={loading}
            style={{ padding: '8px 16px', color: 'var(--text-main)' }}
          >
            Cancel
          </button>
          <button 
            className="btn" 
            onClick={handleExport}
            disabled={loading}
            style={{ padding: '8px 16px', backgroundColor: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            {loading ? 'Processing...' : 'Download Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
