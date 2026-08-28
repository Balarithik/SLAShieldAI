import React, { useState } from 'react';
import { UploadCloud, X, AlertTriangle, CheckCircle2, FileText, Play } from 'lucide-react';
import { api } from '../services/api';

export function UploadModal({ isOpen, onClose, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      selectFile(e.dataTransfer.files[0]);
    }
  };

  const selectFile = (selected) => {
    setFile(selected);
    setErrorMsg(null);
    setUploadResult(null);
  };

  const handleUploadAndOptimize = async () => {
    if (!file) {
      setErrorMsg("Please choose a CSV or JSON file first.");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('replace_queue', 'true');

      const res = await api.uploadTickets(formData);
      if (res.success) {
        setUploadResult({
          filename: res.filename,
          count: res.tickets_imported,
          status: "Validated & Imported Successfully"
        });

        // Run optimization on the uploaded batch
        await api.optimizeQueue();

        setTimeout(() => {
          onUploadComplete({
            filename: res.filename,
            count: res.tickets_imported
          });
        }, 800);
      } else {
        const details = res.details ? ` (${res.details.join(', ')})` : '';
        setErrorMsg((res.error || "Validation failed") + details);
      }
    } catch (err) {
      setErrorMsg(err.message || "Failed to connect to backend server.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Upload Security Tickets</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Upload your cybersecurity incident data in CSV or JSON format.
            </p>
          </div>
          <button className="btn btn-ghost" style={{ padding: '4px' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Dropzone */}
        <div
          style={{
            border: `2px dashed ${isDragging ? 'var(--accent-blue)' : 'var(--border-strong)'}`,
            background: isDragging ? 'rgba(56, 189, 248, 0.05)' : '#070c18',
            borderRadius: '4px',
            padding: '36px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: '18px'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('soc-file-input').click()}
        >
          <input
            id="soc-file-input"
            type="file"
            accept=".csv,.json"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && selectFile(e.target.files[0])}
          />
          <UploadCloud size={36} color="var(--accent-blue)" style={{ margin: '0 auto 10px', display: 'block' }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#ffffff', marginBottom: '4px' }}>
            {file ? file.name : "Choose CSV / JSON file or drag here"}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Accepts standard security incident features (Threat_Score, Incident_Type, SLA_Hours, etc.)
          </div>
        </div>

        {/* Upload Summary if file selected */}
        {file && !errorMsg && (
          <div style={{ 
            background: '#0e182f', 
            border: '1px solid var(--border-subtle)', 
            padding: '12px 16px', 
            borderRadius: '4px', 
            marginBottom: '18px',
            fontSize: '0.82rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>File name:</span>
              <strong className="font-mono">{file.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>File size:</span>
              <span className="font-mono">{(file.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div style={{
            background: 'var(--accent-danger-bg)',
            border: '1px solid var(--accent-danger)',
            color: '#fb7185',
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '0.85rem'
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Success */}
        {uploadResult && (
          <div style={{
            background: 'var(--accent-success-bg)',
            border: '1px solid var(--accent-success)',
            color: '#34d399',
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem'
          }}>
            <CheckCircle2 size={16} />
            <span>Imported {uploadResult.count} tickets. Optimizing queue...</span>
          </div>
        )}

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isUploading}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleUploadAndOptimize}
            disabled={!file || isUploading}
          >
            <Play size={14} />
            <span>{isUploading ? 'Validating & Optimizing...' : 'Run AI Optimization'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
