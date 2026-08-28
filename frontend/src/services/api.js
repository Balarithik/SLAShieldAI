const normalizeApiBase = () => {
  const raw = import.meta.env.VITE_API_BASE_URL || import.meta.env.BACKEND_URL || '/api';
  if (!raw || raw === '/') return '/api';

  if (/^https?:\/\//i.test(raw)) {
    const sanitized = raw.replace(/\/+$/, '');
    return sanitized.endsWith('/api') ? sanitized : `${sanitized}/api`;
  }

  return raw.replace(/\/+$/, '');
};

const API_BASE = normalizeApiBase();

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health/`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Backend health check failed: ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('Backend health endpoint did not return JSON');
    }

    return res.json();
  },

  async isBackendConnected() {
    try {
      const result = await this.getHealth();
      return Boolean(
        result && (
          result.status === 'HEALTHY' ||
          result.status === 'healthy' ||
          result.ai_engine === 'ONLINE'
        )
      );
    } catch (error) {
      return false;
    }
  },

  async getDashboardMetrics() {
    const res = await fetch(`${API_BASE}/dashboard/metrics/`);
    return res.json();
  },

  async getTickets(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/tickets/${query ? '?' + query : ''}`);
    return res.json();
  },

  async getTicket(id) {
    const res = await fetch(`${API_BASE}/tickets/${id}/`);
    return res.json();
  },

  async createTicket(data) {
    const res = await fetch(`${API_BASE}/tickets/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateTicket(id, data) {
    const res = await fetch(`${API_BASE}/tickets/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteTicket(id) {
    const res = await fetch(`${API_BASE}/tickets/${id}/`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async uploadTickets(formData) {
    const res = await fetch(`${API_BASE}/tickets/upload/`, {
      method: 'POST',
      body: formData,
    });
    return res.json();
  },

  async optimizeQueue(weights = null) {
    const res = await fetch(`${API_BASE}/queue/optimize/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weights }),
    });
    return res.json();
  },

  async getBeforeQueue() {
    const res = await fetch(`${API_BASE}/queue/before/`);
    return res.json();
  },

  async getAfterQueue() {
    const res = await fetch(`${API_BASE}/queue/after/`);
    return res.json();
  },

  async getQueueHistory() {
    const res = await fetch(`${API_BASE}/queue/history/`);
    return res.json();
  },

  async getAnalysts() {
    const res = await fetch(`${API_BASE}/analysts/`);
    return res.json();
  },

  async createAnalyst(data) {
    const res = await fetch(`${API_BASE}/analysts/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async updateAnalyst(id, data) {
    const res = await fetch(`${API_BASE}/analysts/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async deleteAnalyst(id) {
    const res = await fetch(`${API_BASE}/analysts/${id}/`, {
      method: 'DELETE',
    });
    return res.json();
  },

  async getSLARules() {
    const res = await fetch(`${API_BASE}/sla-rules/`);
    return res.json();
  },

  async updateSLARules(rules) {
    const res = await fetch(`${API_BASE}/sla-rules/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    });
    return res.json();
  },

  async getBreachTrends() {
    const res = await fetch(`${API_BASE}/breach-trends/`);
    return res.json();
  },

  async generateScenario(scenario, count = 20, clearExisting = true) {
    const res = await fetch(`${API_BASE}/simulation/generate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, count, clear_existing: clearExisting }),
    });
    return res.json();
  },

  async getMLPerformance() {
    const res = await fetch(`${API_BASE}/ml/performance/`);
    return res.json();
  }
};
