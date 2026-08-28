import React from 'react';
import { Zap, RefreshCw, ArrowUp, AlertTriangle, Check } from 'lucide-react';

export function OptimizationImpact({ metrics }) {
  if (!metrics || metrics.breaches_avoided == null || metrics.breaches_avoided === 0) {
    return (
      <div className="soc-panel">
        <div className="soc-panel-header">
          <span className="soc-panel-title"><Zap size={14} /> AI Decision Impact</span>
        </div>
        <div className="soc-panel-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>
          Run AI Optimization to see impact analysis
        </div>
      </div>
    );
  }

  const {
    expected_breaches_before,
    expected_breaches_after,
    breaches_avoided,
    breach_reduction_pct,
    reassignments,
    escalations,
    prioritizations,
    kept_current
  } = metrics;

  return (
    <div className="soc-panel">
      <div className="soc-panel-header">
        <span className="soc-panel-title"><Zap size={14} /> AI Decision Impact</span>
      </div>
      <div className="soc-panel-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px', marginBottom: '18px' }}>
          <div>
            <div className="metric-label">Breaches Before AI</div>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fb7185' }}>
              {typeof expected_breaches_before === 'number' ? expected_breaches_before.toFixed(2) : '—'}
            </div>
          </div>
          <div>
            <div className="metric-label">Breaches After AI</div>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>
              {typeof expected_breaches_after === 'number' ? expected_breaches_after.toFixed(2) : '—'}
            </div>
          </div>
          <div>
            <div className="metric-label">Breaches Avoided</div>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>
              {typeof breaches_avoided === 'number' ? breaches_avoided.toFixed(2) : '—'}
            </div>
          </div>
          <div>
            <div className="metric-label">Reduction</div>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>
              {typeof breach_reduction_pct === 'number' ? `${breach_reduction_pct.toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
          <div className="metric-label" style={{ marginBottom: '8px' }}>AI Agent Decisions</div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={13} color="#38bdf8" />
              <span style={{ color: 'var(--text-secondary)' }}>Reassignments:</span>
              <strong className="font-mono">{reassignments ?? 0}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={13} color="#f43f5e" />
              <span style={{ color: 'var(--text-secondary)' }}>Escalations:</span>
              <strong className="font-mono">{escalations ?? 0}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ArrowUp size={13} color="#f59e0b" />
              <span style={{ color: 'var(--text-secondary)' }}>Prioritizations:</span>
              <strong className="font-mono">{prioritizations ?? 0}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={13} color="#64748b" />
              <span style={{ color: 'var(--text-secondary)' }}>Kept Current:</span>
              <strong className="font-mono">{kept_current ?? 0}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
