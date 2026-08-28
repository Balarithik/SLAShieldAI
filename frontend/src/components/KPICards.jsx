import React from 'react';
import { 
  ShieldAlert, AlertTriangle, ShieldCheck, Clock, 
  Users, Activity, ArrowDownRight, ArrowUpRight, TrendingDown 
} from 'lucide-react';

export function KPICards({ metrics, activeCount, severityBreakdown, riskBreakdown, analystFleet }) {
  const kpi = metrics || {};
  const expectedBefore = kpi.expected_breaches_before ?? 0;
  const expectedAfter = kpi.expected_breaches_after ?? 0;
  const breachesAvoided = kpi.breaches_avoided ?? Math.max(0, expectedBefore - expectedAfter);
  const breachReductionPct = kpi.breach_reduction_pct ?? (expectedBefore > 0 ? ((breachesAvoided / expectedBefore) * 100).toFixed(1) : 0);

  const delayBefore = kpi.average_queue_delay_before ?? 0;
  const delayAfter = kpi.average_queue_delay_after ?? 0;
  const delayReductionPct = kpi.delay_reduction_pct ?? (delayBefore > 0 ? (((delayBefore - delayAfter) / delayBefore) * 100).toFixed(1) : 0);

  const utilization = analystFleet?.utilization_pct ?? 0;

  return (
    <div className="kpi-grid">
      {/* 1. Active Incidents */}
      <div className="glass-panel kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Active Queue Incidents</span>
          <div className="kpi-icon-box">
            <Activity size={18} />
          </div>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value">{activeCount || 0}</span>
          <span className="kpi-delta positive font-mono">Live</span>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
          <span className="badge badge-critical">Crit: {severityBreakdown?.Critical || 0}</span>
          <span className="badge badge-high">High: {severityBreakdown?.High || 0}</span>
          <span className="badge badge-medium">Med: {severityBreakdown?.Medium || 0}</span>
          <span className="badge badge-low">Low: {severityBreakdown?.Low || 0}</span>
        </div>
      </div>

      {/* 2. High Risk Tickets */}
      <div className="glass-panel kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Critical & High SLA Risk</span>
          <div className="kpi-icon-box" style={{ color: '#f43f5e' }}>
            <AlertTriangle size={18} />
          </div>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value" style={{ color: riskBreakdown?.total_high_risk > 0 ? '#fb7185' : '#ffffff' }}>
            {riskBreakdown?.total_high_risk ?? 0}
          </span>
          <span className={`kpi-delta ${riskBreakdown?.total_high_risk > 0 ? 'negative' : 'positive'}`}>
            {riskBreakdown?.critical ?? 0} Critical
          </span>
        </div>
        <div className="kpi-subtext">
          Tickets with &ge; 50% ML predicted probability of breaching SLA deadline.
        </div>
      </div>

      {/* 3. Expected Breaches Before vs After */}
      <div className="glass-panel kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Expected Breaches (Before → After)</span>
          <div className="kpi-icon-box">
            <Clock size={18} />
          </div>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value font-mono" style={{ fontSize: '1.75rem' }}>
            <span style={{ color: '#94a3b8' }}>{Number(expectedBefore).toFixed(2)}</span>
            <span style={{ color: 'var(--cyan-primary)', margin: '0 8px' }}>&rarr;</span>
            <span style={{ color: '#34d399' }}>{Number(expectedAfter).toFixed(2)}</span>
          </span>
        </div>
        <div className="kpi-subtext">
          Sum of statistical SLA breach probabilities across active incidents.
        </div>
      </div>

      {/* 4. Breaches Avoided by AI (HERO CARD) */}
      <div className="glass-panel kpi-card hero-kpi">
        <div className="kpi-header">
          <span className="kpi-title" style={{ color: 'var(--cyan-primary)', fontWeight: 800 }}>
            Breaches Avoided By AI
          </span>
          <div className="kpi-icon-box" style={{ background: 'rgba(0, 229, 255, 0.2)', color: 'var(--cyan-primary)' }}>
            <ShieldCheck size={20} strokeWidth={2.4} />
          </div>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value" style={{ color: 'var(--cyan-primary)', textShadow: '0 0 20px rgba(0, 229, 255, 0.5)' }}>
            {Number(breachesAvoided).toFixed(2)}
          </span>
          <span className="kpi-delta positive font-mono">
            <TrendingDown size={14} /> -{breachReductionPct}% Breach Risk
          </span>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
          <span className="badge badge-action-reassign">Reassigned: {kpi.reassignments || 0}</span>
          <span className="badge badge-action-escalate">Escalated: {kpi.escalations || 0}</span>
          <span className="badge badge-action-prio">Prioritized: {kpi.prioritizations || 0}</span>
        </div>
      </div>

      {/* 5. Average Queue Delay */}
      <div className="glass-panel kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">Average Queue Delay</span>
          <div className="kpi-icon-box">
            <Clock size={18} />
          </div>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value font-mono" style={{ fontSize: '1.75rem' }}>
            <span style={{ color: '#94a3b8' }}>{Number(delayBefore).toFixed(1)}m</span>
            <span style={{ color: 'var(--cyan-primary)', margin: '0 6px' }}>&rarr;</span>
            <span style={{ color: '#38bdf8' }}>{Number(delayAfter).toFixed(1)}m</span>
          </span>
          {Number(delayReductionPct) > 0 && (
            <span className="kpi-delta positive font-mono">
              -{delayReductionPct}%
            </span>
          )}
        </div>
        <div className="kpi-subtext">
          Predicted wait time before active analyst incident triage commences.
        </div>
      </div>

      {/* 6. Fleet Capacity Utilization */}
      <div className="glass-panel kpi-card">
        <div className="kpi-header">
          <span className="kpi-title">SOC Fleet Utilization</span>
          <div className="kpi-icon-box">
            <Users size={18} />
          </div>
        </div>
        <div className="kpi-value-row">
          <span className="kpi-value font-mono">{utilization}%</span>
          <span className={`kpi-delta ${utilization > 85 ? 'negative' : 'positive'}`}>
            {analystFleet?.total_workload || 0} / {analystFleet?.total_capacity || 0} Tickets
          </span>
        </div>
        <div className="progress-track" style={{ marginTop: '10px' }}>
          <div 
            className={`progress-fill ${utilization > 85 ? 'rose' : utilization > 70 ? 'amber' : 'cyan'}`}
            style={{ width: `${Math.min(100, utilization)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
