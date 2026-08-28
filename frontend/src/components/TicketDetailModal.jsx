import React from 'react';
import { X } from 'lucide-react';
import { RiskBadge, PriorityBadge, SeverityBadge, ActionBadge } from './Badges';

export function TicketDetailModal({ ticket, isOpen, onClose }) {
  if (!isOpen || !ticket) return null;

  const riskBefore = ticket.sla_breach_probability_before ?? 0;
  const riskAfter = ticket.sla_breach_probability_after ?? riskBefore;
  const analystBefore = ticket.assigned_analyst;
  const analystAfter = ticket.assigned_analyst_after || analystBefore;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px', maxWidth: '580px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="font-mono" style={{ color: 'var(--accent-blue)' }}>{ticket.ticket_id}</span>
            AI Decision Detail
          </h3>
          <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={onClose}><X size={18} /></button>
        </div>

        {/* Ticket Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px', fontSize: '0.82rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Incident Type</span>
            <div style={{ fontWeight: 600 }}>{ticket.incident_type}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Severity</span>
            <div><SeverityBadge severity={ticket.predicted_severity} /></div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Priority</span>
            <div><PriorityBadge priority={ticket.priority} /></div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Threat Score</span>
            <div className="font-mono" style={{ fontWeight: 600 }}>{ticket.threat_score ?? '—'}</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>SLA Window</span>
            <div className="font-mono" style={{ fontWeight: 600 }}>{ticket.sla_hours}h</div>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Escalation</span>
            <div><PriorityBadge priority={ticket.escalation_priority} /></div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginBottom: '16px' }}>
          <div className="metric-label" style={{ marginBottom: '10px' }}>AI Optimization Result</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Assignment</span>
              <div className="font-mono" style={{ fontWeight: 600 }}>
                {analystBefore !== analystAfter ? (
                  <span>
                    <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{analystBefore}</span>
                    <span style={{ color: 'var(--accent-blue)', margin: '0 4px' }}>→</span>
                    <strong style={{ color: '#38bdf8' }}>{analystAfter}</strong>
                  </span>
                ) : analystAfter}
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Action</span>
              <div><ActionBadge action={ticket.recommended_action} /></div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>SLA Risk Before</span>
              <div><RiskBadge value={riskBefore} /></div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>SLA Risk After</span>
              <div><RiskBadge value={riskAfter} /></div>
            </div>
          </div>
        </div>

        {/* Reason */}
        {ticket.reason && (
          <div style={{ 
            borderTop: '1px solid var(--border-subtle)', 
            paddingTop: '14px',
            fontSize: '0.82rem'
          }}>
            <div className="metric-label" style={{ marginBottom: '6px' }}>AI Decision Reason</div>
            <div style={{ 
              background: '#070c18', 
              border: '1px solid var(--border-subtle)', 
              borderRadius: '4px', 
              padding: '12px', 
              color: 'var(--text-secondary)', 
              lineHeight: '1.5',
              fontStyle: 'italic'
            }}>
              "{ticket.reason}"
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
