import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useWebSocket } from "../hooks/useWebSocket";
import { apiGetSessions, apiGetSessionMessages, apiDeleteSession } from "../services/api";
import Sidebar from "../components/Sidebar";
import MessageList from "../components/MessageList";
import ChatInput from "../components/ChatInput";
import Header from "../components/Header";

let _msgId = 0;
const nextId = () => ++_msgId;

export default function ChatPage() {
  const { user, sessionId, logout, newSession } = useAuth();
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { status, isTyping, sendMessage, setOnMessage } = useWebSocket(sessionId);
  const bottomRef = useRef(null);
  const [model, setModel] = useState("openai/gpt-oss-120b");

  // ── WebSocket message handler ──────────────────────────────────────────────
  useEffect(() => {
    setOnMessage((payload) => {
      // Silently drop server-sent ping frames
      if (payload.type === "ping") return;

      // Guard: skip payloads with no visible text
      const text = payload.text ?? "";
      if (!text.trim()) return;

      if (payload.type === "step") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.isStep) {
            return [
              ...prev.slice(0, -1),
              { ...last, content: `⚙️ ${text}` },
            ];
          }
          return [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              content: `⚙️ ${text}`,
              isStep: true,
              ts: new Date(),
            },
          ];
        });
        return;
      }

      // final / error — remove trailing step bubble first
      setMessages((prev) => {
        const base = prev[prev.length - 1]?.isStep ? prev.slice(0, -1) : prev;
        return [
          ...base,
          {
            id: nextId(),
            role: payload.type === "error" ? "assistant" : "assistant",
            content: text,
            tokens: payload.tokens || 0,
            error: payload.type === "error",
            ts: new Date(),
          },
        ];
      });
    });
  }, [setOnMessage]);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Load a past session's messages ─────────────────────────────────────────
  const loadSession = useCallback(async (sid) => {
    const token = localStorage.getItem("analytics_pilot_token");
    if (!token) return;
    setLoadingHistory(true);
    try {
      const msgs = await apiGetSessionMessages(sid, token);
      setMessages(
        msgs.map((m) => ({
          id: nextId(),
          role: m.role,
          content: m.content,
          tokens: m.tokens || 0,
          ts: new Date(m.created_at || Date.now()),
        }))
      );
    } catch {
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // ── Fetch sidebar session list ─────────────────────────────────────────────
  const refreshSessions = useCallback(() => {
    const token = localStorage.getItem("analytics_pilot_token");
    if (!token) return;
    apiGetSessions(token).then(setSessions).catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    if (user) refreshSessions();
  }, [user, refreshSessions]);

  // ── Send a message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(
    (payload) => {
      const text = typeof payload === "string" ? payload : payload.message;
      if (!text?.trim()) return;

      // Optimistically add the user bubble
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "user",
          content: text,
          fileName: typeof payload === "object" ? payload.file_name : null,
          ts: new Date(),
        },
      ]);

      const wsPayload = typeof payload === "string"
        ? { message: payload, mode: "auto" }
        : payload;   // preserves mode, file_path, file_name as-is from ChatInput

      const sent = sendMessage(wsPayload);

      if (!sent) {
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: "assistant",
            content: "Connection lost. Please refresh or start a new chat.",
            error: true,
            ts: new Date(),
          },
        ]);
      }
    },
    [sendMessage]
  );

  // ── New chat ───────────────────────────────────────────────────────────────
  const handleNewChat = useCallback(async (force = false) => {
    if (messages.length === 0 && !force && status === "connected") return;
    setMessages([]);
    await newSession();
    refreshSessions();
  }, [messages, status, newSession, refreshSessions]);

  const handleDeleteSession = useCallback(async (sid) => {
    const token = localStorage.getItem("analytics_pilot_token");
    if (!token) return;
    try {
      await apiDeleteSession(sid, token);
      if (sid === sessionId) {
        setMessages([]);
        await newSession();
        refreshSessions();
      } else {
        refreshSessions();
      }
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  }, [sessionId, newSession, refreshSessions]);

  return (
    <div className="chat-layout">
      <Sidebar
        open={sidebarOpen}
        sessions={sessions}
        onSelectSession={loadSession}
        onNewChat={handleNewChat}
        user={user}
        onLogout={logout}
        onDeleteSession={handleDeleteSession}
      />

      <div className={`chat-main ${sidebarOpen ? "sidebar-open" : ""}`}>
        <Header
          status={status}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onNewChat={handleNewChat}
          model={model}
        />

        <div className="messages-area">
          {messages.length === 0 && !loadingHistory && (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                  <circle cx="22" cy="22" r="20" stroke="var(--border-accent)" strokeWidth="1" />
                  <circle cx="22" cy="22" r="12" stroke="var(--accent)" strokeWidth="1" opacity="0.4" />
                  <circle cx="22" cy="22" r="4" fill="var(--accent)" />
                </svg>
              </div>
              <h2>How can I help you today?</h2>
              <p>analytics · visualization · etl · insights</p>

            </div>
          )}

          {loadingHistory && (
            <div className="loading-history">
              <span className="spinner dark" />
              <span>Loading conversation…</span>
            </div>
          )}

          <MessageList messages={messages} isTyping={isTyping} />
          <div ref={bottomRef} />
        </div>

        <div className="input-area">
          <ChatInput
            onSend={handleSend}
            disabled={status !== "connected"}
            status={status}
            model={model}
            setModel={setModel}
          />
          <p className="disclaimer">
            AnalyticsGPT · Responses may be imperfect · ⌘↵ new line
          </p>
        </div>
      </div>
    </div>
  );
}