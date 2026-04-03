'use client';
import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

interface CursorData {
  userId: string;
  clientId: string;
  name: string;
  x: number;
  y: number;
  color: string;
  lastUpdate?: number;
}

interface PresenceUser {
  userId: string;
  name: string;
  color: string;
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  socketId: string | undefined;
  formId: string | null;
  setFormId: (id: string | null) => void;
  emit: (event: string, data: unknown) => void;
  remoteCursors: Record<string, CursorData>;
  presenceList: PresenceUser[];
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  socketId: undefined,
  formId: null,
  setFormId: () => {},
  emit: () => {},
  remoteCursors: {},
  presenceList: [],
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | undefined>(undefined);
  const [formId, setFormIdState] = useState<string | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, CursorData>>({});
  const [presenceList, setPresenceList] = useState<PresenceUser[]>([]);
  const activeFormIdRef = useRef<string | null>(null);

  // Stable setFormId that avoids unnecessary state updates
  const setFormId = useCallback((id: string | null) => {
    setFormIdState((prev) => (prev === id ? prev : id));
  }, []);

  // Stale cursor cleanup: every 5 seconds, remove cursors older than 6s
  useEffect(() => {
    const interval = setInterval(() => {
      setRemoteCursors((prev) => {
        const now = Date.now();
        const next: Record<string, CursorData> = {};
        let changed = false;
        for (const [key, cursor] of Object.entries(prev)) {
          if (cursor.lastUpdate && now - cursor.lastUpdate > 6000) {
            changed = true; // skip stale cursor
          } else {
            next[key] = cursor;
          }
        }
        return changed ? next : prev;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Create / destroy the socket when formId changes
  useEffect(() => {
    if (!formId) {
      // Clean up if formId becomes null (e.g. navigating away from builder)
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
        setSocketId(undefined);
        setRemoteCursors({});
        setPresenceList([]);
        activeFormIdRef.current = null;
      }
      return;
    }

    // If socket exists and is connected to the same form, no action needed
    if (socketRef.current && activeFormIdRef.current === formId) {
      return;
    }

    // If there's an old socket for a different form, disconnect it
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    // Reset state for new room
    activeFormIdRef.current = formId;
    setRemoteCursors({});
    setPresenceList([]);

    const token = typeof window !== 'undefined' ? localStorage.getItem('formflow_token') : null;
    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[socket-ctx] connected, id:', socket.id);
      setConnected(true);
      setSocketId(socket.id);
      // Join the form room
      socket.emit('form:join', { formId: activeFormIdRef.current });
    });

    socket.on('disconnect', (reason) => {
      console.log('[socket-ctx] disconnected:', reason);
      setConnected(false);
    });

    socket.io.on('reconnect', () => {
      console.log('[socket-ctx] reconnected');
      // Re-join on reconnect
      socket.emit('form:join', { formId: activeFormIdRef.current });
    });

    // ── Presence events ──
    socket.on('presence:joined', (data: any) => {
      setPresenceList((prev) => {
        if (prev.some((u) => u.userId === data.userId)) return prev;
        return [...prev, data];
      });
    });

    socket.on('presence:left', (data: any) => {
      setPresenceList((prev) => prev.filter((u) => u.userId !== data.userId));
      setRemoteCursors((prev) => {
        const next = { ...prev };
        let changed = false;
        if (data.clientId && next[data.clientId]) {
          delete next[data.clientId];
          changed = true;
        } else {
          Object.keys(next).forEach((key) => {
            if (next[key].userId === data.userId) {
              delete next[key];
              changed = true;
            }
          });
        }
        return changed ? next : prev;
      });
    });

    socket.on('presence:snapshot', (data: any) => {
      if (data.presence) {
        const unique = Array.from(
          new Map(data.presence.map((u: any) => [u.userId, u])).values()
        ) as PresenceUser[];
        setPresenceList(unique);
      }
    });

    // ── Cursor events ──
    socket.on('cursor:moved', (data: any) => {
      if (!data.clientId) return;
      setRemoteCursors((prev) => ({
        ...prev,
        [data.clientId]: { ...data, lastUpdate: Date.now() },
      }));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      activeFormIdRef.current = null;
      setConnected(false);
      setSocketId(undefined);
      setRemoteCursors({});
      setPresenceList([]);
    };
  }, [formId]);

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        connected,
        socketId,
        formId,
        setFormId,
        emit,
        remoteCursors,
        presenceList,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocketContext = () => useContext(SocketContext);
