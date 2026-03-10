

const API_BASE = 'http://localhost:3000/api';
const FACIAL_BASE = 'http://localhost:8001';

function getToken() { return localStorage.getItem('nf_token'); }

async function req(endpoint, opts = {}, base = API_BASE) {
  const token = getToken();
  const headers = { ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${base}${endpoint}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ─── Auth ───────────────────────────────────────────────
export const authApi = {
  register: (name, email, password) =>
    req('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) }),
  login: (email, password) =>
    req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
};

// ─── Health ─────────────────────────────────────────────
export const healthApi = {
  backend: () => fetch('http://localhost:3000/health').then(r => r.json()),
  facial: () => fetch(`${FACIAL_BASE}/health`).then(r => r.json()),
  smtp: () => fetch('http://localhost:3000/health/smtp').then(r => r.json()),
  facialStatus: () => req('/facial/status'),
};

// ─── Dashboard ──────────────────────────────────────────
export const dashboardApi = {
  get: () => req('/dashboard'),
  getWorkspace: (id) => req(`/workspace-dashboard/${id}`),
};

// ─── Workspace ──────────────────────────────────────────
export const workspaceApi = {
  list: () => req('/workspace'),
  create: (name) => req('/workspace', { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id, name) => req(`/workspace/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
  delete: (id) => req(`/workspace/${id}`, { method: 'DELETE' }),
  getMembers: (id) => req(`/workspace/${id}/members`),
  updateMemberRole: (id, userId, role) =>
    req(`/workspace/${id}/members`, { method: 'PATCH', body: JSON.stringify({ userId, role }) }),
  invite: (id, email, role) =>
    req(`/workspace/${id}/invite`, { method: 'POST', body: JSON.stringify({ email, role }) }),
  acceptInvite: (inviteId) =>
    req(`/workspace/invite/${inviteId}/accept`, { method: 'POST' }),
};

// ─── Attendance ─────────────────────────────────────────
export const attendanceApi = {
  registerFace: (workspaceId, file) => {
    const fd = new FormData(); fd.append('face', file);
    return req(`/workspace-dashboard/${workspaceId}/attendance/register-face`, { method: 'POST', body: fd });
  },
  markAttendance: (workspaceId, file) => {
    const fd = new FormData(); fd.append('face', file);
    return req(`/workspace-dashboard/${workspaceId}/attendance/mark-attendance`, { method: 'POST', body: fd });
  },
  checkOut: (workspaceId, file) => {
    const fd = new FormData(); fd.append('face', file);
    return req(`/workspace-dashboard/${workspaceId}/attendance/check-out`, { method: 'POST', body: fd });
  },
  getStatus: (workspaceId) => req(`/workspace-dashboard/${workspaceId}/attendance/status`),
};

// ─── Productivity ────────────────────────────────────────
export const productivityApi = {
  createSnapshot: (userId, workspaceId, startDate, endDate) =>
    req('/productivity/snapshot', { method: 'POST', body: JSON.stringify({ userId, workspaceId, startDate, endDate }) }),
  getSnapshots: (userId, workspaceId) => req(`/productivity/snapshots/${userId}/${workspaceId}`),
  getLatest: (userId, workspaceId) => req(`/productivity/snapshot/latest/${userId}/${workspaceId}`),
  getLiveHours: (userId, workspaceId) => req(`/productivity/live-hours/${userId}/${workspaceId}`),
  getWorkspaceSnapshots: (workspaceId) => req(`/productivity/workspace/${workspaceId}/snapshots`),
  getWorkspaceLiveHours: (workspaceId) => req(`/productivity/workspace/${workspaceId}/live-hours`),
  generateAll: (workspaceId, startDate, endDate) =>
    req(`/productivity/workspace/${workspaceId}/generate-all`, { method: 'POST', body: JSON.stringify({ startDate, endDate }) }),
};
