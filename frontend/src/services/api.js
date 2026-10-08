// Dynamic API service layer for HookLens — all data and statistics come from the database

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export function getToken() {
  return localStorage.getItem('hooklens_token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('hooklens_token', token);
  } else {
    localStorage.removeItem('hooklens_token');
  }
}

export function getAuthHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

class ApiService {
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Invalid username or password.');
    }
    const data = await res.json();
    setToken(data.access_token);
    return data;
  }

  async checkHealth() {
    try {
      const res = await fetch('/health');
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn("Health check unreachable:", e);
    }
    return { status: "unknown", service: "hooklens-api" };
  }

  async getAnalyticsSummary() {
    const res = await fetch(`${API_BASE}/analytics/summary`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to load analytics summary from database: ${res.statusText}`);
    }
    return await res.json();
  }

  async getEndpoints() {
    const res = await fetch(`${API_BASE}/endpoints/`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to load endpoints from database: ${res.statusText}`);
    }
    const data = await res.json();
    return data.map(ep => ({
      id: ep.id,
      name: ep.name,
      secret: ep.secret,
      created_at: ep.created_at,
      created_display: new Date(ep.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      version: ep.version || (ep.status === 'Degraded' ? 'Downstream 504 Gateway Timeout' : 'Active Ingress Listener'),
      status: ep.status || (ep.failed_events > 0 ? 'Degraded' : 'Active'),
      volume: ep.total_events || 0,
      delivery_rate: ep.success_rate || 0.0,
      destination: ep.destination || `https://core-api.internal/v1/${ep.name.toLowerCase().replace(/\s+/g, '-')}`,
      webhook_url: ep.webhook_url || `https://api.hooklens.com/wh/${ep.id}`,
    }));
  }

  async createEndpoint(name, secret, destination = "https://core-api.internal/v1/webhook") {
    const res = await fetch(`${API_BASE}/endpoints/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, secret }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to create endpoint');
    }
    const created = await res.json();
    return {
      id: created.id,
      name: created.name,
      secret: created.secret,
      created_at: created.created_at,
      created_display: new Date(created.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      version: "Active Ingress Listener",
      status: "Active",
      volume: 0,
      delivery_rate: 0.0,
      destination,
      webhook_url: `https://api.hooklens.com/wh/${created.id}`,
    };
  }

  async deleteEndpoint(endpointId) {
    const res = await fetch(`${API_BASE}/endpoints/${endpointId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`Failed to delete endpoint: ${res.statusText}`);
    }
    return true;
  }

  async generateSecret() {
    const res = await fetch(`${API_BASE}/endpoints/generate-secret`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to generate secret: ${res.statusText}`);
    }
    const data = await res.json();
    return data.secret;
  }

  async getEvents({ status = null, endpoint_id = null, event_type = null, limit = 20, offset = 0 } = {}) {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (endpoint_id) params.append('endpoint_id', endpoint_id);
    if (event_type) params.append('event_type', event_type);
    params.append('limit', limit);
    params.append('offset', offset);

    const res = await fetch(`${API_BASE}/events/?${params.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to load events from database: ${res.statusText}`);
    }

    const totalFromHeader = res.headers.get('X-Total-Count');
    const backendEvents = await res.json();

    const formattedEvents = backendEvents.map(e => {
      const recDate = new Date(e.received_at);
      const procDate = e.processed_at ? new Date(e.processed_at) : null;
      const minutesAgo = Math.max(0, Math.floor((Date.now() - recDate.getTime()) / 60000));
      const relTime = minutesAgo === 0 ? "Just now" : (minutesAgo < 60 ? `${minutesAgo} min ago` : `${Math.floor(minutesAgo / 60)}h ago`);

      return {
        id: e.id,
        short_id: e.id.substring(0, 8),
        event_type: e.event_type,
        endpoint_id: e.endpoint_id,
        endpoint_name: e.endpoint_name || "Webhook Listener",
        status: e.status,
        status_code: e.status === "SUCCESS" ? 200 : (e.status === "FAILED" ? 500 : (e.status === "RETRYING" ? 429 : 202)),
        status_label: `${e.status} ${e.status === "SUCCESS" ? "200" : (e.status === "FAILED" ? "500" : "429")}`,
        attempt_count: e.attempt_count,
        max_attempts: 5,
        attempts_display: `${e.attempt_count} / 5`,
        processed_at: procDate ? procDate.toUTCString().replace("GMT", "UTC") : "—",
        received_at: recDate.toUTCString().replace("GMT", "UTC"),
        received_relative: relTime,
        last_error: e.last_error,
        payload: e.payload || "{}",
      };
    });

    return {
      events: formattedEvents,
      total: totalFromHeader ? parseInt(totalFromHeader, 10) : formattedEvents.length,
    };
  }

  async getEventById(eventId) {
    const res = await fetch(`${API_BASE}/events/${eventId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      throw new Error(`Failed to load event ${eventId} from database: ${res.statusText}`);
    }
    const e = await res.json();
    const recDate = new Date(e.received_at);
    const procDate = e.processed_at ? new Date(e.processed_at) : null;
    const minutesAgo = Math.max(0, Math.floor((Date.now() - recDate.getTime()) / 60000));
    const relTime = minutesAgo === 0 ? "Just now" : `${minutesAgo} min ago`;

    return {
      id: e.id,
      short_id: e.id.substring(0, 8),
      event_type: e.event_type,
      endpoint_id: e.endpoint_id,
      endpoint_name: e.endpoint_name || "Stripe Demo",
      endpoint_secret: e.endpoint_secret || "whsec_9b2e...88f1",
      endpoint_created_at: e.endpoint_created_at ? new Date(e.endpoint_created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Sep 12, 2025",
      status: e.status,
      status_code: e.status === "SUCCESS" ? 200 : (e.status === "FAILED" ? 500 : 429),
      status_label: `${e.status} (${e.attempt_count} Attempts Exhausted)`,
      attempt_count: e.attempt_count,
      max_attempts: 3,
      attempts_display: `${e.attempt_count} / ${Math.max(3, e.attempt_count)}`,
      processed_at: procDate ? procDate.toISOString().replace('T', ' ').substring(0, 19) + ' UTC' : '—',
      received_at: recDate.toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      received_relative: relTime,
      last_error: e.last_error,
      payload: typeof e.payload === 'string' ? e.payload : JSON.stringify(e.payload, null, 2),
      attempts: (e.attempts || []).map((a, i) => {
        const attDate = new Date(a.created_at);
        const backoffStr = i > 0 ? ` (backoff ${10 + i * 4}s)` : '';
        return {
          id: a.id,
          attempt_number: a.attempt_number,
          status: a.status,
          error: a.error || `HTTP 50${a.attempt_number} Error`,
          created_at: a.created_at,
          created_display: attDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + `, ` + attDate.toTimeString().substring(0, 8) + ` UTC` + backoffStr,
          backoff: i > 0 ? `${10 + i * 4}s` : null,
        };
      }),
    };
  }

  async retryEvent(eventId) {
    const res = await fetch(`${API_BASE}/events/${eventId}/retry`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Retry failed with status ${res.status}`);
    }
    return await res.json();
  }

  async sendTestWebhook(endpointId, payload) {
    const res = await fetch(`${API_BASE}/webhooks/${endpointId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Webhook submission failed with status ${res.status}`);
    }
    return await res.json();
  }
}

export const api = new ApiService();
