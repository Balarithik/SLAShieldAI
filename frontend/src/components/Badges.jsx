import React from 'react';

export function RiskBadge({ value, size = 'default' }) {
  const pct = typeof value === 'number' ? value : parseFloat(value) || 0;
  let cls = 'badge-low';
  let label = 'LOW';

  if (pct >= 70) { cls = 'badge-critical'; label = 'CRITICAL'; }
  else if (pct >= 50) { cls = 'badge-high'; label = 'HIGH'; }
  else if (pct >= 25) { cls = 'badge-medium'; label = 'MEDIUM'; }

  return (
    <span className={`badge ${cls}`} style={size === 'sm' ? { fontSize: '0.65rem', padding: '1px 4px' } : {}}>
      {Math.round(pct)}%
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const p = (priority || 'P4').toUpperCase();
  const cls = p === 'P1' ? 'badge-p1' : p === 'P2' ? 'badge-p2' : p === 'P3' ? 'badge-p3' : 'badge-p4';
  return <span className={`badge ${cls}`}>{p}</span>;
}

export function SeverityBadge({ severity }) {
  const s = (severity || 'Low').toLowerCase();
  const cls = s === 'critical' ? 'badge-critical' : s === 'high' ? 'badge-high' : s === 'medium' ? 'badge-medium' : 'badge-low';
  return <span className={`badge ${cls}`}>{severity || 'Low'}</span>;
}

export function ActionBadge({ action }) {
  const a = (action || 'KEEP_CURRENT').toUpperCase();
  let cls = 'badge-keep';
  let label = 'KEEP';
  if (a.includes('REASSIGN')) { cls = 'badge-reassign'; label = 'REASSIGN'; }
  else if (a.includes('ESCALAT')) { cls = 'badge-escalate'; label = 'ESCALATE'; }
  else if (a.includes('PRIORIT')) { cls = 'badge-prioritize'; label = 'PRIORITIZE'; }
  return <span className={`badge ${cls}`}>{label}</span>;
}
