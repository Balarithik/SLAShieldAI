import React from 'react';
import { TrendingDown } from 'lucide-react';

export function BreachTrend({ trends }) {
  const hasTrends = trends && trends.length >= 2;

  if (!hasTrends) {
    return (
      <div className="soc-panel">
        <div className="soc-panel-header">
          <span className="soc-panel-title"><TrendingDown size={14} /> Breach Trend</span>
        </div>
        <div className="soc-panel-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>
          Insufficient historical data for trend analysis
        </div>
      </div>
    );
  }

  // SVG chart
  const width = 480;
  const height = 160;
  const pad = { top: 16, right: 20, bottom: 28, left: 40 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const maxVal = Math.max(...trends.map(t => Math.max(t.breaches_before || 0, t.breaches_after || 0)), 1);
  const xStep = chartW / Math.max(trends.length - 1, 1);

  const points = (key) => trends.map((t, i) => {
    const x = pad.left + i * xStep;
    const y = pad.top + chartH - (((t[key] || 0) / maxVal) * chartH);
    return `${x},${y}`;
  }).join(' ');

  const yTicks = [0, Math.round(maxVal / 2 * 10) / 10, Math.round(maxVal * 10) / 10];

  return (
    <div className="soc-panel">
      <div className="soc-panel-header">
        <span className="soc-panel-title"><TrendingDown size={14} /> Breach Trend</span>
        <div style={{ display: 'flex', gap: '14px', fontSize: '0.72rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '12px', height: '3px', background: '#f43f5e', display: 'inline-block', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-muted)' }}>Before AI</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '12px', height: '3px', background: '#38bdf8', display: 'inline-block', borderRadius: '2px' }} />
            <span style={{ color: 'var(--text-muted)' }}>After AI</span>
          </span>
        </div>
      </div>
      <div className="soc-panel-body" style={{ display: 'flex', justifyContent: 'center' }}>
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ maxWidth: `${width}px` }}>
          {/* Y axis ticks */}
          {yTicks.map((v, i) => {
            const y = pad.top + chartH - ((v / maxVal) * chartH);
            return (
              <g key={i}>
                <line x1={pad.left} y1={y} x2={pad.left + chartW} y2={y} stroke="#1e293b" strokeWidth="1" />
                <text x={pad.left - 6} y={y + 3} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">{v}</text>
              </g>
            );
          })}

          {/* X axis labels */}
          {trends.map((t, i) => (
            <text key={i} x={pad.left + i * xStep} y={height - 4} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono">
              {t.display_time || t.timestamp?.split('T').pop()?.slice(0, 8) || `#${i + 1}`}
            </text>
          ))}

          {/* Before line */}
          <polyline points={points('breaches_before')} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinejoin="round" />
          {/* After line */}
          <polyline points={points('breaches_after')} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round" />

          {/* Dots */}
          {trends.map((t, i) => {
            const x = pad.left + i * xStep;
            return (
              <g key={i}>
                <circle cx={x} cy={pad.top + chartH - (((t.breaches_before || 0) / maxVal) * chartH)} r="3" fill="#f43f5e" />
                <circle cx={x} cy={pad.top + chartH - (((t.breaches_after || 0) / maxVal) * chartH)} r="3" fill="#38bdf8" />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
