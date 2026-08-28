import React, { useState } from 'react';
import { 
  Zap, Flame, Users, Clock, ShieldAlert, 
  Layers, Play, CheckCircle2, RefreshCw 
} from 'lucide-react';
import { api } from '../services/api';

export function SimulationPanel({ onScenarioLoaded, onRunOptimization }) {
  const [selectedScenario, setSelectedScenario] = useState('CRITICAL_SURGE');
  const [ticketCount, setTicketCount] = useState(25);
  const [loading, setLoading] = useState(false);
  const [simFeedback, setSimFeedback] = useState(null);

  const scenarios = [
    {
      id: 'NORMAL',
      title: 'Normal SOC Operations',
      icon: Layers,
      color: '#34d399',
      desc: 'Balanced incident inflow across SIEM/EDR, distributed priorities, standard analyst capacity.'
    },
    {
      id: 'CRITICAL_SURGE',
      title: 'Critical Threat Surge',
      icon: Flame,
      color: '#f43f5e',
      desc: 'High concentration of P1/P2 incidents, elevated threat scores (80+), and tight response windows.'
    },
    {
      id: 'ANALYST_OVERLOAD',
      title: 'Analyst Workload Crisis',
      icon: Users,
      color: '#f59e0b',
      desc: 'Tier-1 analysts (A01, A04) spiked beyond 100% capacity while senior analysts have idle headroom.'
    },
    {
      id: 'SLA_CRISIS',
      title: 'SLA Breach Emergency',
      icon: Clock,
      color: '#ef4444',
      desc: 'Tight 2h/4h deadlines with elevated queue delays, requiring mass reassignments to avert breaches.'
    },
    {
      id: 'HEAVY_LOAD',
      title: 'High-Volume Scaled Queue',
      icon: ShieldAlert,
      color: '#a855f7',
      desc: 'Stress testing queue throughput with 50-100 concurrent cybersecurity incidents.'
    }
  ];

  const handleGenerate = async () => {
    setLoading(true);
    setSimFeedback(null);
    try {
      const res = await api.generateScenario(selectedScenario, ticketCount, true);
      if (res.success) {
        setSimFeedback(res.message);
        if (onScenarioLoaded) await onScenarioLoaded();
      }
    } catch (err) {
      alert("Simulation failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={22} color="var(--cyan-primary)" />
            Real-Time Simulation Lab & Stress Testing
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Simulate realistic cybersecurity surge events and verify continuous AI queue re-planning.
          </p>
        </div>
      </div>

      {/* Scenario Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {scenarios.map((sc) => {
          const Icon = sc.icon;
          const isSelected = selectedScenario === sc.id;

          return (
            <div
              key={sc.id}
              onClick={() => setSelectedScenario(sc.id)}
              className={`glass-panel ${isSelected ? 'glass-panel-glow' : ''}`}
              style={{
                padding: '18px',
                cursor: 'pointer',
                background: isSelected ? 'rgba(0, 229, 255, 0.08)' : 'rgba(11, 17, 26, 0.6)',
                borderColor: isSelected ? 'var(--cyan-primary)' : 'var(--border-subtle)',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '6px', 
                  background: `${sc.color}20`, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: sc.color 
                }}>
                  <Icon size={18} />
                </div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: isSelected ? '#ffffff' : 'var(--text-primary)' }}>
                  {sc.title}
                </h4>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                {sc.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: 'var(--radius-md)', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Batch Incident Volume:
          </span>
          <select 
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px' }}
            value={ticketCount}
            onChange={(e) => setTicketCount(parseInt(e.target.value))}
          >
            <option value={20}>20 Incidents (Standard)</option>
            <option value={35}>35 Incidents (Surge)</option>
            <option value={50}>50 Incidents (High Load)</option>
            <option value={75}>75 Incidents (Crisis Batch)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-outline-cyan"
            onClick={handleGenerate}
            disabled={loading}
            style={{ padding: '8px 20px' }}
          >
            <Play size={16} />
            <span>{loading ? 'Generating Synthetic Queue...' : `Generate ${selectedScenario} Queue`}</span>
          </button>

          <button 
            className="btn-primary-action"
            onClick={onRunOptimization}
            style={{ padding: '8px 20px' }}
          >
            <RefreshCw size={16} />
            <span>Optimize Live Queue</span>
          </button>
        </div>
      </div>

      {/* Feedback Message */}
      {simFeedback && (
        <div style={{ 
          marginTop: '18px', 
          padding: '14px 18px', 
          borderRadius: 'var(--radius-sm)', 
          background: 'rgba(16, 185, 129, 0.12)', 
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle2 size={18} />
          <span>{simFeedback} Click <strong>"Optimize Live Queue"</strong> to evaluate AI re-planning.</span>
        </div>
      )}
    </div>
  );
}
