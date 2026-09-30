'use client';

import { useCallback, useState } from 'react';

/**
 * Verlauf für Rückgängig und Wiederholen (UX-Plan 4.8 und 16). Gilt für die geöffnete Sitzung.
 * Änderungen mit gleichem `group` direkt hintereinander (etwa Tippen im Titel) werden
 * zu einem Schritt zusammengefasst.
 */
interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
  lastGroup: string | null;
}

const LIMIT = 200;

export function historyReducer<T>(
  h: HistoryState<T>,
  action:
    | { type: 'set'; next: T | ((prev: T) => T); group?: string }
    | { type: 'undo' }
    | { type: 'redo' }
): HistoryState<T> {
  switch (action.type) {
    case 'set': {
      const next =
        typeof action.next === 'function'
          ? (action.next as (prev: T) => T)(h.present)
          : action.next;
      if (Object.is(next, h.present)) return h;
      const merge = action.group !== undefined && action.group === h.lastGroup;
      return {
        past: merge ? h.past : [...h.past, h.present].slice(-LIMIT),
        present: next,
        future: [],
        lastGroup: action.group ?? null,
      };
    }
    case 'undo': {
      const prev = h.past.at(-1);
      if (prev === undefined) return h;
      return {
        past: h.past.slice(0, -1),
        present: prev,
        future: [h.present, ...h.future],
        lastGroup: null,
      };
    }
    case 'redo': {
      const [next, ...rest] = h.future;
      if (next === undefined) return h;
      return { past: [...h.past, h.present], present: next, future: rest, lastGroup: null };
    }
  }
}

export function useHistory<T>(initial: T) {
  const [h, setH] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
    lastGroup: null,
  });

  const set = useCallback(
    (next: T | ((prev: T) => T), group?: string) =>
      setH((cur) => historyReducer(cur, { type: 'set', next, group })),
    []
  );
  const undo = useCallback(() => setH((cur) => historyReducer(cur, { type: 'undo' })), []);
  const redo = useCallback(() => setH((cur) => historyReducer(cur, { type: 'redo' })), []);

  return {
    state: h.present,
    set,
    undo,
    redo,
    canUndo: h.past.length > 0,
    canRedo: h.future.length > 0,
  };
}
