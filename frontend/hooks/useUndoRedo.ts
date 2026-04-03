import { useState, useCallback } from 'react';

export function useUndoRedo<T>(initial: T) {
  const [state, setState] = useState<T>(initial);
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);

  const set = useCallback((newState: T | ((s: T) => T)) => {
    setState((prev) => {
      const next = typeof newState === 'function' ? (newState as (s: T) => T)(prev) : newState;
      setPast((p) => [...p, prev]);
      setFuture([]);
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (!p.length) return p;
      const newPast = [...p];
      const prev = newPast.pop()!;
      setState((cur) => { setFuture((f) => [cur, ...f]); return prev; });
      return newPast;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const newFuture = [...f];
      const next = newFuture.shift()!;
      setState((cur) => { setPast((p) => [...p, cur]); return next; });
      return newFuture;
    });
  }, []);

  return { state, set, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}
