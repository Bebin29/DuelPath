import { describe, expect, it } from 'vitest';
import { headlineWords, stopsLine, stressWords } from '@/lib/combo/start-words';
import { STAPLES as ALL } from '@/lib/combo/reactions';

const STAPLES = ['Ash', 'Imperm', 'Nibiru', 'Veiler', 'Droll', 'Crow'];

describe('stressWords', () => {
  it('ordnet Treffer nach dem frühesten Schritt und hängt eine Lücke an', () => {
    const words = stressWords(STAPLES, [
      { word: 'Imperm', step: 2 },
      { word: 'Ash', step: 3 },
      { word: 'Ash', step: 2 },
      { word: 'Veiler', step: 1 },
      { word: 'Droll', step: 4 },
    ]);
    expect(words).toEqual([
      { word: 'Veiler', step: 1 },
      { word: 'Ash', step: 2 },
      { word: 'Imperm', step: 2 },
      { word: 'Nibiru', step: null },
    ]);
  });

  it('zeigt nur Lücken, wenn nichts trifft', () => {
    expect(stressWords(STAPLES, [], 2)).toEqual([
      { word: 'Ash', step: null },
      { word: 'Imperm', step: null },
    ]);
  });

  it('füllt mit Treffern auf, wenn alles trifft', () => {
    const all = STAPLES.map((word, i) => ({ word, step: i + 1 }));
    expect(stressWords(STAPLES, all).map((w) => w.step)).toEqual([1, 2, 3, 4]);
  });

  it('übergeht Treffer ohne Schrittnummer', () => {
    expect(stressWords(['Ash'], [{ word: 'Ash' }])).toEqual([{ word: 'Ash', step: null }]);
  });
});

describe('stopsLine', () => {
  const short = (name: string) => ALL.find((s) => s.short === name)!;

  it('nimmt Unterbrechungen, aber keine Mulcharmys und keine ungerechneten Staples', () => {
    expect(stopsLine(short('Ash'))).toBe(true);
    expect(stopsLine(short('Nibiru'))).toBe(true);
    expect(stopsLine(short('Fuwalos'))).toBe(false);
    expect(stopsLine(short('Purulia'))).toBe(false);
    expect(stopsLine(short('Shifter'))).toBe(false);
  });
});

describe('headlineWords', () => {
  const staple = (name: string) => ALL.find((s) => s.short === name)!;
  const step = { kind: 'ACTION' as const, player: 'self' as const };
  const staples = ['Ash', 'Nibiru', 'Fuwalos'].map(staple);

  it('sagt nichts ohne Schritte oder bei einer Unterbrechung in der Hauptline', () => {
    const hits = [{ short: 'Ash', pattern: 'FROM_DECK' as const, step: 1 }];
    expect(headlineWords([], staples, hits)).toEqual([]);
    expect(headlineWords([step, { kind: 'ACTIVATE', player: 'opponent' }], staples, hits)).toEqual(
      []
    );
  });

  it('lässt Mulcharmy draußen, als Treffer wie als Lücke', () => {
    const words = headlineWords([step], staples, [
      { short: 'Fuwalos', pattern: 'TURN_START_DECK_SUMMONS', step: 1 },
      { short: 'Ash', pattern: 'FROM_DECK', step: 2 },
    ]);
    expect(words).toEqual([
      { word: 'Ash', step: 2 },
      { word: 'Nibiru', step: null },
    ]);
  });
});
