import React from 'react';
import { Cpu, ShieldCheck, BrainCircuit, Gauge, Sparkles, CheckCircle2 } from 'lucide-react';

const stages = [
  { key: 'upload', label: 'Upload received', detail: 'Dataset has been received and queued for validation.' },
  { key: 'validation', label: 'Data validation', detail: 'Ticket schema, values and required security fields are being checked.' },
  { key: 'preprocessing', label: 'Data preprocessing', detail: 'Feature normalization and model-ready formatting are being prepared.' },
  { key: 'prediction', label: 'AI model inference', detail: 'Severity, resolution time, delay, workload, and SLA risk are being calculated.' },
  { key: 'optimization', label: 'Queue optimization', detail: 'The queue is being re-ranked for SLA risk reduction and analyst assignment.' },
  { key: 'finalizing', label: 'Finalizing results', detail: 'Before/after metrics and dashboard updates are being prepared.' },
  { key: 'complete', label: 'AI analysis complete', detail: 'Dashboard is now updated with the latest predictions and optimized queue.' }
];

export function LoadingState({ processingState = {} }) {
  const currentStep = Math.max(0, Math.min(stages.length - 1, processingState.stageIndex ?? 0));
  const progress = processingState.progress ?? Math.round(((currentStep + 1) / stages.length) * 100);
  const statusMessage = processingState.message || 'AI pipeline is running in the background.';

  return (
    <div style={{
      maxWidth: '700px',
      margin: '60px auto',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-strong)',
      borderRadius: '8px',
      padding: '28px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrainCircuit size={22} color="var(--accent-blue)" />
        </div>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>SLASHIELD AI ENGINE</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{statusMessage}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '10px', marginBottom: '22px' }}>
        {stages.map((step, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isUpcoming = idx > currentStep;

          return (
            <div key={step.key} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              borderRadius: '6px',
              background: isCurrent ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
              border: isCurrent ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid transparent'
            }}>
              <div style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isDone ? <CheckCircle2 size={15} color="#10b981" /> : isCurrent ? <Cpu size={15} color="var(--accent-blue)" /> : <ShieldCheck size={15} color="var(--text-muted)" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: isUpcoming ? 'var(--text-muted)' : '#ffffff', fontWeight: isCurrent ? 700 : 500 }}>{step.label}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{step.detail}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          <span>AI Processing</span>
          <span>{progress}%</span>
        </div>
        <div style={{ width: '100%', height: '10px', background: 'rgba(148, 163, 184, 0.16)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8 0%, #34d399 100%)', borderRadius: '999px' }} />
        </div>
      </div>
    </div>
  );
}
