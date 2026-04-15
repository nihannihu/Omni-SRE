import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Supabase JWT to every outgoing request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Handle 401 — Supabase handles token refresh internally,
// but if we get a 401 from the backend, attempt a session refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      if (session && !refreshError) {
        error.config.headers.Authorization = `Bearer ${session.access_token}`;
        return api(error.config);
      }
    }
    return Promise.reject(error);
  }
);

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
