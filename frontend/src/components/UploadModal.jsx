import React, { useState } from 'react';
import { UploadCloud, X, AlertTriangle, CheckCircle2, FileText, Play, File, Trash2 } from 'lucide-react';
import { api } from '../services/api';

export function UploadModal({ isOpen, onClose, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [optimizationStatus, setOptimizationStatus] = useState(null);
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
    const validTypes = ['text/csv', 'application/json', '.csv', '.json'];
    const fileName = selected.name.toLowerCase();
    const isValid = validTypes.some(t => selected.type === t || fileName.endsWith(t));
    
    if (!isValid) {
      setErrorMsg('Invalid file type. Please upload a CSV or JSON file.');
      return;
    }

    setFile(selected);
    setErrorMsg(null);
    setUploadResult(null);
  };

  const removeFile = () => {
    setFile(null);
    setUploadResult(null);
    setOptimizationStatus(null);
    setErrorMsg(null);
  };

  const handleUploadAndOptimize = async () => {
    if (!file) {
      setErrorMsg("Please choose a CSV or JSON file first.");
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setOptimizationStatus(null);

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

        try {
          const optimizationResult = await api.optimizeQueue();
          if (!optimizationResult?.success) {
            setOptimizationStatus(
              optimizationResult?.message || 'Import succeeded, but queue optimization did not complete.'
            );
          }
        } catch (optimizationError) {
          setOptimizationStatus(
            'Import succeeded, but queue optimization could not complete. Please try again from the dashboard.'
          );
        }

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
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px', padding: '28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.02em', marginBottom: '4px' }}>Upload Security Incident Queue</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Import your cybersecurity incident data in CSV or JSON format for AI analysis.
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
            background: isDragging ? 'rgba(56, 189, 248, 0.08)' : 'rgba(15, 23, 42, 0.5)',
            borderRadius: '6px',
            padding: '44px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: '20px',
            transition: 'all 0.2s ease'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !file && document.getElementById('soc-file-input').click()}
        >
          <input
            id="soc-file-input"
            type="file"
            accept=".csv,.json"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files && selectFile(e.target.files[0])}
          />
          {file ? (
            <>
              <File size={32} color="var(--accent-blue)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                {file.name}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                {(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown type'}
              </div>
            </>
          ) : (
            <>
              <UploadCloud size={36} color="var(--accent-blue)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '4px' }}>
                Drag and drop your file here
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                or click to browse
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                CSV or JSON • Max 10 MB
              </div>
            </>
          )}
        </div>

        {/* Supported Formats Info */}
        {!file && !uploadResult && (
          <div style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '12px 14px',
            borderRadius: '4px',
            marginBottom: '18px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)'
          }}>
            <strong style={{ color: 'var(--accent-blue)' }}>Supported Formats:</strong> CSV and JSON files with security incident fields (Threat_Score, Incident_Type, SLA_Hours, Priority, etc.)
          </div>
        )}

        {/* File Actions */}
        {file && !uploadResult && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
            <button
              className="btn btn-secondary"
              onClick={removeFile}
              style={{ flex: 1, fontSize: '0.85rem' }}
              disabled={isUploading}
            >
              <Trash2 size={14} />
              <span>Remove</span>
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div style={{
            background: 'var(--accent-danger-bg)',
            border: '1px solid var(--accent-danger)',
            color: '#fb7185',
            padding: '12px 14px',
            borderRadius: '4px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '0.85rem',
            lineHeight: '1.4'
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
            padding: '12px 14px',
            borderRadius: '4px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem'
          }}>
            <CheckCircle2 size={16} />
            <div>
              <strong>Success!</strong> Imported {uploadResult.count} tickets. And Optimising queue for AI analysis. This may take a few moments.
            </div>
          </div>
        )}

        {optimizationStatus && (
          <div style={{
            background: 'rgba(249, 115, 22, 0.12)',
            border: '1px solid rgba(249, 115, 22, 0.4)',
            color: '#fbbf24',
            padding: '12px 14px',
            borderRadius: '4px',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem'
          }}>
            <AlertTriangle size={16} />
            <span>{optimizationStatus}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isUploading}>
            {uploadResult ? 'Done' : 'Cancel'}
          </button>
          {file && !uploadResult && (
            <button
              className="btn btn-primary"
              onClick={handleUploadAndOptimize}
              disabled={isUploading}
            >
              <Play size={14} />
              <span>{isUploading ? 'Validating & Optimizing...' : 'Analyze Queue'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
