import React from 'react';
import { TrendingUp, ShieldCheck, Activity } from 'lucide-react';

export function BreachTrendChart({ trends }) {
  const data = trends || [];

  if (data.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '22px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={18} color="var(--cyan-primary)" />
          SLA Breach Prevention Trend
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Run AI Optimization to generate historical trend comparison data.
        </p>
      </div>
    );
  }

  // Determine max values for scaling
  const maxBreaches = Math.max(...data.map(d => Math.max(d.breaches_before || 0, d.breaches_after || 0)), 6);
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 20;

  const pointsBefore = data.map((d, idx) => {
    const x = paddingX + (idx / Math.max(1, data.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((d.breaches_before || 0) / maxBreaches) * (chartHeight - paddingY * 2);
    return `${x},${y}`;
  }).join(' ');

  const pointsAfter = data.map((d, idx) => {
    const x = paddingX + (idx / Math.max(1, data.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - ((d.breaches_after || 0) / maxBreaches) * (chartHeight - paddingY * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="glass-panel" style={{ padding: '22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} color="var(--cyan-primary)" />
            SLA Breach Prevention Trajectory
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Expected breach reduction across consecutive AI queue optimization runs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f43f5e' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Before AI</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>After AI</span>
          </div>
        </div>
      </div>

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: 'auto', minHeight: '180px' }}>
          {/* Grid lines */}
          <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="rgba(255,255,255,0.12)" />

          {/* Y Axis Labels */}
          <text x={paddingX - 10} y={paddingY + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">{maxBreaches.toFixed(1)}</text>
          <text x={paddingX - 10} y={chartHeight / 2 + 4} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">{(maxBreaches / 2).toFixed(1)}</text>
          <text x={paddingX - 10} y={chartHeight - paddingY} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">0.0</text>

          {/* Before AI Polyline */}
          <polyline
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsBefore}
          />

          {/* After AI Polyline */}
          <polyline
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsAfter}
          />

          {/* Data Points */}
          {data.map((d, idx) => {
            const x = paddingX + (idx / Math.max(1, data.length - 1)) * (chartWidth - paddingX * 2);
            const yB = chartHeight - paddingY - ((d.breaches_before || 0) / maxBreaches) * (chartHeight - paddingY * 2);
            const yA = chartHeight - paddingY - ((d.breaches_after || 0) / maxBreaches) * (chartHeight - paddingY * 2);

            return (
              <g key={idx}>
                <circle cx={x} cy={yB} r="4" fill="#f43f5e" />
                <circle cx={x} cy={yA} r="4" fill="#10b981" />
                <text x={x} y={chartHeight - 4} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
                  {d.display_time || d.timestamp?.slice(11, 16) || `R${idx + 1}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
