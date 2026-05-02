export default function Header({ status, sidebarOpen, onToggleSidebar, onNewChat }) {
  const statusLabel = {
    connected: "Connected",
    connecting: "Connecting…",
    disconnected: "Disconnected",
    error: "Error",
  }[status] || "Unknown";

  const statusClass = {
    connected: "status-dot green",
    connecting: "status-dot amber",
    disconnected: "status-dot gray",
    error: "status-dot red",
  }[status] || "status-dot gray";

  return (
    <header className="chat-header">
      <div className="header-left">
        <button
          className="icon-btn"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
            <rect x="2" y="3.5" width="13" height="1.4" rx="0.7" fill="currentColor"/>
            <rect x="2" y="7.8" width="13" height="1.4" rx="0.7" fill="currentColor"/>
            <rect x="2" y="12.1" width="13" height="1.4" rx="0.7" fill="currentColor"/>
          </svg>
        </button>

        {!sidebarOpen && (
          <button className="icon-btn" onClick={onNewChat} title="New chat">
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
              <path d="M8.5 4v9M4 8.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        <div className="model-badge">
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="var(--accent)" strokeWidth="1.2" opacity="0.5"/>
              <circle cx="8" cy="8" r="2.5" fill="var(--accent)"/>
            </svg>
            <span className="model-name">AnalyticsGPT</span>
          </div>
          <span className="model-variant">7B Instruct</span>
        </div>
      </div>

      <div className="header-right">
        <div className="connection-status">
          <span className={statusClass} />
          <span className="status-text">{statusLabel}</span>
        </div>
      </div>
    </header>
  );
}