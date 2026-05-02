import { useEffect, useRef, useState, useCallback } from "react";
import { buildWsUrl } from "../services/api";

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket(sessionId) {
  const wsRef = useRef(null);
  const [status, setStatus] = useState("disconnected");
  const [isTyping, setIsTyping] = useState(false);
  const onMessageRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);
  // Track whether the hook is still mounted / sessionId is still valid
  const activeRef = useRef(true);

  const clearReconnectTimer = () => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  };

  const connect = useCallback(() => {
    if (!sessionId) return;
    // Already open — nothing to do
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    // Already trying to connect
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

      // Clear typing indicator on any non-step message
      if (payload.type !== "step") {
        setIsTyping(false);
      }

      onMessageRef.current?.(payload);
    };

    ws.onerror = () => {
      setIsTyping(false);
      setStatus("error");
    };

    ws.onclose = () => {
      setIsTyping(false);
      if (!activeRef.current) return; // unmounted — don't reconnect

      setStatus("disconnected");

      // Auto-reconnect with back-off
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

  // Connect / reconnect when sessionId changes
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