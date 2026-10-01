import { describe, expect, it } from 'vitest';
import { historyReducer } from '@/lib/hooks/use-history';

const start = {
  past: [] as number[],
  present: 0,
  future: [] as number[],
  lastGroup: null as string | null,
};

describe('historyReducer', () => {
  it('geht zurück und wieder vor', () => {
    let h = historyReducer(start, { type: 'set', next: 1 });
    h = historyReducer(h, { type: 'set', next: 2 });
    h = historyReducer(h, { type: 'undo' });
    expect(h.present).toBe(1);
    h = historyReducer(h, { type: 'redo' });
    expect(h.present).toBe(2);
  });

  it('verwirft die Zukunft bei einer neuen Änderung', () => {
    let h = historyReducer(start, { type: 'set', next: 1 });
    h = historyReducer(h, { type: 'undo' });
    h = historyReducer(h, { type: 'set', next: 5 });
    expect(h.future).toEqual([]);
    expect(historyReducer(h, { type: 'redo' }).present).toBe(5);
  });

  it('fasst Änderungen derselben Gruppe zusammen', () => {
    let h = historyReducer(start, { type: 'set', next: 1, group: 'title' });
    h = historyReducer(h, { type: 'set', next: 2, group: 'title' });
    h = historyReducer(h, { type: 'set', next: 3, group: 'title' });
    expect(h.past).toEqual([0]);
    expect(historyReducer(h, { type: 'undo' }).present).toBe(0);
  });

  it('ändert nichts bei identischem Wert oder leerem Verlauf', () => {
    expect(historyReducer(start, { type: 'set', next: 0 })).toBe(start);
    expect(historyReducer(start, { type: 'undo' })).toBe(start);
  });
});
