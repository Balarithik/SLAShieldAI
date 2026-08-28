import React, { useState } from 'react';
import { 
  ArrowUp, ArrowRight, RefreshCw, AlertTriangle, 
  CheckCircle, ArrowUpDown, Filter, Sparkles, HelpCircle 
} from 'lucide-react';

export function QueueComparisonTable({ beforeQueue, afterQueue, metrics }) {
  const [viewMode, setViewMode] = useState('after'); // 'after' | 'before' | 'comparison'
  const [actionFilter, setActionFilter] = useState('ALL');

  const afterList = (afterQueue || []).filter(item => {
    if (actionFilter === 'ALL') return true;
    return item.action === actionFilter;
  });

  const beforeList = beforeQueue || [];

  const getActionBadge = (action) => {
    switch (action) {
      case 'REASSIGN':
        return <span className="badge badge-action-reassign"><RefreshCw size={12} /> REASSIGN</span>;
      case 'ESCALATE':
        return <span className="badge badge-action-escalate"><AlertTriangle size={12} /> ESCALATE</span>;
      case 'PRIORITIZE':
        return <span className="badge badge-action-prio"><ArrowUp size={12} /> PRIORITIZE</span>;
      default:
        return <span className="badge badge-action-keep"><CheckCircle size={12} /> KEEP_CURRENT</span>;
    }
  };

  const getMovementIcon = (movement) => {
    if (!movement || movement === 'KEPT') {
      return <span style={{ color: 'var(--text-muted)' }}>&harr;</span>;
    }
    if (movement.startsWith('UP')) {
      return <span style={{ color: '#34d399', fontWeight: 800 }}>&uarr; {movement.replace('UP_', '+')}</span>;
    }
    if (movement.startsWith('DOWN')) {
      return <span style={{ color: '#fb7185', fontWeight: 800 }}>&darr; {movement.replace('DOWN_', '-')}</span>;
    }
    return null;
  };

  return (
    <div className="glass-panel" style={{ padding: '22px' }}>
      {/* Table Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--cyan-primary)" />
            AI Optimized Queue vs Original Baseline
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Dynamic AI queue re-plan minimizing expected SLA breaches based on severity, workload, and predicted delay.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* View Mode Toggle */}
          <div className="nav-tabs">
            <button 
              className={`nav-tab ${viewMode === 'after' ? 'active' : ''}`}
              onClick={() => setViewMode('after')}
            >
              After AI (Optimized)
            </button>
            <button 
              className={`nav-tab ${viewMode === 'before' ? 'active' : ''}`}
              onClick={() => setViewMode('before')}
            >
              Before AI (Original)
            </button>
          </div>

          {/* Action Filter */}
          {viewMode === 'after' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Filter size={14} color="var(--text-muted)" />
              <select 
                className="form-select" 
                style={{ padding: '6px 10px', fontSize: '0.8rem', width: 'auto' }}
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
              >
                <option value="ALL">All Actions ({afterQueue?.length || 0})</option>
                <option value="REASSIGN">Reassignments ({metrics?.reassignments || 0})</option>
                <option value="ESCALATE">Escalations ({metrics?.escalations || 0})</option>
                <option value="PRIORITIZE">Prioritizations ({metrics?.prioritizations || 0})</option>
                <option value="KEEP_CURRENT">Kept Current ({metrics?.kept_current || 0})</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="table-container">
        {viewMode === 'after' ? (
          <table className="soc-table">
            <thead>
              <tr>
                <th>New Pos</th>
                <th>Shift</th>
                <th>Ticket ID</th>
                <th>Severity</th>
                <th>Analyst Transition</th>
                <th>SLA Risk Shift</th>
                <th>Queue Delay</th>
                <th>Action</th>
                <th>AI Decision Rationale</th>
              </tr>
            </thead>
            <tbody>
              {afterList.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                    No tickets found matching current action filter.
                  </td>
                </tr>
              ) : (
                afterList.map((t) => {
                  const riskBefore = Number(t.sla_risk_before).toFixed(0);
                  const riskAfter = Number(t.sla_risk_after).toFixed(0);
                  const riskReduced = Number(riskBefore) - Number(riskAfter);
                  const isShifted = t.action !== 'KEEP_CURRENT';

                  return (
                    <tr 
                      key={t.ticket_id}
                      className={
                        t.action === 'REASSIGN' ? 'highlight-reassign' : 
                        t.action === 'ESCALATE' ? 'highlight-escalate' : 
                        t.action === 'PRIORITIZE' ? 'highlight-prio' : ''
                      }
                    >
                      <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                        <span style={{ 
                          background: 'rgba(0, 229, 255, 0.12)', 
                          color: 'var(--cyan-primary)', 
                          padding: '3px 8px', 
                          borderRadius: '4px',
                          border: '1px solid rgba(0, 229, 255, 0.3)'
                        }}>
                          #{t.position}
                        </span>
                      </td>
                      <td className="font-mono">{getMovementIcon(t.movement)}</td>
                      <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        <span>{t.ticket_id}</span>
                      </td>
                      <td>
                        <span className={`badge ${
                          t.severity === 'Critical' ? 'badge-critical' : 
                          t.severity === 'High' ? 'badge-high' : 
                          t.severity === 'Medium' ? 'badge-medium' : 'badge-low'
                        }`}>
                          {t.severity}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {t.assigned_analyst_before !== t.assigned_analyst_after ? (
                          <span>
                            <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                              {t.assigned_analyst_before}
                            </span>
                            <span style={{ margin: '0 6px', color: 'var(--cyan-primary)' }}>&rarr;</span>
                            <strong style={{ color: '#38bdf8' }}>{t.assigned_analyst_after}</strong>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)' }}>{t.assigned_analyst_after}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{riskBefore}%</span>
                          <span style={{ color: 'var(--cyan-primary)' }}>&rarr;</span>
                          <strong className="font-mono" style={{ color: riskAfter < 30 ? '#34d399' : riskAfter < 60 ? '#fbbf24' : '#fb7185' }}>
                            {riskAfter}%
                          </strong>
                          {riskReduced > 0 && (
                            <span className="badge badge-low" style={{ fontSize: '0.68rem', padding: '1px 4px' }}>
                              -{riskReduced}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="font-mono" style={{ fontSize: '0.8rem' }}>
                        {t.predicted_queue_delay} min
                      </td>
                      <td>{getActionBadge(t.action)}</td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: '320px' }}>
                        {t.reason}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          <table className="soc-table">
            <thead>
              <tr>
                <th>Original Pos</th>
                <th>Ticket ID</th>
                <th>Incident Type</th>
                <th>Severity</th>
                <th>Priority</th>
                <th>Assigned Analyst</th>
                <th>SLA Limit</th>
                <th>Baseline SLA Risk</th>
                <th>Predicted Delay</th>
                <th>Resolution Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {beforeList.map((t) => (
                <tr key={t.ticket_id}>
                  <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    #{t.position}
                  </td>
                  <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {t.ticket_id}
                  </td>
                  <td>{t.incident_type}</td>
                  <td>
                    <span className={`badge ${
                      t.severity === 'Critical' ? 'badge-critical' : 
                      t.severity === 'High' ? 'badge-high' : 
                      t.severity === 'Medium' ? 'badge-medium' : 'badge-low'
                    }`}>
                      {t.severity}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      t.priority === 'P1' ? 'badge-p1' : 
                      t.priority === 'P2' ? 'badge-p2' : 
                      t.priority === 'P3' ? 'badge-p3' : 'badge-p4'
                    }`}>
                      {t.priority}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{t.assigned_analyst}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{t.sla_hours}h</td>
                  <td>
                    <span className="font-mono" style={{ 
                      fontWeight: 800, 
                      color: t.sla_risk >= 70 ? '#fb7185' : t.sla_risk >= 40 ? '#fbbf24' : '#34d399' 
                    }}>
                      {Number(t.sla_risk).toFixed(0)}%
                    </span>
                  </td>
                  <td className="font-mono">{t.predicted_queue_delay} min</td>
                  <td className="font-mono">{t.predicted_resolution_hours} hrs</td>
                  <td>
                    <span className="badge badge-action-keep">{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
