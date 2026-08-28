import React from 'react';
import { UploadCloud, ShieldAlert, ArrowRight } from 'lucide-react';

export function EmptyState({ onOpenUpload }) {
  return (
    <div className="empty-state-box">
      <div style={{ 
        width: '48px', 
        height: '48px', 
        borderRadius: '8px', 
        background: 'rgba(56, 189, 248, 0.1)', 
        color: 'var(--accent-blue)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        margin: '0 auto 16px'
      }}>
        <ShieldAlert size={24} />
      </div>
      <h2 style={{ fontSize: '1.05rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
        Upload security tickets to begin
      </h2>
      <button 
        className="btn btn-primary"
        onClick={onOpenUpload}
        style={{ padding: '10px 20px', fontSize: '0.9rem' }}
      >
        <UploadCloud size={16} />
        <span>Upload CSV / JSON</span>
      </button>
    </div>
  );
}
