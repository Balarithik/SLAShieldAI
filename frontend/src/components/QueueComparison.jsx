import React, { useState } from 'react';
import { GitCompare } from 'lucide-react';
import { RiskBadge, ActionBadge } from './Badges';

export function QueueComparison({ beforeQueue, afterQueue }) {
  const [view, setView] = useState('after');

  const hasBefore = beforeQueue && beforeQueue.length > 0;
  const hasAfter = afterQueue && afterQueue.length > 0;

  if (!hasBefore && !hasAfter) {
    return (
      <div className="soc-panel">
        <div className="soc-panel-header">
          <span className="soc-panel-title"><GitCompare size={14} /> Before vs After AI</span>
        </div>
        <div className="soc-panel-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>
          Run AI Optimization to compare queue changes
        </div>
      </div>
    );
  }

  return (
    <div className="soc-panel">
      <div className="soc-panel-header">
        <span className="soc-panel-title"><GitCompare size={14} /> Before vs After AI</span>
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            className={`btn ${view === 'before' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '3px 10px', fontSize: '0.72rem' }}
            onClick={() => setView('before')}
          >
            Before AI
          </button>
          <button
            className={`btn ${view === 'after' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '3px 10px', fontSize: '0.72rem' }}
            onClick={() => setView('after')}
          >
            After AI
          </button>
        </div>
      </div>

      <div className="table-responsive">
        {view === 'before' ? (
          <table className="clean-table">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Ticket ID</th>
                <th>Analyst</th>
                <th>Breach Prob.</th>
              </tr>
            </thead>
            <tbody>
              {(beforeQueue || []).map(t => (
                <tr key={t.ticket_id}>
                  <td className="font-mono" style={{ color: 'var(--text-muted)' }}>#{t.original_position || t.position}</td>
                  <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{t.ticket_id}</td>
                  <td className="font-mono">{t.assigned_analyst}</td>
                  <td><RiskBadge value={t.sla_breach_probability_before ?? t.sla_risk ?? 0} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="clean-table">
            <thead>
              <tr>
                <th>Pos</th>
                <th>Ticket ID</th>
                <th>Analyst</th>
                <th>Breach Prob.</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {(afterQueue || []).map(t => {
                const analystBefore = t.assigned_analyst;
                const analystAfter = t.assigned_analyst_after || t.assigned_analyst;
                const riskBefore = t.sla_breach_probability_before ?? 0;
                const riskAfter = t.sla_breach_probability_after ?? riskBefore;
                const hasChange = t.recommended_action && t.recommended_action !== 'KEEP_CURRENT';
                const posShift = (t.original_position || 1) - (t.new_position || 1);

                return (
                  <tr key={t.ticket_id} style={hasChange ? { background: 'rgba(56, 189, 248, 0.04)' } : {}}>
                    <td className="font-mono">
                      <span style={{ color: posShift > 0 ? '#10b981' : posShift < 0 ? '#f59e0b' : 'var(--text-muted)' }}>
                        #{t.new_position || t.original_position}
                        {posShift > 0 && <span style={{ fontSize: '0.7rem' }}> ↑{posShift}</span>}
                        {posShift < 0 && <span style={{ fontSize: '0.7rem' }}> ↓{Math.abs(posShift)}</span>}
                      </span>
                    </td>
                    <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{t.ticket_id}</td>
                    <td className="font-mono">
                      {analystBefore !== analystAfter ? (
                        <span>
                          <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{analystBefore}</span>
                          <span style={{ color: 'var(--accent-blue)', margin: '0 4px' }}>→</span>
                          <strong style={{ color: '#38bdf8' }}>{analystAfter}</strong>
                        </span>
                      ) : (
                        <span>{analystAfter}</span>
                      )}
                    </td>
                    <td>
                      {riskBefore !== riskAfter ? (
                        <span className="font-mono" style={{ fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{Math.round(riskBefore)}%</span>
                          <span style={{ color: '#64748b', margin: '0 3px' }}>→</span>
                          <span style={{ color: riskAfter < riskBefore ? '#34d399' : '#fb7185', fontWeight: 700 }}>{Math.round(riskAfter)}%</span>
                        </span>
                      ) : (
                        <RiskBadge value={riskAfter} />
                      )}
                    </td>
                    <td><ActionBadge action={t.recommended_action} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
