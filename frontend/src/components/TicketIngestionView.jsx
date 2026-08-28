import React, { useState } from 'react';
import { 
  UploadCloud, FileText, CheckCircle2, AlertTriangle, 
  Plus, Play, RefreshCw, Sparkles, Layers, ArrowRight 
} from 'lucide-react';
import { api } from '../services/api';

export function TicketIngestionView({ onIngestionSuccess, onRunOptimization }) {
  const [activeSubTab, setActiveSubTab] = useState('upload'); // 'upload' | 'manual'
  
  // Upload State
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [replaceQueue, setReplaceQueue] = useState(true);

  // Manual Form State (14 features)
  const [manualForm, setManualForm] = useState({
    ticket_id: '',
    incident_type: 'Malware',
    source: 'SIEM',
    attack_vector: 'Endpoint',
    priority: 'P2',
    affected_systems: 8,
    users_affected: 30,
    threat_score: 75.0,
    analyst_experience_years: 5,
    current_queue: 12,
    available_analysts: 4,
    sla_hours: 4.0,
    historical_incidents: 20,
    time_of_day: 'Morning',
    day_of_week: 'Mon',
    assigned_analyst: 'A01',
    add_to_queue: true
  });

  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [manualError, setManualError] = useState(null);

  // Drag and Drop handlers
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
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (selectedFile) => {
    setFile(selectedFile);
    setUploadError(null);
    setUploadSuccess(null);

    // Client-side quick preview
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        if (selectedFile.name.endsWith('.csv')) {
          const lines = text.split('\n').filter(l => l.trim());
          const headers = lines[0].split(',').map(h => h.trim());
          const preview = lines.slice(1, 6).map(line => {
            const vals = line.split(',');
            const obj = {};
            headers.forEach((h, idx) => {
              obj[h] = vals[idx]?.trim();
            });
            return obj;
          });
          setPreviewRows(preview);
        } else if (selectedFile.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          setPreviewRows(Array.isArray(parsed) ? parsed.slice(0, 5) : [parsed]);
        }
      } catch (err) {
        console.warn("Preview parse error:", err);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleUploadSubmit = async () => {
    if (!file) {
      setUploadError("Please select a CSV or JSON file to upload.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('replace_queue', replaceQueue ? 'true' : 'false');

      const res = await api.uploadTickets(formData);
      if (res.success) {
        setUploadSuccess(res.message);
        if (onIngestionSuccess) onIngestionSuccess();
      } else {
        setUploadError(res.error || "Upload failed");
      }
    } catch (err) {
      setUploadError(err.message || "Failed to connect to Django backend.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setPredicting(true);
    setManualError(null);

    try {
      const res = await api.createTicket(manualForm);
      if (res.success) {
        setPredictionResult(res.prediction);
        if (onIngestionSuccess) onIngestionSuccess();
      } else {
        setManualError(res.error || "Prediction request failed.");
      }
    } catch (err) {
      setManualError(err.message || "Server error.");
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div>
      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          className={`btn ${activeSubTab === 'upload' ? 'btn-outline-cyan' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('upload')}
          style={{ padding: '10px 20px' }}
        >
          <UploadCloud size={18} />
          <span>Upload Dataset (CSV / JSON)</span>
        </button>
        <button
          className={`btn ${activeSubTab === 'manual' ? 'btn-outline-cyan' : 'btn-secondary'}`}
          onClick={() => setActiveSubTab('manual')}
          style={{ padding: '10px 20px' }}
        >
          <Plus size={18} />
          <span>Add Ticket Manually (Live ML Inference)</span>
        </button>
      </div>

      {activeSubTab === 'upload' ? (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
            Ingest Cybersecurity Incident Batch
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Upload raw SIEM / EDR / SOC ticket feeds. Django backend validates all 14 ML features, cleans data, and feeds into inference engine.
          </p>

          {/* Dropzone */}
          <div 
            className={`dropzone ${isDragging ? 'dragover' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input 
              id="file-input" 
              type="file" 
              accept=".csv,.json" 
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
            />
            <UploadCloud size={44} color="var(--cyan-primary)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>
              {file ? file.name : "Drag & drop your CSV / JSON dataset here"}
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Supports CSV with standard ML headers (Incident_Type, Threat_Score, SLA_Hours, etc.)
            </p>
          </div>

          {/* Upload Options */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={replaceQueue} 
                onChange={(e) => setReplaceQueue(e.target.checked)} 
              />
              <span>Replace existing active queue with this batch</span>
            </label>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => { setFile(null); setPreviewRows([]); setUploadError(null); setUploadSuccess(null); }}
              >
                Clear
              </button>
              <button 
                className="btn-primary-action"
                onClick={handleUploadSubmit}
                disabled={!file || isUploading}
                style={{ padding: '8px 20px' }}
              >
                <UploadCloud size={16} />
                <span>{isUploading ? 'Validating & Ingesting...' : 'Validate & Import Batch'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {uploadError && (
            <div style={{ 
              marginTop: '18px', 
              padding: '14px 18px', 
              borderRadius: 'var(--radius-sm)', 
              background: 'rgba(244, 63, 94, 0.12)', 
              border: '1px solid rgba(244, 63, 94, 0.4)',
              color: '#fb7185',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertTriangle size={18} />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div style={{ 
              marginTop: '18px', 
              padding: '14px 18px', 
              borderRadius: 'var(--radius-sm)', 
              background: 'rgba(16, 185, 129, 0.12)', 
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={18} />
                <span>{uploadSuccess}</span>
              </div>
              <button 
                className="btn btn-outline-cyan"
                onClick={onRunOptimization}
                style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              >
                <Play size={14} />
                <span>Run AI Optimization Now</span>
              </button>
            </div>
          )}

          {/* Preview Table */}
          {previewRows.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px', color: 'var(--text-secondary)' }}>
                Dataset Preview (Top 5 rows):
              </h4>
              <div className="table-container">
                <table className="soc-table">
                  <thead>
                    <tr>
                      {Object.keys(previewRows[0]).slice(0, 8).map(key => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).slice(0, 8).map((val, cIdx) => (
                          <td key={cIdx} className="font-mono">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Manual Ticket Creation Form */
        <div className="glass-panel" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
            Single Incident Simulation & Real-Time ML Prediction
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
            Input exact parameters to evaluate how the 6 ML models classify severity, resolution time, queue delay, workload, SLA breach risk, and escalation priority.
          </p>

          <form onSubmit={handleManualSubmit}>
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Ticket ID (Optional)</label>
                <input 
                  type="text" 
                  className="form-input font-mono" 
                  placeholder="e.g. INC-TEST-99"
                  value={manualForm.ticket_id}
                  onChange={(e) => setManualForm({ ...manualForm, ticket_id: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Incident Type</label>
                <select 
                  className="form-select"
                  value={manualForm.incident_type}
                  onChange={(e) => setManualForm({ ...manualForm, incident_type: e.target.value })}
                >
                  <option value="Malware">Malware</option>
                  <option value="Phishing">Phishing</option>
                  <option value="DDoS">DDoS</option>
                  <option value="Ransomware">Ransomware</option>
                  <option value="Unauthorized Access">Unauthorized Access</option>
                  <option value="Data Exfiltration">Data Exfiltration</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Priority Tier</label>
                <select 
                  className="form-select"
                  value={manualForm.priority}
                  onChange={(e) => setManualForm({ ...manualForm, priority: e.target.value })}
                >
                  <option value="P1">P1 (Critical)</option>
                  <option value="P2">P2 (High)</option>
                  <option value="P3">P3 (Medium)</option>
                  <option value="P4">P4 (Low)</option>
                </select>
              </div>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Threat Score (0 - 100)</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100" 
                  step="0.5"
                  className="form-input font-mono" 
                  value={manualForm.threat_score}
                  onChange={(e) => setManualForm({ ...manualForm, threat_score: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Affected Systems</label>
                <input 
                  type="number" 
                  min="1" 
                  className="form-input font-mono" 
                  value={manualForm.affected_systems}
                  onChange={(e) => setManualForm({ ...manualForm, affected_systems: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Users Affected</label>
                <input 
                  type="number" 
                  min="1" 
                  className="form-input font-mono" 
                  value={manualForm.users_affected}
                  onChange={(e) => setManualForm({ ...manualForm, users_affected: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Attack Vector</label>
                <select 
                  className="form-select"
                  value={manualForm.attack_vector}
                  onChange={(e) => setManualForm({ ...manualForm, attack_vector: e.target.value })}
                >
                  <option value="Endpoint">Endpoint</option>
                  <option value="Email">Email</option>
                  <option value="Network">Network</option>
                  <option value="Credential">Credential</option>
                  <option value="Web">Web</option>
                  <option value="Cloud">Cloud</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Detection Source</label>
                <select 
                  className="form-select"
                  value={manualForm.source}
                  onChange={(e) => setManualForm({ ...manualForm, source: e.target.value })}
                >
                  <option value="SIEM">SIEM</option>
                  <option value="EDR">EDR</option>
                  <option value="Firewall">Firewall</option>
                  <option value="Email Gateway">Email Gateway</option>
                  <option value="IDS">IDS</option>
                  <option value="User Report">User Report</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">SLA Window (Hours)</label>
                <input 
                  type="number" 
                  step="0.5"
                  min="0.5" 
                  className="form-input font-mono" 
                  value={manualForm.sla_hours}
                  onChange={(e) => setManualForm({ ...manualForm, sla_hours: parseFloat(e.target.value) || 4 })}
                />
              </div>
            </div>

            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Initial Assigned Analyst</label>
                <select 
                  className="form-select"
                  value={manualForm.assigned_analyst}
                  onChange={(e) => setManualForm({ ...manualForm, assigned_analyst: e.target.value })}
                >
                  <option value="A01">A01 (Sarah Chen - 2y)</option>
                  <option value="A02">A02 (Marcus Vance - 5y)</option>
                  <option value="A03">A03 (Elena Rostova - 8y)</option>
                  <option value="A04">A04 (Devon Patel - 3y)</option>
                  <option value="A05">A05 (Aria Montgomery - 9y)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Current Queue Length</label>
                <input 
                  type="number" 
                  min="0" 
                  className="form-input font-mono" 
                  value={manualForm.current_queue}
                  onChange={(e) => setManualForm({ ...manualForm, current_queue: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Available Analysts</label>
                <input 
                  type="number" 
                  min="1" 
                  className="form-input font-mono" 
                  value={manualForm.available_analysts}
                  onChange={(e) => setManualForm({ ...manualForm, available_analysts: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={manualForm.add_to_queue} 
                  onChange={(e) => setManualForm({ ...manualForm, add_to_queue: e.target.checked })} 
                />
                <span>Automatically add ticket to active queue for optimization</span>
              </label>

              <button 
                type="submit" 
                className="btn-primary-action"
                disabled={predicting}
              >
                <Sparkles size={16} />
                <span>{predicting ? 'Evaluating ML Models...' : 'Run ML Analysis & Add'}</span>
              </button>
            </div>
          </form>

          {/* Prediction Result Breakdown Card */}
          {predictionResult && (
            <div className="glass-panel" style={{ marginTop: '24px', padding: '20px', background: 'rgba(0, 229, 255, 0.05)', borderColor: 'rgba(0, 229, 255, 0.3)' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--cyan-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} />
                ML Inference Results for {predictionResult.ticket_id}:
              </h4>
              
              <div className="form-grid-3" style={{ gap: '14px' }}>
                <div style={{ background: 'rgba(16, 24, 38, 0.8)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Predicted Severity</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px' }}>
                    <span className={`badge ${
                      predictionResult.predicted_severity === 'Critical' ? 'badge-critical' : 
                      predictionResult.predicted_severity === 'High' ? 'badge-high' : 'badge-medium'
                    }`}>
                      {predictionResult.predicted_severity}
                    </span>
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 24, 38, 0.8)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SLA Breach Likelihood</div>
                  <div className="font-mono" style={{ fontSize: '1.3rem', fontWeight: 800, color: predictionResult.sla_breach_probability >= 50 ? '#fb7185' : '#34d399', marginTop: '4px' }}>
                    {predictionResult.sla_breach_probability}%
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 24, 38, 0.8)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Escalation Priority</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px' }}>
                    <span className={`badge ${predictionResult.escalation_priority === 'P1' ? 'badge-p1' : 'badge-p2'}`}>
                      {predictionResult.escalation_priority}
                    </span>
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 24, 38, 0.8)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Resolution Time</div>
                  <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginTop: '4px' }}>
                    {predictionResult.predicted_resolution_hours} hours
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 24, 38, 0.8)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Predicted Queue Delay</div>
                  <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginTop: '4px' }}>
                    {predictionResult.predicted_queue_delay} mins
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 24, 38, 0.8)', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Future Workload Index</div>
                  <div className="font-mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginTop: '4px' }}>
                    {predictionResult.predicted_workload} tickets
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button className="btn btn-outline-cyan" onClick={onRunOptimization}>
                  <RefreshCw size={14} />
                  <span>Re-Optimize Queue With This Ticket</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
