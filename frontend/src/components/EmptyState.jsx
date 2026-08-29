import React from 'react';
import { UploadCloud, ShieldAlert, Zap, TrendingUp, Check } from 'lucide-react';

export function EmptyState({ onOpenUpload }) {
  return (
    <div style={{
      padding: '60px 40px',
      textAlign: 'center',
      minHeight: '400px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {/* Main Icon */}
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '8px',
        background: 'rgba(56, 189, 248, 0.12)',
        color: 'var(--accent-blue)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px'
      }}>
        <ShieldAlert size={28} />
      </div>

      {/* Heading */}
      <h1 style={{
        fontSize: '1.35rem',
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: '8px',
        color: '#ffffff'
      }}>
        SLA Shield AI
      </h1>

      {/* Tagline */}
      <p style={{
        fontSize: '0.95rem',
        color: 'var(--text-secondary)',
        marginBottom: '28px',
        maxWidth: '500px',
        lineHeight: '1.5'
      }}>
        Predict. Prioritize. Prevent SLA Breaches.
      </p>

      {/* Supporting text */}
      <p style={{
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        marginBottom: '32px',
        maxWidth: '520px',
        lineHeight: '1.6'
      }}>
        AI-powered security incident queue optimization that predicts SLA risks and recommends proactive interventions before breaches occur.
      </p>

      {/* CTA Button */}
      <button
        className="btn btn-primary"
        onClick={onOpenUpload}
        style={{ padding: '12px 28px', fontSize: '0.95rem', marginBottom: '36px' }}
      >
        <UploadCloud size={16} />
        <span>Upload Security Incident Queue</span>
      </button>

      {/* Workflow steps */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '24px',
        maxWidth: '540px',
        margin: '0 auto',
        paddingTop: '28px',
        borderTop: '1px solid var(--border-subtle)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.12)',
            width: '36px',
            height: '36px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px',
            color: 'var(--accent-blue)'
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>01</span>
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Upload Queue
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.12)',
            width: '36px',
            height: '36px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px',
            color: 'var(--accent-blue)'
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>02</span>
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            AI Predicts Risk
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: 'rgba(56, 189, 248, 0.12)',
            width: '36px',
            height: '36px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px',
            color: 'var(--accent-blue)'
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>03</span>
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Optimize Queue
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.12)',
            width: '36px',
            height: '36px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 8px',
            color: '#34d399'
          }}>
            <Check size={18} />
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Prevent Breaches
          </div>
        </div>
      </div>
    </div>
  );
}
