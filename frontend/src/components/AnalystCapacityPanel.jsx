import React from 'react';
import { Users, AlertTriangle, CheckCircle, Flame, Shield } from 'lucide-react';

export function AnalystCapacityPanel({ analysts, onWorkloadChange }) {
  const list = analysts || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OVERLOADED':
        return <span className="badge badge-critical"><Flame size={12} /> Overloaded</span>;
      case 'BUSY':
        return <span className="badge badge-high"><AlertTriangle size={12} /> Busy</span>;
      case 'MODERATE':
        return <span className="badge badge-medium">Moderate</span>;
      case 'AVAILABLE':
        return <span className="badge badge-low"><CheckCircle size={12} /> Available</span>;
      default:
        return <span className="badge badge-p4">Offline</span>;
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--cyan-primary)" />
            SOC Analyst Fleet Capacity & Workload
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Dynamic capacity awareness used by AI optimizer to balance incident assignment without overloading.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
        {list.map((analyst) => {
          const util = analyst.utilization_pct || 0;
          const isOverloaded = util >= 90;
          const isAvailable = util < 50;

          return (
            <div 
              key={analyst.analyst_id} 
              className="glass-panel" 
              style={{ 
                padding: '16px', 
                background: isOverloaded ? 'rgba(244, 63, 94, 0.08)' : 'rgba(11, 17, 26, 0.6)',
                borderColor: isOverloaded ? 'rgba(244, 63, 94, 0.4)' : isAvailable ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="font-mono" style={{ fontWeight: 800, color: 'var(--cyan-primary)', fontSize: '1rem' }}>
                      {analyst.analyst_id}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{analyst.name}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {analyst.experience_years} Years IR Experience &bull; {analyst.active_tickets} Assigned
                  </div>
                </div>
                <div>{getStatusBadge(analyst.capacity_status)}</div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Current Workload:</span>
                  <span className="font-mono" style={{ fontWeight: 700 }}>
                    {analyst.current_workload} / {analyst.maximum_capacity} ({util}%)
                  </span>
                </div>
                <div className="progress-track" style={{ height: '8px' }}>
                  <div 
                    className={`progress-fill ${util >= 90 ? 'rose' : util >= 70 ? 'amber' : 'emerald'}`}
                    style={{ width: `${Math.min(100, util)}%` }}
                  />
                </div>
              </div>

              {/* Skills Tags */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '10px' }}>
                {(analyst.skills || []).map((skill, idx) => (
                  <span key={idx} style={{ 
                    fontSize: '0.68rem', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--text-muted)'
                  }}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
