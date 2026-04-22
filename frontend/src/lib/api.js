const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('review360_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem('review360_token');
    localStorage.removeItem('review360_user');
    window.location.href = '/login';
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Classes
  getClasses: () => request('/classes'),
  createClass: (data) => request('/classes', { method: 'POST', body: JSON.stringify(data) }),
  getClassStudents: (classId) => request(`/classes/${classId}/students`),

  // Students
  getStudentDashboard: (id) => request(`/students/${id}/dashboard`),
  getActivitySheets: (studentId) => request(`/students/${studentId}/activity-sheets`),
  createActivitySheets: (studentId) => request(`/students/${studentId}/activity-sheets`, { method: 'POST' }),
  updateActivitySheet: (id, data) => request(`/students/activity-sheets/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Import Excel (multipart)
  previewStudents: async (classId, file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/students/preview/${classId}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur preview');
    return data;
  },

  importStudents: async (classId, file) => {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/students/import/${classId}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur import');
    return data;
  },

  // Sessions
  getSessions: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/sessions${qs ? `?${qs}` : ''}`);
  },
  createSession: (data) => request('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  updateSession: (id, data) => request(`/sessions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Validations
  getValidations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/validations${qs ? `?${qs}` : ''}`);
  },
  createValidation: (data) => request('/validations', { method: 'POST', body: JSON.stringify(data) }),

  // Dashboard
  getTeacherDashboard: () => request('/dashboard/teacher'),
  getSchoolDashboard: () => request('/dashboard/school'),
  getReports: () => request('/dashboard/reports'),

  // Alerts
  createAlert: (data) => request('/alerts', { method: 'POST', body: JSON.stringify(data) }),
  getAlerts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/alerts${qs ? `?${qs}` : ''}`);
  },
  resolveAlert: (id) => request(`/alerts/${id}`, { method: 'PATCH' }),

  // Exports (return blob URL for download)
  exportPDF: async () => {
    const token = getToken();
    const res = await fetch(`${BASE}/dashboard/export/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Erreur export PDF');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
  exportExcel: async () => {
    const token = getToken();
    const res = await fetch(`${BASE}/dashboard/export/excel`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Erreur export Excel');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
};
