import React from 'react';
import { Cpu, ShieldAlert, Layers, Database, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';

export function ModelTransparency() {
  const models = [
    {
      name: "1. Severity Classification",
      file: "severity_model.pkl",
      algorithm: "Random Forest Classifier (n=50)",
      target: "Severity (Low, Medium, High, Critical)",
      features: "14 Base Incident Features",
      role: "Assesses base damage and system impact score."
    },
    {
      name: "2. Resolution Time Prediction",
      file: "resolution_model.pkl",
      algorithm: "Random Forest Regressor",
      target: "Resolution Duration (Hours)",
      features: "14 Base Features + Analyst Experience",
      role: "Estimates hands-on triage time required to mitigate incident."
    },
    {
      name: "3. Queue Delay Prediction",
      file: "queue_model.pkl",
      algorithm: "Random Forest Regressor",
      target: "Queue Wait Time (Minutes)",
      features: "Current Queue Length / Available Analysts",
      role: "Predicts backlog bottleneck delay before analyst touches ticket."
    },
    {
      name: "4. Analyst Workload Prediction",
      file: "workload_model.pkl",
      algorithm: "Random Forest Regressor",
      target: "Future Analyst Load Index",
      features: "Current Queue + Historical Inflow Rate",
      role: "Guards against analyst burnout and overload."
    },
    {
      name: "5. SLA Breach Probability",
      file: "sla_model.pkl",
      algorithm: "Random Forest Classifier (predict_proba)",
      target: "Breach Likelihood (0.0 to 1.0)",
      features: "Base Features + Predicted Res Time + Predicted Delay",
      role: "Primary risk signal driving dynamic queue reordering."
    },
    {
      name: "6. Escalation Priority Prediction",
      file: "escalation_model.pkl",
      algorithm: "Random Forest Classifier",
      target: "Escalation Tier (P1, P2, P3, P4)",
      features: "Base Features + SLA Breach Prob + Threat Score",
      role: "Identifies severe incidents requiring senior tier intervention."
    }
  ];

  return (
    <div className="glass-panel" style={{ padding: '28px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={22} color="var(--cyan-primary)" />
          AI Architecture & Machine Learning Pipeline
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Detailed technical breakdown of the 6 pre-trained machine learning models and queue optimization engine.
        </p>
      </div>

      {/* Synthetic Prototype Notice (Requirement #27) */}
      <div style={{ 
        padding: '14px 18px', 
        borderRadius: 'var(--radius-md)', 
        background: 'rgba(56, 189, 248, 0.08)', 
        border: '1px solid rgba(56, 189, 248, 0.3)',
        color: '#38bdf8',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <AlertTriangle size={20} />
        <span style={{ fontSize: '0.85rem' }}>
          <strong>Transparency Notice:</strong> Prototype trained and evaluated on synthetic cybersecurity incident data. The 6 model binary files (<code style={{ fontFamily: 'var(--font-mono)' }}>models/*.pkl</code>) are loaded into Django server memory once upon startup and reused for zero-latency inference without retraining on requests.
        </span>
      </div>

      {/* Model Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {models.map((m, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: '18px', background: 'rgba(11, 17, 26, 0.6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>{m.name}</h4>
              <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--cyan-primary)', background: 'rgba(0, 229, 255, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                {m.file}
              </span>
            </div>
            
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <strong>Algorithm:</strong> {m.algorithm}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <strong>Target Output:</strong> {m.target}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {m.role}
            </div>
          </div>
        ))}
      </div>

      {/* System Flowchart Banner */}
      <div style={{ padding: '20px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 'var(--radius-md)' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px', color: 'var(--cyan-primary)' }}>
          Queue Optimization Algorithm Flow:
        </h4>
        <ol style={{ paddingLeft: '20px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
          <li><strong>Input Ingestion:</strong> Incident ticket batch (14 features) + Analyst capacity roster.</li>
          <li><strong>Baseline Inference:</strong> Batch execution through Severity, Resolution Time, Queue Delay, Workload, SLA Risk, and Escalation Priority models.</li>
          <li><strong>Candidate Action Simulation:</strong> For each ticket, evaluates 4 candidate actions: <code style={{ color: '#38bdf8' }}>KEEP_CURRENT</code>, <code style={{ color: '#fbbf24' }}>PRIORITIZE</code>, <code style={{ color: '#34d399' }}>REASSIGN</code> (to each idle analyst), <code style={{ color: '#f43f5e' }}>ESCALATE</code> (to senior tier).</li>
          <li><strong>Penalty-Adjusted Scoring:</strong> Evaluates simulated post-action SLA probability + workload penalty + reassignment penalty.</li>
          <li><strong>Deterministic Selection:</strong> Picks the lowest risk score candidate and generates human-readable decision explanations.</li>
          <li><strong>Atomic State Update:</strong> Re-orders queue and persists audit log to Django backend database.</li>
        </ol>
      </div>
    </div>
  );
}
