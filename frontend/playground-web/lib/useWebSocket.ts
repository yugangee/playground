"use client";

import { useEffect, useRef, useCallback, useState } from "react";

type WsMessage = {
  action: string;
  roomId: string;
  messageId?: string;
  text?: string;
  userName?: string;
  email?: string;
  timestamp?: string;
  messages?: any[];
};

type Options = {
  roomId: string;
  userName: string;
  email: string;
  onMessage: (msg: WsMessage) => void;
};

export function useWebSocket({ roomId, userName, email, onMessage }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const optionsRef = useRef({ roomId, userName, email, onMessage });
  optionsRef.current = { roomId, userName, email, onMessage };

  const connect = useCallback(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!wsUrl || !optionsRef.current.roomId) return;

    const params = new URLSearchParams({
      roomId: optionsRef.current.roomId,
      userName: optionsRef.current.userName,
      email: optionsRef.current.email,
    });
    const ws = new WebSocket(`${wsUrl}?${params}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      // 히스토리 요청
      ws.send(JSON.stringify({ action: "getHistory", roomId: optionsRef.current.roomId, limit: 50 }));
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        optionsRef.current.onMessage(data);
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [roomId]);

  const send = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: "sendMessage",
        roomId: optionsRef.current.roomId,
        text,
        userName: optionsRef.current.userName,
        email: optionsRef.current.email,
      }));
    }
  }, []);

  return { send, connected };
}
