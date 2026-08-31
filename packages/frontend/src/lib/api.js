const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const API_BASE = API_URL.replace(/\/api$/, "");

/**
 * Get the auth token from localStorage
 */
function getAuthToken() {
  return localStorage.getItem("auth_token");
}

/**
 * Set the auth token in localStorage
 */
function setAuthToken(token) {
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
}

/**
 * Read a cookie value by name (used to grab the XSRF-TOKEN set by Sanctum).
 */
function getCookie(name) {
  const match = document.cookie.match(
    new RegExp("(^|;\\s*)" + name + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Sanctum SPA auth requires a CSRF cookie before any state-changing request.
 * We fetch /sanctum/csrf-cookie once (cached) so the XSRF-TOKEN cookie is set,
 * then forward it as the X-XSRF-TOKEN header on POST/PUT/DELETE calls.
 */
let csrfReady = null;
function ensureCsrfToken() {
  if (!csrfReady) {
    csrfReady = fetch(`${API_BASE}/sanctum/csrf-cookie`, {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
    })
      .then(() => {})
      .catch(() => {
        csrfReady = null;
      });
  }
  return csrfReady;
}

/**
 * Generic fetch wrapper with credentials included for cookie-based auth or Bearer token.
 */
async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const isUnsafe = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers || {}),
  };

  // Add Bearer token if available
  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (isUnsafe) {
    await ensureCsrfToken();
    const xsrf = getCookie("XSRF-TOKEN");
    if (xsrf) headers["X-XSRF-TOKEN"] = xsrf;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.message || "Request failed");
    error.status = res.status;
    error.errors = data?.errors || {};
    throw error;
  }

  return data;
}

export function apiGet(path) {
  return request(path, { method: "GET" });
}

export function apiPost(path, body) {
  return request(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function apiPut(path, body) {
  return request(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export function apiDelete(path) {
  return request(path, { method: "DELETE" });
}

export function registerUser(userData) {
  return apiPost("/register", userData);
}

export function loginUser(credentials) {
  return apiPost("/login", credentials).then((res) => {
    // Store the token if provided
    if (res?.token) {
      localStorage.setItem("auth_token", res.token);
    }
    return res;
  });
}

export function logoutUser() {
  return apiPost("/logout", {}).finally(() => {
    // Clear the token on logout
    localStorage.removeItem("auth_token");
  });
}

export function fetchCurrentUser() {
  return apiGet("/me");
}

export function resendVerificationEmail(email) {
  return apiPost("/email/resend", { email });
}

export function checkEmailStatus(email) {
  return apiPost("/check-email", { email });
}

export function sendForgotPasswordLink(email) {
  return apiPost("/forgot-password", { email });
}

export function resetUserPassword(data) {
  return apiPost("/reset-password", data);
}

export function requestAccountDeletion() {
  return apiPost("/account/delete-request", {});
}

export function fetchFeedbacks() {
  return apiGet("/feedback");
}

export function createFeedback(data) {
  return apiPost("/feedback", data);
}

export function advanceProgress(taskId) {
  return apiPost(`/tasks/${taskId}/progress`);
}

export function completeTask(taskId) {
  return apiPost(`/tasks/${taskId}/complete`);
}

export function fetchPaymentSummary() {
  return apiGet("/payments/summary");
}

export function initiatePayment(taskId) {
  return apiPost(`/payments/${taskId}/sslcommerz/initiate`);
}

// Export auth token management functions
export { getAuthToken, setAuthToken };
