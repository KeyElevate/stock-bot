const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Stats
  getStats: () => request('/stats'),

  // Services
  getServices: () => request('/services'),
  createService: (name) => request('/services', { method: 'POST', body: JSON.stringify({ name }) }),
  deleteService: (name) => request(`/services/${name}`, { method: 'DELETE' }),

  // Stock
  getStock: (service) => request(`/stock/${service}`),
  addStock: (service, lines) => request(`/stock/${service}/add`, { method: 'POST', body: JSON.stringify({ lines }) }),
  deleteStock: (service, email) => request(`/stock/${service}/${encodeURIComponent(email)}`, { method: 'DELETE' }),

  // Users
  getUsers: () => request('/users'),
  banUser: (id) => request(`/users/${id}/ban`, { method: 'POST' }),
  unbanUser: (id) => request(`/users/${id}/unban`, { method: 'POST' }),
  blacklistUser: (id) => request(`/users/${id}/blacklist`, { method: 'POST' }),
  unblacklistUser: (id) => request(`/users/${id}/unblacklist`, { method: 'POST' }),
  muteUser: (id, duration) => request(`/users/${id}/mute`, { method: 'POST', body: JSON.stringify({ duration }) }),
  unmuteUser: (id) => request(`/users/${id}/unmute`, { method: 'POST' }),

  // Logs
  getStockLogs: (page = 1, limit = 20) => request(`/logs/stock?page=${page}&limit=${limit}`),
  getCommandLogs: (page = 1, limit = 20) => request(`/logs/commands?page=${page}&limit=${limit}`),

  // Status
  getStatus: () => request('/status'),
};
