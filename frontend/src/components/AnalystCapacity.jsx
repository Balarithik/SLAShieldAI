import React from 'react';
import { Users } from 'lucide-react';

export function AnalystCapacity({ analysts }) {
  if (!analysts || analysts.length === 0) {
    return (
      <div className="soc-panel">
        <div className="soc-panel-header">
          <span className="soc-panel-title"><Users size={14} /> Analyst Capacity</span>
        </div>
        <div className="soc-panel-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>
          No analyst data available
        </div>
      </div>
    );
  }

  return (
    <div className="soc-panel">
      <div className="soc-panel-header">
        <span className="soc-panel-title"><Users size={14} /> Analyst Capacity</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{analysts.length} analysts</span>
      </div>
      <div className="soc-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {analysts.map(a => {
          const pct = a.utilization_pct ?? (a.maximum_capacity > 0 ? Math.round((a.current_workload / a.maximum_capacity) * 100) : 0);
          const color = pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'green';
          const statusLabel = pct >= 90 ? 'OVERLOADED' : pct >= 70 ? 'BUSY' : 'AVAILABLE';
          const statusColor = pct >= 90 ? '#f43f5e' : pct >= 70 ? '#f59e0b' : '#10b981';

          return (
            <div key={a.analyst_id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.82rem' }}>{a.analyst_id}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{a.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="font-mono" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {a.current_workload} / {a.maximum_capacity}
                  </span>
                  <span className="font-mono" style={{ fontSize: '0.72rem', fontWeight: 700, color: statusColor }}>
                    {pct}% {statusLabel}
                  </span>
                </div>
              </div>
              <div className="meter-bar">
                <div className={`meter-fill ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
