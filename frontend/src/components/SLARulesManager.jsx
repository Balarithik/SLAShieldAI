import React, { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { api } from '../services/api';

export function SLARulesManager({ onRulesUpdated }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadRules = async () => {
    try {
      const data = await api.getSLARules();
      setRules(data);
    } catch (err) {
      console.error("Failed to load SLA rules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleHourChange = (severity, hours) => {
    setRules(rules.map(r => r.severity === severity ? { ...r, sla_hours: parseFloat(hours) || 1 } : r));
  };

  const handleDescChange = (severity, desc) => {
    setRules(rules.map(r => r.severity === severity ? { ...r, description: desc } : r));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateSLARules(rules);
      setSaveSuccess(true);
      if (onRulesUpdated) onRulesUpdated();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save SLA rules: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={22} color="var(--cyan-primary)" />
            SLA Policy & Target Configuration
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Configure incident resolution SLA thresholds per severity level. Changes persist to Django backend.
          </p>
        </div>

        <button 
          className="btn-primary-action" 
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '8px 20px' }}
        >
          <Save size={16} />
          <span>{saving ? 'Saving Policies...' : 'Save SLA Rules'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div style={{ 
          marginBottom: '18px', 
          padding: '12px 16px', 
          borderRadius: 'var(--radius-sm)', 
          background: 'rgba(16, 185, 129, 0.12)', 
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle2 size={18} />
          <span>SLA rules successfully updated and persisted in Django backend!</span>
        </div>
      )}

      <div className="table-container">
        <table className="soc-table">
          <thead>
            <tr>
              <th>Severity Level</th>
              <th>Target SLA Window (Hours)</th>
              <th>Operational Policy Description</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => {
              return (
                <tr key={rule.severity}>
                  <td>
                    <span className={`badge ${
                      rule.severity === 'Critical' ? 'badge-critical' :
                      rule.severity === 'High' ? 'badge-high' :
                      rule.severity === 'Medium' ? 'badge-medium' : 'badge-low'
                    }`}>
                      {rule.severity}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="number" 
                        step="0.5" 
                        min="0.5" 
                        max="72"
                        className="form-input font-mono"
                        style={{ width: '100px', padding: '6px 10px' }}
                        value={rule.sla_hours}
                        onChange={(e) => handleHourChange(rule.severity, e.target.value)}
                      />
                      <span className="font-mono" style={{ color: 'var(--text-muted)' }}>hours</span>
                    </div>
                  </td>
                  <td>
                    <input 
                      type="text" 
                      className="form-input"
                      style={{ padding: '6px 10px' }}
                      value={rule.description || ''}
                      onChange={(e) => handleDescChange(rule.severity, e.target.value)}
                    />
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {rule.updated_at ? new Date(rule.updated_at).toLocaleString() : 'System Default'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
