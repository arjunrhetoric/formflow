'use client';
import { useEffect, useState, useRef } from 'react';
import { useSocket } from './useSocket';
import { useAuth } from '@/context/AuthContext';

export function useCollaborativeArea(formId: string, loadForm?: () => void) {
  const { user } = useAuth();
  const { emit, on, connected, socketId } = useSocket(formId);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [remoteCursors, setRemoteCursors] = useState<Record<string, any>>({});
  const [presenceList, setPresenceList] = useState<any[]>([]);

  useEffect(() => {
    if (!user?._id || !connected) return;

    const offPatched = on('form:patched', (payload: any) => {
      if (payload?.actorId && payload.actorId === user._id) return;
      if (loadForm) loadForm();
    });

    const offJoined = on('presence:joined', (data: any) => {
      setPresenceList((prev) => {
        if (prev.some((u) => u.userId === data.userId)) return prev;
        return [...prev, data];
      });
    });

    const offLeft = on('presence:left', (data: any) => {
      setPresenceList((prev) => prev.filter((u) => u.userId !== data.userId));
      setRemoteCursors((prev) => {
        const next = { ...prev };
        if (data.clientId) {
          delete next[data.clientId];
        } else {
          Object.keys(next).forEach((key) => {
            if (next[key].userId === data.userId) delete next[key];
          });
        }
        return next;
      });
    });

    const offSnapshot = on('presence:snapshot', (data: any) => {
      if (data.presence) {
        const unique = Array.from(new Map(data.presence.map((u: any) => [u.userId, u])).values());
        setPresenceList(unique);
      }
    });

    const offCursor = on('cursor:moved', (data: any) => {
      if (!data.clientId) return;
      setRemoteCursors((prev) => ({ ...prev, [data.clientId]: data }));
    });

    return () => { offPatched(); offJoined(); offLeft(); offSnapshot(); offCursor(); };
  }, [on, connected, loadForm, user?._id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !user || !connected) return;

    let lastEmit = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastEmit < 33) return;
      lastEmit = now;
      emit('cursor:move', {
        x: e.clientX,
        y: e.clientY,
        color: (user as any).cursorColor || '#2563eb',
      });
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    return () => canvas.removeEventListener('mousemove', handleMouseMove);
  }, [emit, user, connected]);

  return {
    canvasRef,
    remoteCursors,
    presenceList,
    socketId,
    connected,
    emit
  };
}
