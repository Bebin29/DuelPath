import { describe, expect, it } from 'vitest';
import { STOPPED, elapsedAt, stopwatchReducer } from '@/lib/hooks/use-stopwatch';

describe('stopwatchReducer', () => {
  it('zählt nur, während die Uhr läuft', () => {
    const running = stopwatchReducer(STOPPED, { type: 'start', now: 1_000 });
    expect(elapsedAt(running, 4_000)).toBe(3_000);
    const paused = stopwatchReducer(running, { type: 'pause', now: 4_000 });
    expect(elapsedAt(paused, 60_000)).toBe(3_000);
  });

  it('setzt die Pause fort, statt von vorn zu zählen', () => {
    let s = stopwatchReducer(STOPPED, { type: 'start', now: 0 });
    s = stopwatchReducer(s, { type: 'pause', now: 5_000 });
    s = stopwatchReducer(s, { type: 'start', now: 20_000 });
    expect(elapsedAt(s, 22_000)).toBe(7_000);
  });

  it('ignoriert doppeltes Starten und Anhalten', () => {
    const running = stopwatchReducer(STOPPED, { type: 'start', now: 1_000 });
    expect(stopwatchReducer(running, { type: 'start', now: 9_000 })).toBe(running);
    expect(stopwatchReducer(STOPPED, { type: 'pause', now: 9_000 })).toBe(STOPPED);
  });

  it('setzt zurück und bleibt im Leerlauf derselbe Zustand', () => {
    let s = stopwatchReducer(STOPPED, { type: 'start', now: 0 });
    s = stopwatchReducer(s, { type: 'reset' });
    expect(s).toEqual(STOPPED);
    expect(stopwatchReducer(STOPPED, { type: 'reset' })).toBe(STOPPED);
  });

  it('zählt bei einer rückwärts gestellten Uhr nicht ab', () => {
    const running = stopwatchReducer(STOPPED, { type: 'start', now: 10_000 });
    expect(elapsedAt(running, 9_000)).toBe(0);
  });
});
