// Omnidesk Antigravity Backend Client
// Wires the dashboard to https://omnidesk-os-4.onrender.com

import axios from 'axios';

export const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api/v1';
const STORAGE_KEY = 'omnidesk-jwt';

// --- Token management ---
export const getToken = () => {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
};
export const setToken = (token) => {
  try { localStorage.setItem(STORAGE_KEY, token); } catch (e) { /* storage unavailable */ }
};
export const clearToken = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* storage unavailable */ }
};

// --- Axios instance with Authorization header ---
const client = axios.create({ baseURL: BASE_URL, timeout: 30000 });
client.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

// --- Safe fetch helper: returns data on success, null on failure ---
// Caller uses fallback static data when this returns null (so UI never breaks).
const safeGet = async (path, params) => {
  try {
    const r = await client.get(path, { params });
    return r.data;
  } catch (e) {
    console.warn(`[omnidesk] GET ${path} failed:`, e.response?.status || e.message);
    return null;
  }
};

// --- Auth ---
export const login = async (email, password) => {
  const r = await client.post('/auth/login', { email, password });
  const token = r.data?.token || r.data?.access_token;
  if (!token) throw new Error('No token returned from login');
  setToken(token);
  return { token, user: r.data?.user || null };
};

export const logout = () => clearToken();

// --- Dashboard data endpoints ---
export const fetchKpis = (view) => safeGet('/analytics/kpis', { view });
export const fetchUsageTrend = (range = '7d') => safeGet('/analytics/usage-trend', { range });
export const fetchWorkspaceDistribution = () => safeGet('/analytics/workspace-distribution');
export const fetchTopWorkspaces = (limit = 4) => safeGet('/analytics/top-workspaces', { limit });
export const fetchRecentActivity = (limit = 10) => safeGet('/analytics/recent-activity', { limit });
export const fetchWorkspaceMembers = (workspaceId) =>
  safeGet(`/workspaces/${workspaceId || 'default'}/members`);
export const fetchEvents = (range = 'week') => safeGet('/events', { range });
export const fetchTasks = (status = 'all') => safeGet('/tasks', { status });
export const fetchRecentDocs = (limit = 5) => safeGet('/pages', { limit });
export const createDoc = async (title, type) => {
  try {
    const r = await client.post('/pages', { title, type });
    return r.data || r;
  } catch (e) {
    console.warn('[omnidesk] POST /pages failed:', e.message);
    return null;
  }
};

// --- Shape normalizers (backend may differ slightly; we coerce to UI shape) ---
const COLORS_BY_INDEX = ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-orange-500', 'bg-emerald-500', 'bg-indigo-500'];
const initials = (name = '?') => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

export const normalizeActivity = (rows) =>
  (rows || []).map((r, i) => ({
    id: r.id || i,
    user: r.user || r.user_name || r.userName || 'User',
    action: r.action || r.event_type || 'updated',
    target: r.target || r.resource || r.subject || '—',
    type: r.type || (r.resource_type || 'document'),
    time: r.time || r.timeAgo || (r.created_at ? new Date(r.created_at).toLocaleString() : ''),
    avatar: r.avatar || initials(r.user || r.user_name || 'User'),
    color: r.color || COLORS_BY_INDEX[i % COLORS_BY_INDEX.length],
  }));

export const normalizeMembers = (rows) =>
  (rows || []).map((m, i) => ({
    id: m.id || i,
    name: m.name || 'Member',
    role: m.role || 'Member',
    status: m.status || 'offline',
    avatar: m.avatar || initials(m.name),
    color: m.color || m.avatar_color || COLORS_BY_INDEX[i % COLORS_BY_INDEX.length],
  }));

export const normalizeEvents = (rows) => {
  const PRIORITY_COLORS = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (rows || []).map((e, i) => ({
    id: e.id || i,
    title: e.title || 'Untitled event',
    time: e.time || (e.event_time ? new Date(e.event_time).toLocaleString() : ''),
    priority: e.priority || 'medium',
    color: PRIORITY_COLORS[e.priority || 'medium'],
  }));
};

