import React from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';

export function DataStatusBanner({ filename, ticketCount, lastRunTimestamp }) {
  return (
    <div className="status-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '0.82rem' }}>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Uploaded: </span>
          <strong className="font-mono">{filename || '—'}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Tickets: </span>
          <strong className="font-mono">{ticketCount ?? 0}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Status: </span>
          {lastRunTimestamp ? (
            <span style={{ color: '#34d399', fontWeight: 600 }}>
              <CheckCircle2 size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              AI Optimization Complete
            </span>
          ) : (
            <span style={{ color: 'var(--accent-warning)', fontWeight: 600 }}>
              Pending Optimization
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
