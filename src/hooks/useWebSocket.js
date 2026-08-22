import { useEffect, useRef, useState, useCallback } from "react";
import { buildWsUrl } from "../services/api";

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

// Frame types that signal the response is complete — only these clear isTyping
const TERMINAL_TYPES = new Set(["final", "error"]);

export function useWebSocket(sessionId) {
  const wsRef = useRef(null);
  const [status, setStatus] = useState("disconnected");
  const [isTyping, setIsTyping] = useState(false);
  const onMessageRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);
  const activeRef = useRef(true);

  const clearReconnectTimer = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  const connect = useCallback(() => {
    if (!sessionId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    setStatus("connecting");

    const ws = new WebSocket(buildWsUrl(sessionId));

    ws.onopen = () => {
      if (!activeRef.current) { ws.close(); return; }
      reconnectAttempts.current = 0;
      setStatus("connected");
    };

    ws.onmessage = (e) => {
      let payload;
      try {
        payload = JSON.parse(e.data);
      } catch {
        payload = { type: "final", text: e.data };
      }

      // ── Typing bubble logic ────────────────────────────────────────────────
      // ping  → do nothing (server keepalive, invisible to user)
      // step  → keep isTyping=true (still processing)
      // final → clear isTyping (response is ready and will be rendered)
      // error → clear isTyping (server gave up, error message follows)
      if (TERMINAL_TYPES.has(payload.type)) {
        setIsTyping(false);
      }
      // ping and step intentionally leave isTyping unchanged

      // Skip ping frames entirely — don't forward to message handler
      if (payload.type === "ping") return;

      onMessageRef.current?.(payload);
    };

    ws.onerror = () => {
      setIsTyping(false);
      setStatus("error");
    };

    ws.onclose = () => {
      setIsTyping(false);
      if (!activeRef.current) return;

      setStatus("disconnected");

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current += 1;
        const delay = RECONNECT_DELAY_MS * reconnectAttempts.current;
        reconnectTimer.current = setTimeout(() => {
          if (activeRef.current) connect();
        }, delay);
      }
    };

    wsRef.current = ws;
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setIsTyping(true);
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  const setOnMessage = useCallback((fn) => {
    onMessageRef.current = fn;
  }, []);

  useEffect(() => {
    activeRef.current = true;
    reconnectAttempts.current = 0;

    if (sessionId) connect();

    return () => {
      activeRef.current = false;
      clearReconnectTimer();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sessionId, connect]);

  return { status, isTyping, sendMessage, setOnMessage };
}