const BASE = import.meta.env.VITE_API_URL;
const WS_BASE = import.meta.env.VITE_WS_URL;

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }

  return res.json();
}

export const apiLogin = (email, password) =>
  request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const apiSignup = (username, email, password) =>
  request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });

export const apiStartSession = (token) =>
  request("/chat/start", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

export const apiEndSession = (sessionId, token) =>
  request(`/chat/end?session_id=${sessionId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

// Takes only token — no user_id parameter
export const apiGetSessions = (token) =>
  request("/chat/sessions", {
    headers: { Authorization: `Bearer ${token}` },
  });

export const apiGetSessionMessages = (sessionId, token) =>
  request(`/chat/session/${sessionId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const buildWsUrl = (sessionId) =>
  `${WS_BASE}/chat/ws/${sessionId}`;