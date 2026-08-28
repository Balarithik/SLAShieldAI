import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { RiskBadge, PriorityBadge, ActionBadge } from './Badges';

export function EscalationQueue({ tickets }) {
  const hasTickets = tickets && tickets.length > 0;

  return (
    <div className="soc-panel">
      <div className="soc-panel-header">
        <span className="soc-panel-title"><AlertTriangle size={14} /> Escalation Queue</span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {hasTickets ? `${tickets.length} ticket${tickets.length > 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {!hasTickets ? (
        <div className="soc-panel-body" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>
          No tickets require escalation
        </div>
      ) : (
        <div className="table-responsive">
          <table className="clean-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Severity</th>
                <th>Breach Prob.</th>
                <th>Escalation</th>
                <th>Current Analyst</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.ticket_id}>
                  <td className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{t.ticket_id}</td>
                  <td><span className={`badge badge-${(t.severity || 'high').toLowerCase()}`}>{t.severity}</span></td>
                  <td><RiskBadge value={t.sla_risk} /></td>
                  <td><PriorityBadge priority={t.escalation_priority} /></td>
                  <td className="font-mono">{t.current_analyst}</td>
                  <td><ActionBadge action={t.recommended_action} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
