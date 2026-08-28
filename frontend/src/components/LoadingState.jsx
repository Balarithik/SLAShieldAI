import React, { useState, useEffect } from 'react';
import { Cpu, RefreshCw, CheckCircle2 } from 'lucide-react';

export function LoadingState() {
  const steps = [
    "Validating tickets & features...",
    "Running 6 ML model predictions (severity, resolution, delay, workload, SLA risk, escalation)...",
    "Calculating individual SLA breach probabilities...",
    "Evaluating analyst capacity & workload constraints...",
    "Optimizing incident queue order & candidate reassignments...",
    "Finalizing before vs after comparison & dashboard metrics..."
  ];

  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 450);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      maxWidth: '560px',
      margin: '60px auto',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-strong)',
      borderRadius: '4px',
      padding: '28px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <RefreshCw size={24} color="var(--accent-blue)" className="animate-spin" />
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Executing AI Queue Optimization</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Processing active incident batch through trained ML models</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {steps.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                fontSize: '0.82rem',
                color: isDone ? 'var(--accent-success)' : isCurrent ? '#ffffff' : 'var(--text-muted)',
                fontWeight: isCurrent ? 600 : 400
              }}
            >
              {isDone ? (
                <CheckCircle2 size={14} color="#10b981" />
              ) : isCurrent ? (
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid var(--accent-blue)', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }} />
              ) : (
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#1e293b' }} />
              )}
              <span>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
