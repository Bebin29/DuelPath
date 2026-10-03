'use client';

import { useCallback, useEffect, useReducer, useState } from 'react';

/**
 * Stoppuhr für den Übungsmodus (UX-Plan 6.10): läuft, während jemand die Line selbst durchgeht,
 * und hält an, sobald die App das Tempo vorgibt oder die Line zu Ende ist.
 * Gerechnet wird aus Zeitstempeln, nicht aus gezählten Ticks: ein verschlafener Timer im
 * Hintergrundtab verliert dann keine Zeit.
 */

export interface StopwatchState {
  /** Summe der abgeschlossenen Abschnitte */
  elapsed: number;
  /** Beginn des laufenden Abschnitts; null, wenn die Uhr steht */
  since: number | null;
}

export const STOPPED: StopwatchState = { elapsed: 0, since: null };

export type StopwatchAction =
  { type: 'start'; now: number } | { type: 'pause'; now: number } | { type: 'reset' };

export function stopwatchReducer(s: StopwatchState, action: StopwatchAction): StopwatchState {
  switch (action.type) {
    case 'start':
      return s.since === null ? { ...s, since: action.now } : s;
    case 'pause':
      return s.since === null ? s : { elapsed: elapsedAt(s, action.now), since: null };
    case 'reset':
      return s.elapsed === 0 && s.since === null ? s : STOPPED;
  }
}

/** Gelaufene Zeit zu diesem Zeitpunkt; eine rückwärts gestellte Uhr zählt nicht ab */
export function elapsedAt(s: StopwatchState, now: number): number {
  return s.elapsed + (s.since === null ? 0 : Math.max(0, now - s.since));
}

/** Nachgesehen wird viermal pro Sekunde, damit die Anzeige den Sekundenwechsel nicht verpasst */
const TICK_MS = 250;
const seconds = (ms: number) => Math.floor(ms / 1000);

export function useStopwatch() {
  const [state, dispatch] = useReducer(stopwatchReducer, STOPPED);
  const [now, setNow] = useState(() => Date.now());

  // Neu gerendert wird nur beim Sekundenwechsel: die Anzeige zeigt ohnehin nur ganze Sekunden
  useEffect(() => {
    if (state.since === null) return;
    const timer = setInterval(() => {
      const next = Date.now();
      setNow((prev) =>
        seconds(elapsedAt(state, prev)) === seconds(elapsedAt(state, next)) ? prev : next
      );
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [state]);

  const start = useCallback(() => dispatch({ type: 'start', now: Date.now() }), []);
  const pause = useCallback(() => dispatch({ type: 'pause', now: Date.now() }), []);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);
  /** Läuft die Uhr oder nicht: ein Aufruf für den Knopf und für den Verlauf der Line */
  const setRunning = useCallback(
    (run: boolean) =>
      dispatch(run ? { type: 'start', now: Date.now() } : { type: 'pause', now: Date.now() }),
    []
  );

  return {
    ms: elapsedAt(state, now),
    running: state.since !== null,
    start,
    pause,
    reset,
    setRunning,
  };
}
