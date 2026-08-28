import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit3, Check, X, Shield, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

export function AnalystManager({ onAnalystUpdated }) {
  const [analysts, setAnalysts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAnalyst, setNewAnalyst] = useState({
    analyst_id: '',
    name: '',
    experience_years: 3,
    current_workload: 3,
    maximum_capacity: 10,
    skills: 'EDR, SIEM'
  });

  const loadAnalysts = async () => {
    try {
      const data = await api.getAnalysts();
      setAnalysts(data);
    } catch (err) {
      console.error("Failed to load analysts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalysts();
  }, []);

  const handleEditClick = (a) => {
    setEditingId(a.analyst_id);
    setEditForm({
      name: a.name,
      experience_years: a.experience_years,
      current_workload: a.current_workload,
      maximum_capacity: a.maximum_capacity,
      is_available: a.is_available
    });
  };

  const handleSaveEdit = async (analyst_id) => {
    try {
      await api.updateAnalyst(analyst_id, editForm);
      setEditingId(null);
      await loadAnalysts();
      if (onAnalystUpdated) onAnalystUpdated();
    } catch (err) {
      alert("Failed to update analyst: " + err.message);
    }
  };

  const handleDelete = async (analyst_id) => {
    if (!window.confirm(`Are you sure you want to remove Analyst ${analyst_id}?`)) return;
    try {
      await api.deleteAnalyst(analyst_id);
      await loadAnalysts();
      if (onAnalystUpdated) onAnalystUpdated();
    } catch (err) {
      alert("Failed to delete analyst: " + err.message);
    }
  };

  const handleCreateAnalyst = async (e) => {
    e.preventDefault();
    if (!newAnalyst.analyst_id) {
      alert("Analyst ID is required (e.g. A06)");
      return;
    }

    try {
      const payload = {
        ...newAnalyst,
        skills: newAnalyst.skills.split(',').map(s => s.trim()).filter(Boolean)
      };
      await api.createAnalyst(payload);
      setShowAddModal(false);
      setNewAnalyst({ analyst_id: '', name: '', experience_years: 3, current_workload: 3, maximum_capacity: 10, skills: 'EDR, SIEM' });
      await loadAnalysts();
      if (onAnalystUpdated) onAnalystUpdated();
    } catch (err) {
      alert("Failed to add analyst: " + err.message);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={22} color="var(--cyan-primary)" />
            SOC Analyst Fleet Management
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Configure analyst capacity constraints, experience levels, and current workload.
          </p>
        </div>

        <button className="btn btn-outline-cyan" onClick={() => setShowAddModal(true)}>
          <Plus size={16} />
          <span>Add New Analyst</span>
        </button>
      </div>

      <div className="table-container">
        <table className="soc-table">
          <thead>
            <tr>
              <th>Analyst ID</th>
              <th>Name</th>
              <th>Experience</th>
              <th>Current Workload</th>
              <th>Max Capacity</th>
              <th>Utilization</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {analysts.map((a) => {
              const isEditing = editingId === a.analyst_id;
              const util = a.utilization_pct || 0;

              return (
                <tr key={a.analyst_id}>
                  <td style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--cyan-primary)' }}>
                    {a.analyst_id}
                  </td>
                  <td>
                    {isEditing ? (
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ padding: '4px 8px', fontSize: '0.85rem' }}
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    ) : (
                      a.name
                    )}
                  </td>
                  <td className="font-mono">
                    {isEditing ? (
                      <input 
                        type="number" 
                        min="1"
                        max="30"
                        className="form-input font-mono" 
                        style={{ padding: '4px 8px', width: '70px', fontSize: '0.85rem' }}
                        value={editForm.experience_years}
                        onChange={(e) => setEditForm({ ...editForm, experience_years: parseInt(e.target.value) || 1 })}
                      />
                    ) : (
                      `${a.experience_years} yrs`
                    )}
                  </td>
                  <td className="font-mono">
                    {isEditing ? (
                      <input 
                        type="number" 
                        min="0"
                        className="form-input font-mono" 
                        style={{ padding: '4px 8px', width: '70px', fontSize: '0.85rem' }}
                        value={editForm.current_workload}
                        onChange={(e) => setEditForm({ ...editForm, current_workload: parseInt(e.target.value) || 0 })}
                      />
                    ) : (
                      `${a.current_workload} tickets`
                    )}
                  </td>
                  <td className="font-mono">
                    {isEditing ? (
                      <input 
                        type="number" 
                        min="1"
                        className="form-input font-mono" 
                        style={{ padding: '4px 8px', width: '70px', fontSize: '0.85rem' }}
                        value={editForm.maximum_capacity}
                        onChange={(e) => setEditForm({ ...editForm, maximum_capacity: parseInt(e.target.value) || 1 })}
                      />
                    ) : (
                      `${a.maximum_capacity} max`
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="progress-track" style={{ width: '60px', height: '6px' }}>
                        <div 
                          className={`progress-fill ${util >= 90 ? 'rose' : util >= 70 ? 'amber' : 'emerald'}`}
                          style={{ width: `${Math.min(100, util)}%` }}
                        />
                      </div>
                      <span className="font-mono" style={{ fontWeight: 700, fontSize: '0.8rem' }}>{util}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      a.capacity_status === 'OVERLOADED' ? 'badge-critical' :
                      a.capacity_status === 'BUSY' ? 'badge-high' :
                      a.capacity_status === 'AVAILABLE' ? 'badge-low' : 'badge-medium'
                    }`}>
                      {a.capacity_status}
                    </span>
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-outline-cyan" style={{ padding: '4px 8px' }} onClick={() => handleSaveEdit(a.analyst_id)}>
                          <Check size={14} />
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingId(null)}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => handleEditClick(a)}>
                          <Edit3 size={14} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDelete(a.analyst_id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '16px' }}>Add Security Analyst to Fleet</h3>
            <form onSubmit={handleCreateAnalyst}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Analyst ID (Unique)</label>
                  <input 
                    type="text" 
                    className="form-input font-mono" 
                    placeholder="e.g. A06" 
                    value={newAnalyst.analyst_id} 
                    onChange={(e) => setNewAnalyst({ ...newAnalyst, analyst_id: e.target.value })} 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. Jordan Blake" 
                    value={newAnalyst.name} 
                    onChange={(e) => setNewAnalyst({ ...newAnalyst, name: e.target.value })} 
                    required 
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div className="form-group">
                  <label className="form-label">Experience (Years)</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="form-input font-mono" 
                    value={newAnalyst.experience_years} 
                    onChange={(e) => setNewAnalyst({ ...newAnalyst, experience_years: parseInt(e.target.value) || 1 })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Current Workload</label>
                  <input 
                    type="number" 
                    min="0" 
                    className="form-input font-mono" 
                    value={newAnalyst.current_workload} 
                    onChange={(e) => setNewAnalyst({ ...newAnalyst, current_workload: parseInt(e.target.value) || 0 })} 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Capacity</label>
                  <input 
                    type="number" 
                    min="1" 
                    className="form-input font-mono" 
                    value={newAnalyst.maximum_capacity} 
                    onChange={(e) => setNewAnalyst({ ...newAnalyst, maximum_capacity: parseInt(e.target.value) || 1 })} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Specializations / Skills (comma separated)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={newAnalyst.skills} 
                  onChange={(e) => setNewAnalyst({ ...newAnalyst, skills: e.target.value })} 
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary-action">Add Analyst</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
