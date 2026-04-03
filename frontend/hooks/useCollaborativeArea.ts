'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useSocketContext } from '@/context/SocketContext';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook that binds a form page to the shared SocketContext.
 * - Sets the formId so the socket joins the right room.
 * - Tracks mouse movement inside `canvasRef` and emits cursor:move events.
 * - Listens for form:patched events and calls loadForm when another user changes the form.
 * - Returns remoteCursors, presenceList, socketId, and emit for the page to use.
 *
 * Because the socket lives in SocketContext (not per-page), navigating between
 * Workshop → Theme → Logic → History → Vault no longer disconnects/reconnects
 * the socket, so cursors persist across tab switches.
 */
export function useCollaborativeArea(formId: string, loadForm?: () => void) {
  const { user } = useAuth();
  const { setFormId, emit, connected, socketId, remoteCursors, presenceList, socket } = useSocketContext();
  const canvasRef = useRef<HTMLDivElement>(null);
  const loadFormRef = useRef(loadForm);

  // Keep loadFormRef fresh without triggering re-subscribe
  useEffect(() => {
    loadFormRef.current = loadForm;
  }, [loadForm]);

  // Tell the SocketContext which formId we're looking at
  useEffect(() => {
    if (formId) {
      setFormId(formId);
    }
    // Don't clear formId on unmount — we want it to persist across tab navigation
    // It only gets cleared when navigating completely away (e.g. to dashboard)
  }, [formId, setFormId]);

  // Listen for form:patched to reload form data when collaborators make changes
  useEffect(() => {
    if (!socket || !connected || !user?._id) return;

    const handlePatched = (payload: any) => {
      if (payload?.actorId && payload.actorId === user._id) return;
      if (loadFormRef.current) loadFormRef.current();
    };

    socket.on('form:patched', handlePatched);
    return () => {
      socket.off('form:patched', handlePatched);
    };
  }, [socket, connected, user?._id]);

  // Mouse tracking + cursor emission
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !user || !connected) return;

    let lastEmit = 0;
    let rafId: number | null = null;
    let pendingEvent: MouseEvent | null = null;

    const emitCursor = () => {
      if (!pendingEvent) return;
      const now = Date.now();
      if (now - lastEmit < 33) {
        rafId = requestAnimationFrame(emitCursor);
        return;
      }
      lastEmit = now;
      emit('cursor:move', {
        x: pendingEvent.clientX,
        y: pendingEvent.clientY,
        color: (user as any).cursorColor || '#2563eb',
      });
      pendingEvent = null;
      rafId = null;
    };

    const handleMouseMove = (e: MouseEvent) => {
      pendingEvent = e;
      if (!rafId) {
        rafId = requestAnimationFrame(emitCursor);
      }
    };

    // Handle visibility change — stop emitting when tab is hidden,
    // and re-emit position when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // The tab is hidden — cancel pending emissions
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        pendingEvent = null;
      }
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [emit, user, connected]);

  return {
    canvasRef,
    remoteCursors,
    presenceList,
    socketId,
    connected,
    emit,
  };
}
