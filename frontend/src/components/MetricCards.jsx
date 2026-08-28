import React from 'react';
import { TrendingDown, ArrowDownRight, ArrowUpRight, Minus, RefreshCw, AlertTriangle, ArrowUp, Check } from 'lucide-react';

export function MetricCards({ metrics, activeCount, riskBreakdown }) {
  const avoided = metrics?.breaches_avoided ?? 0;
  const reductionPct = metrics?.breach_reduction_pct ?? 0;
  const highRisk = riskBreakdown?.total_high_risk ?? 0;

  return (
    <div className="metric-row">
      <div className="metric-box">
        <div className="metric-label">Active Tickets</div>
        <div className="metric-value">{activeCount ?? 0}</div>
      </div>

      <div className="metric-box">
        <div className="metric-label">High / Critical Risk</div>
        <div className="metric-value" style={{ color: highRisk > 0 ? '#fb7185' : '#34d399' }}>
          {highRisk}
        </div>
        <div className="metric-subtext">
          {(riskBreakdown?.critical ?? 0)} critical · {(riskBreakdown?.high ?? 0)} high
        </div>
      </div>

      <div className="metric-box highlight">
        <div className="metric-label">Breaches Avoided by AI</div>
        <div className="metric-value" style={{ color: 'var(--accent-blue)' }}>
          {typeof avoided === 'number' ? avoided.toFixed(2) : '—'}
        </div>
        <div className="metric-subtext" style={{ color: reductionPct > 0 ? '#34d399' : 'var(--text-muted)' }}>
          {reductionPct > 0 ? `↓ ${reductionPct.toFixed(1)}% reduction` : 'Run optimization to see impact'}
        </div>
      </div>
    </div>
  );
}
