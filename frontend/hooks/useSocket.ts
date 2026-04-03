'use client';
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export function useSocket(formId: string | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!formId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('formflow_token') : null;
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    return () => { socket.disconnect(); };
  }, [formId]);

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => { socketRef.current?.off(event, handler); };
  }, []);

  return { emit, on, socket: socketRef };
}
