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

async function parseJsonResponse(res, defaultMessage = 'Request failed.') {
  const contentType = res.headers.get('content-type') || '';
  let payload = {};

  if (contentType.includes('application/json')) {
    payload = await res.json().catch(() => ({}));
  } else {
    const text = await res.text().catch(() => '');
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text };
      }
    }
  }

  if (!res.ok) {
    const errorMessage = payload?.error || payload?.message || payload?.detail || defaultMessage;
    throw new Error(errorMessage);
  }

  return payload;
}

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
    return parseJsonResponse(res, 'Dashboard metrics request failed.');
  },

  async getTickets(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/tickets/${query ? '?' + query : ''}`);
    return parseJsonResponse(res, 'Failed to load tickets.');
  },

  async getTicket(id) {
    const res = await fetch(`${API_BASE}/tickets/${id}/`);
    return parseJsonResponse(res, `Failed to load ticket ${id}.`);
  },

  async createTicket(data) {
    const res = await fetch(`${API_BASE}/tickets/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(res, 'Failed to create ticket.');
  },

  async updateTicket(id, data) {
    const res = await fetch(`${API_BASE}/tickets/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(res, 'Failed to update ticket.');
  },

  async deleteTicket(id) {
    const res = await fetch(`${API_BASE}/tickets/${id}/`, {
      method: 'DELETE',
    });
    return parseJsonResponse(res, 'Failed to delete ticket.');
  },

  async uploadTickets(formData) {
    const res = await fetch(`${API_BASE}/tickets/upload/`, {
      method: 'POST',
      body: formData,
    });
    return parseJsonResponse(res, 'Upload failed. Please check the backend connection and try again.');
  },

  async optimizeQueue(weights = null) {
    const res = await fetch(`${API_BASE}/queue/optimize/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weights }),
    });
    return parseJsonResponse(res, 'Queue optimization failed.');
  },

  async getBeforeQueue() {
    const res = await fetch(`${API_BASE}/queue/before/`);
    return parseJsonResponse(res, 'Failed to load before queue.');
  },

  async getAfterQueue() {
    const res = await fetch(`${API_BASE}/queue/after/`);
    return parseJsonResponse(res, 'Failed to load after queue.');
  },

  async getQueueHistory() {
    const res = await fetch(`${API_BASE}/queue/history/`);
    return parseJsonResponse(res, 'Failed to load queue history.');
  },

  async getAnalysts() {
    const res = await fetch(`${API_BASE}/analysts/`);
    return parseJsonResponse(res, 'Failed to load analysts.');
  },

  async createAnalyst(data) {
    const res = await fetch(`${API_BASE}/analysts/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(res, 'Failed to create analyst.');
  },

  async updateAnalyst(id, data) {
    const res = await fetch(`${API_BASE}/analysts/${id}/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return parseJsonResponse(res, 'Failed to update analyst.');
  },

  async deleteAnalyst(id) {
    const res = await fetch(`${API_BASE}/analysts/${id}/`, {
      method: 'DELETE',
    });
    return parseJsonResponse(res, 'Failed to delete analyst.');
  },

  async getSLARules() {
    const res = await fetch(`${API_BASE}/sla-rules/`);
    return parseJsonResponse(res, 'Failed to load SLA rules.');
  },

  async updateSLARules(rules) {
    const res = await fetch(`${API_BASE}/sla-rules/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules }),
    });
    return parseJsonResponse(res, 'Failed to update SLA rules.');
  },

  async getBreachTrends() {
    const res = await fetch(`${API_BASE}/breach-trends/`);
    return parseJsonResponse(res, 'Failed to load breach trends.');
  },

  async generateScenario(scenario, count = 20, clearExisting = true) {
    const res = await fetch(`${API_BASE}/simulation/generate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario, count, clear_existing: clearExisting }),
    });
    return parseJsonResponse(res, 'Failed to generate scenario data.');
  },

  async getMLPerformance() {
    const res = await fetch(`${API_BASE}/ml/performance/`);
    return parseJsonResponse(res, 'Failed to load model performance.');
  }
};
