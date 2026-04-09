import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — try refresh, else redirect to login
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          error.config.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(error.config);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ── Workspaces ──
export const workspaceAPI = {
  list: () => api.get('/workspaces'),
  get: (id) => api.get(`/workspaces/${id}`),
  create: (data) => api.post('/workspaces', data),
  updateSettings: (id, settings) => api.patch(`/workspaces/${id}/settings`, { settings }),
  addConventions: (id, conventions) => api.post(`/workspaces/${id}/conventions`, { conventions }),
};

// ── Repositories ──
export const repoAPI = {
  list: (workspaceId) => api.get(`/workspaces/${workspaceId}/repos`),
  connect: (workspaceId, data) => api.post(`/workspaces/${workspaceId}/repos`, data),
};

// ── Reviews ──
export const reviewAPI = {
  trigger: (data) => api.post('/reviews', data),
  get: (id) => api.get(`/reviews/${id}`),
  list: (workspaceId, page = 1) => api.get(`/reviews/workspace/${workspaceId}?page=${page}`),
};

// ── Incidents ──
export const incidentAPI = {
  create: (data) => api.post('/incidents', data),
  list: (workspaceId) => api.get(`/incidents/workspace/${workspaceId}`),
};

// ── Health ──
export const healthAPI = {
  check: () => api.get('/health'),
};

export default api;
