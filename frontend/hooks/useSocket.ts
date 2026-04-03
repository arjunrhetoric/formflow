'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function useSocket(formId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  // Bump this to force re-evaluation of `on` callers
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    if (!formId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('formflow_token') : null;
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[socket] connected, id:', socket.id);
      setConnected(true);
      setGeneration((g) => g + 1);
      // Auto-join the form room
      socket.emit('form:join', { formId });
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason);
      setConnected(false);
    });

    socket.on('reconnect', () => {
      console.log('[socket] reconnected');
      socket.emit('form:join', { formId });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [formId]);

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  // `on` returns the actual socket instance's .on/.off directly
  // Using `generation` in deps ensures callers re-run when socket reconnects
  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on(event, handler);
    return () => { s.off(event, handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation]);

  return { emit, on, socket: socketRef, connected, socketId: socketRef.current?.id };
}