export const normalizeTasks = (rows) =>
  (rows || []).map((t, i) => ({
    id: t.id || i,
    title: t.title || 'Task',
    priority: t.priority || 'medium',
    status: t.status || 'todo',
    progress: typeof t.progress === 'number' ? t.progress : 0,
  }));

export const normalizeRecentDocs = (pages) => {
  const TYPE_META = {
    document: { color: 'text-blue-600 bg-blue-50' },
    table: { color: 'text-purple-600 bg-purple-50' },
    canvas: { color: 'text-pink-600 bg-pink-50' },
  };
  return ((pages?.pages || pages || [])).slice(0, 5).map((p, i) => ({
    id: p.id || i,
    title: p.title || 'Untitled',
    type: p.type || 'document',
    color: (TYPE_META[p.type] || TYPE_META.document).color,
    updated: p.updated_at ? new Date(p.updated_at).toLocaleString() : 'recently',
    stars: 3,
  }));
};

export const normalizeTopWorkspaces = (rows) => {
  const GRADIENTS = ['from-blue-400 to-blue-600', 'from-purple-400 to-pink-500', 'from-orange-400 to-red-500', 'from-emerald-400 to-teal-500'];
  return (rows || []).map((w, i) => ({
    name: w.name || 'Workspace',
    members: w.members || 0,
    docs: w.docs || 0,
    growth: w.growth || 0,
    color: w.color || GRADIENTS[i % GRADIENTS.length],
  }));
};

// Normalize KPI response. Backend returns { activeUsers: { value, delta, trend }, ... }
export const normalizeKpisAdmin = (data) => {
  if (!data) return null;
  const pick = (k) => data[k] || {};
  return [
    { id: 'k1', label: 'Active Users',    value: pick('activeUsers').value    ?? '—', delta: pick('activeUsers').delta    ?? 0, trend: pick('activeUsers').trend    || 'up',   color: 'from-blue-500 to-blue-600',    icon: 'users' },
    { id: 'k2', label: 'Total Documents', value: pick('totalDocuments').value ?? '—', delta: pick('totalDocuments').delta ?? 0, trend: pick('totalDocuments').trend || 'up',   color: 'from-purple-500 to-purple-600', icon: 'file' },
    { id: 'k3', label: 'Smart Tables',    value: pick('smartTables').value    ?? '—', delta: pick('smartTables').delta    ?? 0, trend: pick('smartTables').trend    || 'up',   color: 'from-orange-500 to-pink-500',   icon: 'database' },
    { id: 'k4', label: 'Storage Used',    value: pick('storageUsed').value    ?? '—', delta: pick('storageUsed').delta    ?? 0, trend: pick('storageUsed').trend    || 'down', color: 'from-emerald-500 to-teal-600',  icon: 'hardDrive' },
  ];
};

export const normalizeKpisUser = (data) => {
  if (!data) return null;
  const pick = (k) => data[k] || {};
  return [
    { id: 'u1', label: 'My Documents', value: pick('myDocuments').value  ?? '—', delta: pick('myDocuments').delta  ?? 0, trend: pick('myDocuments').trend  || 'up',   color: 'from-blue-500 to-indigo-600',  icon: 'file' },
    { id: 'u2', label: 'Open Tasks',   value: pick('openTasks').value    ?? '—', delta: pick('openTasks').delta    ?? 0, trend: pick('openTasks').trend    || 'down', color: 'from-amber-500 to-orange-600', icon: 'check' },
    { id: 'u3', label: 'Team Activity',value: pick('teamActivity').value ?? '—', delta: pick('teamActivity').delta ?? 0, trend: pick('teamActivity').trend || 'up',   color: 'from-pink-500 to-rose-600',    icon: 'activity' },
    { id: 'u4', label: 'AI Credits',   value: pick('aiCredits').value    ?? '—', delta: pick('aiCredits').delta    ?? 0, trend: pick('aiCredits').trend    || 'up',   color: 'from-violet-500 to-purple-600',icon: 'sparkles' },
  ];
};

export default client;
