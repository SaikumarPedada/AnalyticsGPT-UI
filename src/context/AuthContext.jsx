import { createContext, useContext, useState, useCallback } from "react";
import { apiLogin, apiSignup, apiStartSession, apiEndSession } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("analytics_pilot_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Restore session from localStorage on page refresh
  const [sessionId, setSessionId] = useState(
    () => localStorage.getItem("analytics_pilot_session") || null
  );

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const data = await apiLogin(email, password);
    const userData = { id: data.user_id, email, username: data.username };

    setUser(userData);
    localStorage.setItem("analytics_pilot_user", JSON.stringify(userData));
    localStorage.setItem("analytics_pilot_token", data.access_token);

    // Always start a fresh session on login
    const sess = await apiStartSession(data.access_token);
    setSessionId(sess.session_id);
    localStorage.setItem("analytics_pilot_session", sess.session_id);

    return userData;
  }, []);

  // ── Signup ─────────────────────────────────────────────────────────────────
  const signup = useCallback(async (username, email, password) => {
    return apiSignup(username, email, password);
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const token = localStorage.getItem("analytics_pilot_token");
    const sid = localStorage.getItem("analytics_pilot_session");

    if (sid && token) {
      try { await apiEndSession(sid, token); } catch { /* best-effort */ }
    }

    setUser(null);
    setSessionId(null);
    localStorage.removeItem("analytics_pilot_user");
    localStorage.removeItem("analytics_pilot_session");
    localStorage.removeItem("analytics_pilot_token");
  }, []);

  // ── New session (new chat) ─────────────────────────────────────────────────
  const newSession = useCallback(async () => {
    const token = localStorage.getItem("analytics_pilot_token");
    if (!token) return null;

    // End the current session gracefully
    const currentSid = localStorage.getItem("analytics_pilot_session");
    if (currentSid) {
      try { await apiEndSession(currentSid, token); } catch { /* best-effort */ }
    }

    const sess = await apiStartSession(token);
    setSessionId(sess.session_id);
    localStorage.setItem("analytics_pilot_session", sess.session_id);
    return sess.session_id;
  }, []);

  return (
    <AuthContext.Provider value={{ user, sessionId, login, signup, logout, newSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);