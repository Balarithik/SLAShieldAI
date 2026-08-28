import React, { useState, useEffect } from 'react';
import { Timer, AlertOctagon, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';

export function SLACountdownRadar({ tickets, onSelectTicket }) {
  // Local state to re-render countdown tick every second
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (deadlineStr) => {
    if (!deadlineStr) return { text: 'No Deadline', color: '#64748b', status: 'SAFE' };
    
    const deadline = new Date(deadlineStr).getTime();
    const now = Date.now();
    const diffMs = deadline - now;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec <= 0) {
      return { 
        text: '00:00:00 (BREACHED)', 
        color: '#ef4444', 
        status: 'BREACHED',
        badgeClass: 'badge-critical'
      };
    }

    const hrs = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    const formatted = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (diffSec < 1800) { // < 30 mins
      return { text: formatted, color: '#f43f5e', status: 'CRITICAL', badgeClass: 'badge-critical' };
    } else if (diffSec < 3600) { // < 1 hour
      return { text: formatted, color: '#f97316', status: 'WARNING', badgeClass: 'badge-high' };
    } else if (diffSec < 7200) { // < 2 hours
      return { text: formatted, color: '#eab308', status: 'APPROACHING', badgeClass: 'badge-medium' };
    } else {
      return { text: formatted, color: '#10b981', status: 'SAFE', badgeClass: 'badge-low' };
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'P1': return <span className="badge badge-p1">P1</span>;
      case 'P2': return <span className="badge badge-p2">P2</span>;
      case 'P3': return <span className="badge badge-p3">P3</span>;
      default: return <span className="badge badge-p4">P4</span>;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Timer size={18} color="var(--cyan-primary)" />
            Real-Time SLA Countdown Radar
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Live ticking deadlines prioritized by breach imminence and active risk.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <span className="badge badge-critical">Red: &lt; 30m</span>
          <span className="badge badge-high">Orange: &lt; 1h</span>
          <span className="badge badge-medium">Yellow: &lt; 2h</span>
          <span className="badge badge-low">Green: Safe</span>
        </div>
      </div>

      <div className="table-container" style={{ maxHeight: '380px' }}>
        <table className="soc-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Incident Type</th>
              <th>Priority</th>
              <th>Analyst</th>
              <th>SLA Limit</th>
              <th>Time Remaining</th>
              <th>ML SLA Risk</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!tickets || tickets.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No active incidents in queue.
                </td>
              </tr>
            ) : (
              tickets.map((t) => {
                const countdown = formatCountdown(t.deadline);
                const riskPct = Number(t.sla_risk_pct || 0).toFixed(0);
                const isUrgent = countdown.status === 'CRITICAL' || countdown.status === 'BREACHED';

                return (
                  <tr key={t.ticket_id} style={{ background: isUrgent ? 'rgba(244, 63, 94, 0.06)' : undefined }}>
                    <td style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      <span style={{ color: 'var(--cyan-primary)' }}>{t.ticket_id}</span>
                    </td>
                    <td>{t.incident_type}</td>
                    <td>{getPriorityBadge(t.priority)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      <span style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                        {t.assigned_analyst}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{t.sla_hours}h</td>
                    <td>
                      <div className="countdown-box" style={{ color: countdown.color, border: `1px solid ${countdown.color}40` }}>
                        <Timer size={14} />
                        <span>{countdown.text}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="progress-track" style={{ width: '60px', height: '6px' }}>
                          <div 
                            className={`progress-fill ${riskPct >= 70 ? 'rose' : riskPct >= 40 ? 'amber' : 'emerald'}`}
                            style={{ width: `${riskPct}%` }}
                          />
                        </div>
                        <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.8rem', color: riskPct >= 50 ? '#fb7185' : '#ffffff' }}>
                          {riskPct}%
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${countdown.badgeClass}`}>
                        {countdown.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
