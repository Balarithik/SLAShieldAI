import React from 'react';
import { Shield, UploadCloud, RefreshCw } from 'lucide-react';

export function Header({ onOpenUpload, onRunOptimization, isOptimizing, hasData }) {
  return (
    <header className="soc-header">
      <div className="soc-header-inner">
        <div className="soc-brand">
          <div className="soc-logo-icon">
            <Shield size={18} strokeWidth={2.5} />
          </div>
          <div>
            <div className="soc-title">SLA Shield AI</div>
            <div className="soc-subtitle">AI-Powered SLA Breach Prevention</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {hasData && (
            <button
              className="btn btn-secondary"
              onClick={onRunOptimization}
              disabled={isOptimizing}
            >
              <RefreshCw size={14} className={isOptimizing ? 'animate-spin' : ''} />
              <span>{isOptimizing ? 'Optimizing...' : 'Re-optimize Queue'}</span>
            </button>
          )}

          <button
            className="btn btn-primary"
            onClick={onOpenUpload}
          >
            <UploadCloud size={14} />
            <span>Upload Tickets</span>
          </button>
        </div>
      </div>
    </header>
  );
}
