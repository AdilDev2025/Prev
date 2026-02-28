const API_BASE = 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('nf_token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets boundary automatically)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.message || data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ─── Auth ───
export const authApi = {
  register: (name, email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
};

// ─── Dashboard ───
export const dashboardApi = {
  getUserDashboard: () => request('/dashboard'),
  getWorkspaceDashboard: (workspaceId) =>
    request(`/workspace-dashboard/${workspaceId}`),
};

// ─── Workspace ───
export const workspaceApi = {
  list: () => request('/workspace'),
  create: (name) =>
    request('/workspace', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  update: (id, name) =>
    request(`/workspace/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  delete: (id) =>
    request(`/workspace/${id}`, { method: 'DELETE' }),
  getMembers: (id) => request(`/workspace/${id}/members`),
  updateMemberRole: (workspaceId, userId, role) =>
    request(`/workspace/${workspaceId}/members`, {
      method: 'PATCH',
      body: JSON.stringify({ userId, role }),
    }),
};

// ─── Invitations ───
export const inviteApi = {
  send: (workspaceId, email, role = 'user') =>
    request(`/workspace/${workspaceId}/invite`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  accept: (inviteId) =>
    request(`/workspace/invite/${inviteId}/accept`, { method: 'POST' }),
};

// ─── Attendance ───
export const attendanceApi = {
  registerFace: (workspaceId, faceFile) => {
    const fd = new FormData();
    fd.append('face', faceFile);
    return request(`/workspace-dashboard/${workspaceId}/attendance/register-face`, {
      method: 'POST',
      body: fd,
    });
  },
  markAttendance: (workspaceId, faceFile) => {
    const fd = new FormData();
    fd.append('face', faceFile);
    return request(`/workspace-dashboard/${workspaceId}/attendance/mark-attendance`, {
      method: 'POST',
      body: fd,
    });
  },
  checkOut: (workspaceId, faceFile) => {
    const fd = new FormData();
    fd.append('face', faceFile);
    return request(`/workspace-dashboard/${workspaceId}/attendance/check-out`, {
      method: 'POST',
      body: fd,
    });
  },
  getStatus: (workspaceId) =>
    request(`/workspace-dashboard/${workspaceId}/attendance/status`),
  facialStatus: () =>
    request('/facial/status'),
};

// ─── Productivity ───
export const productivityApi = {
  createSnapshot: (userId, workspaceId, startDate, endDate) =>
    request('/productivity/snapshot', {
      method: 'POST',
      body: JSON.stringify({ userId, workspaceId, startDate, endDate }),
    }),
  getSnapshots: (userId, workspaceId) =>
    request(`/productivity/snapshots/${userId}/${workspaceId}`),
  getLatest: (userId, workspaceId) =>
    request(`/productivity/snapshot/latest/${userId}/${workspaceId}`),
  getLiveHours: (userId, workspaceId) =>
    request(`/productivity/live-hours/${userId}/${workspaceId}`),
  getWorkspaceSnapshots: (workspaceId) =>
    request(`/productivity/workspace/${workspaceId}/snapshots`),
  getWorkspaceLiveHours: (workspaceId) =>
    request(`/productivity/workspace/${workspaceId}/live-hours`),
  generateAll: (workspaceId, startDate, endDate) =>
    request(`/productivity/workspace/${workspaceId}/generate-all`, {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate }),
    }),
};

