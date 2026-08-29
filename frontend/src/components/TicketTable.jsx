import React, { useState, useEffect, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { RiskBadge, PriorityBadge, SeverityBadge } from './Badges';

function formatCountdown(seconds) {
  if (seconds == null || seconds <= 0) return '00:00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function countdownColor(seconds, slaHours) {
  if (seconds == null) return 'var(--text-muted)';
  const total = (slaHours || 4) * 3600;
  const ratio = seconds / total;
  if (ratio <= 0.1) return '#f43f5e';
  if (ratio <= 0.25) return '#f59e0b';
  if (ratio <= 0.5) return '#eab308';
  return '#10b981';
}

const PAGE_SIZE = 15;

export function TicketTable({ tickets, onTicketClick }) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    let list = tickets || [];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.ticket_id?.toLowerCase().includes(q) ||
        t.incident_type?.toLowerCase().includes(q) ||
        t.assigned_analyst?.toLowerCase().includes(q)
      );
    }
    if (severityFilter) list = list.filter(t => t.predicted_severity === severityFilter);
    if (priorityFilter) list = list.filter(t => t.priority === priorityFilter);
    if (riskFilter === 'high') list = list.filter(t => (t.sla_breach_probability_after ?? t.sla_breach_probability_before ?? 0) >= 50);
    if (riskFilter === 'low') list = list.filter(t => (t.sla_breach_probability_after ?? t.sla_breach_probability_before ?? 0) < 50);
    return list;
  }, [tickets, search, severityFilter, priorityFilter, riskFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, severityFilter, priorityFilter, riskFilter]);

  return (
    <div className="soc-panel">
      <div className="soc-panel-header">
        <span className="soc-panel-title">Active Tickets</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{filtered.length} ticket{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '280px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            style={{ width: '100%', paddingLeft: '30px' }}
            placeholder="Search tickets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
          <option value="">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select className="form-select" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="P3">P3</option>
          <option value="P4">P4</option>
        </select>
        <select className="form-select" value={riskFilter} onChange={e => setRiskFilter(e.target.value)}>
          <option value="">All Risk</option>
          <option value="high">High Risk (≥50%)</option>
          <option value="low">Lower Risk (&lt;50%)</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-responsive">
        <table className="clean-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Severity</th>
              <th>SLA</th>
              <th>Breach Prob.</th>
              <th>Analyst</th>
              <th>Queue Pos.</th>
              <th>Queue Delay</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  {(tickets || []).length === 0 ? 'No ticket data available' : 'No tickets match current filters'}
                </td>
              </tr>
            ) : paged.map(t => {
              const prob = Number(t.sla_breach_probability_after ?? t.sla_breach_probability_before ?? 0);
              const remaining = typeof t.remaining_seconds === 'number'
                ? Math.max(0, t.remaining_seconds)
                : (t.deadline ? Math.max(0, Math.floor((new Date(t.deadline).getTime() - now) / 1000)) : null);
              const queueDelay = Number(t.predicted_queue_delay ?? 0);
              const action = t.recommended_action || t.action || 'KEEP_CURRENT';

              return (
                <tr key={t.ticket_id} onClick={() => onTicketClick && onTicketClick(t)}>
                  <td>
                    <span className="font-mono" style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>
                      {t.ticket_id}
                    </span>
                  </td>
                  <td><SeverityBadge severity={t.predicted_severity} /></td>
                  <td>
                    <span className="font-mono" style={{ color: countdownColor(remaining, t.sla_hours), fontWeight: 600 }}>
                      {remaining != null ? formatCountdown(remaining) : '—'}
                    </span>
                  </td>
                  <td><RiskBadge value={prob} /></td>
                  <td className="font-mono">{t.assigned_analyst_after || t.assigned_analyst}</td>
                  <td className="font-mono">{t.new_position ?? t.original_position ?? '-'}</td>
                  <td className="font-mono">{Number.isFinite(queueDelay) ? `${queueDelay.toFixed(1)}m` : '—'}</td>
                  <td>
                    <span className={`badge ${action.toLowerCase().includes('reassign') ? 'badge-reassign' : action.toLowerCase().includes('escalat') ? 'badge-escalate' : action.toLowerCase().includes('priorit') ? 'badge-prioritize' : 'badge-keep'}`}>
                      {action.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft size={14} />
            </button>
            <button className="btn btn-ghost" style={{ padding: '4px 8px' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
