import { useState } from "react";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 86400) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function Sidebar({ open, sessions, onSelectSession, onNewChat, user, onLogout }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (sid) => {
    setSelected(sid);
    onSelectSession(sid);
  };

  if (!open) return null;

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <div style={{
            width: 22, height: 22,
            background: "var(--accent-dim)",
            border: "1px solid var(--border-accent)",
            borderRadius: 7,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="4" stroke="var(--accent)" strokeWidth="1.2"/>
              <circle cx="6" cy="6" r="1.5" fill="var(--accent)"/>
            </svg>
          </div>
          <span style={{ fontWeight: 500, fontSize: 13, letterSpacing: "-0.01em" }}>AnalyticsGPT</span>
        </div>

        <button className="new-chat-btn" onClick={onNewChat} title="New chat">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 2v7M2 5.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          New
        </button>
      </div>

      <div className="sidebar-section-label">Recent sessions</div>

      <div className="session-list">
        {sessions.length === 0 && (
          <div className="sessions-empty">No past sessions yet</div>
        )}
        {sessions.map((s, i) => {
          // Backend returns: session_id, title, tokens_consumed, created_at, session_start, session_end
          const displayTitle = s.title
            ? s.title.slice(0, 28) + (s.title.length > 28 ? "…" : "")
            : s.session_id.slice(0, 6).toUpperCase() + "…";

          const tokens = s.tokens_consumed ?? s.tokens ?? 0;
          // Prefer session_start for time display; fall back to created_at
          const dateStr = s.session_start || s.created_at || s.start;

          return (
            <button
              key={s.session_id}
              className={`session-item ${selected === s.session_id ? "active" : ""}`}
              onClick={() => handleSelect(s.session_id)}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="session-icon">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path
                    d="M1.5 2.5h10a.5.5 0 01.5.5v6a.5.5 0 01-.5.5H4l-2.5 2V3a.5.5 0 01.5-.5z"
                    stroke="currentColor"
                    strokeWidth="1.1"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="session-info">
                <span className="session-id">{displayTitle}</span>
                <span className="session-meta">
                  {tokens > 0 ? `${tokens.toLocaleString()} tok · ` : ""}
                  {formatDate(dateStr)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <div className="user-row">
          <div className="user-avatar">
            {user?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="user-info">
            <span className="user-name">{user?.username || "User"}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <button className="logout-btn" onClick={onLogout} title="Sign out">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9 10l3-3-3-3M12 7H5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}