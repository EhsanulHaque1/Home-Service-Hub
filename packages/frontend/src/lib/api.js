const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

/**
 * Generic fetch wrapper with credentials included for cookie-based auth.
 */
async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.message || 'Request failed');
    error.status = res.status;
    error.errors = data?.errors || {};
    throw error;
  }

  return data;
}

export function apiGet(path) {
  return request(path, { method: 'GET' });
}

export function apiPost(path, body) {
  return request(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function registerUser(userData) {
  return apiPost('/register', userData);
}

export function loginUser(credentials) {
  return apiPost('/login', credentials);
}

export function logoutUser() {
  return apiPost('/logout', {});
}

export function fetchCurrentUser() {
  return apiGet('/me');
}
