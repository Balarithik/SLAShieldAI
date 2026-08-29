import React, { useState, useEffect } from 'react';
import { Cpu, ShieldAlert, Layers, Database, Sparkles, CheckCircle2, AlertTriangle, Loader } from 'lucide-react';
import { api } from '../services/api';

export function ModelTransparency() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const data = await api.getMLPerformance();
        setMetrics(data);
      } catch (err) {
        setError('Failed to load model performance metrics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const modelDescriptions = [
    {
      id: "severity",
      name: "1. Severity Classification",
      file: "severity_model.pkl",
      algorithm: "Random Forest Classifier (n=50)",
      target: "Severity (Low, Medium, High, Critical)",
      features: "14 Base Incident Features",
      role: "Assesses base damage and system impact score."
    },
    {
      id: "resolution_time",
      name: "2. Resolution Time Prediction",
      file: "resolution_model.pkl",
      algorithm: "Random Forest Regressor",
      target: "Resolution Duration (Hours)",
      features: "14 Base Features + Analyst Experience",
      role: "Estimates hands-on triage time required to mitigate incident."
    },
    {
      id: "queue_delay",
      name: "3. Queue Delay Prediction",
      file: "queue_model.pkl",
      algorithm: "Random Forest Regressor",
      target: "Queue Wait Time (Minutes)",
      features: "Current Queue Length / Available Analysts",
      role: "Predicts backlog bottleneck delay before analyst touches ticket."
    },
    {
      id: "analyst_workload",
      name: "4. Analyst Workload Prediction",
      file: "workload_model.pkl",
      algorithm: "Random Forest Regressor",
      target: "Future Analyst Load Index",
      features: "Current Queue + Historical Inflow Rate",
      role: "Guards against analyst burnout and overload."
    },
    {
      id: "sla_breach",
      name: "5. SLA Breach Probability",
      file: "sla_model.pkl",
      algorithm: "Random Forest Classifier (predict_proba)",
      target: "Breach Likelihood (0.0 to 1.0)",
      features: "Base Features + Predicted Res Time + Predicted Delay",
      role: "Primary risk signal driving dynamic queue reordering."
    },
    {
      id: "escalation_priority",
      name: "6. Escalation Priority Prediction",
      file: "escalation_model.pkl",
      algorithm: "Random Forest Classifier",
      target: "Escalation Tier (P1, P2, P3, P4)",
      features: "Base Features + SLA Breach Prob + Threat Score",
      role: "Identifies severe incidents requiring senior tier intervention."
    }
  ];

  const getMetricStatus = (value, type) => {
    if (type === 'classification' || type === 'probability') {
      if (value >= 0.88) return { label: 'Excellent', color: '#34d399' };
      if (value >= 0.80) return { label: 'Good', color: '#fbbf24' };
      return { label: 'Fair', color: '#fb7185' };
    }
    if (type === 'regression') {
      // For regression, R² higher is better
      if (value >= 0.85) return { label: 'Excellent', color: '#34d399' };
      if (value >= 0.75) return { label: 'Good', color: '#fbbf24' };
      return { label: 'Fair', color: '#fb7185' };
    }
    return { label: 'Unknown', color: '#94a3b8' };
  };

  const renderMetrics = (modelId, perf) => {
    if (!perf) return null;

    if (perf.type === 'Regression') {
      return (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <div style={{ marginBottom: '6px' }}>
            <strong>MAE:</strong> {perf.mae ? perf.mae.toFixed(2) : '—'}
          </div>
          <div style={{ marginBottom: '6px' }}>
            <strong>RMSE:</strong> {perf.rmse ? perf.rmse.toFixed(2) : '—'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><strong>R²:</strong> {perf.r2 ? perf.r2.toFixed(3) : '—'}</span>
            {perf.r2 && (
              <span style={{
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '2px',
                background: 'rgba(52, 211, 153, 0.15)',
                color: '#34d399'
              }}>
                {getMetricStatus(perf.r2, 'regression').label}
              </span>
            )}
          </div>
        </div>
      );
    }

    // Classification
    return (
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <div style={{ marginBottom: '6px' }}>
          <strong>Accuracy:</strong> {perf.accuracy ? (perf.accuracy * 100).toFixed(1) : '—'}%
        </div>
        <div style={{ marginBottom: '6px' }}>
          <strong>Precision:</strong> {perf.precision ? (perf.precision * 100).toFixed(1) : '—'}%
        </div>
        <div style={{ marginBottom: '6px' }}>
          <strong>Recall:</strong> {perf.recall ? (perf.recall * 100).toFixed(1) : '—'}%
        </div>
        <div style={{ marginBottom: '6px' }}>
          <strong>F1:</strong> {perf.f1 ? perf.f1.toFixed(3) : '—'}
        </div>
        {perf.roc_auc && (
          <div>
            <strong>ROC-AUC:</strong> {perf.roc_auc.toFixed(3)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '28px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={22} color="var(--accent-blue)" />
          AI Model Performance & Architecture
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Real validation performance of the 6 pre-trained machine learning models and their configurations.
        </p>
      </div>

      {/* Synthetic Prototype Notice */}
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

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
          Loading model performance metrics...
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          background: 'var(--accent-danger-bg)',
          border: '1px solid var(--accent-danger)',
          color: '#fb7185',
          padding: '12px 14px',
          borderRadius: '4px',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem'
        }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Model Cards Grid */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {modelDescriptions.map((m, idx) => {
            const perf = metrics?.performance_metrics?.[m.id];
            return (
              <div key={idx} className="glass-panel" style={{ padding: '18px', background: 'rgba(11, 17, 26, 0.6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>{m.name}</h4>
                  <span className="font-mono" style={{ fontSize: '0.72rem', color: 'var(--accent-blue)', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    {m.file}
                  </span>
                </div>
                
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <strong>Algorithm:</strong> {m.algorithm}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  <strong>Target:</strong> {m.target}
                </div>

                {/* Performance Metrics */}
                {perf && (
                  <div style={{
                    background: 'rgba(56, 189, 248, 0.05)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    padding: '10px 12px',
                    borderRadius: '4px',
                    marginBottom: '10px'
                  }}>
                    {renderMetrics(m.id, perf)}
                  </div>
                )}

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {m.role}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* System Flowchart Banner */}
      {!loading && (
        <div style={{ padding: '20px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 'var(--radius-md)' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '10px', color: 'var(--accent-blue)' }}>
            Queue Optimization Algorithm Flow:
          </h4>
          <ol style={{ paddingLeft: '20px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
            <li><strong>Input Ingestion:</strong> Incident ticket batch (14 features) + Analyst capacity roster.</li>
            <li><strong>Baseline Inference:</strong> Batch execution through all 6 models for predictions.</li>
            <li><strong>Candidate Action Simulation:</strong> For each ticket, evaluates 4 actions: KEEP_CURRENT, PRIORITIZE, REASSIGN, ESCALATE.</li>
            <li><strong>Penalty-Adjusted Scoring:</strong> Evaluates simulated post-action SLA probability + penalties.</li>
            <li><strong>Deterministic Selection:</strong> Picks lowest risk score and generates explanations.</li>
            <li><strong>Atomic State Update:</strong> Re-orders queue and persists audit log to database.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
