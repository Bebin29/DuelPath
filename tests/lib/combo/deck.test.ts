// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { drawFromDeck, startStateFromDeck } from '@/lib/combo/deck';
import type { StartState } from '@/lib/combo/state';

const count = (s: StartState, cardId: string, zone: string) =>
  s.cards.filter((c) => c.cardId === cardId && c.zone === zone && c.owner === 'self').length;

describe('startStateFromDeck', () => {
  it('legt je Kopie eine Instanz an und zieht Handkarten ab', () => {
    const start: StartState = {
      cards: [
        { instanceId: 'h1', cardId: 'ash', owner: 'self', zone: 'HAND' },
        { instanceId: 'old', cardId: 'ash', owner: 'self', zone: 'DECK' },
        { instanceId: 'opp', cardId: 'ash', owner: 'opponent', zone: 'HAND' },
      ],
    };
    const result = startStateFromDeck(start, [
      { cardId: 'ash', quantity: 3, section: 'MAIN' },
      { cardId: 'accesscode', quantity: 1, section: 'EXTRA' },
    ]);

    expect(count(result, 'ash', 'HAND')).toBe(1);
    // 3 Kopien im Deck, eine davon schon auf der Hand; die alte Deck-Instanz wird ersetzt
    expect(count(result, 'ash', 'DECK')).toBe(2);
    expect(count(result, 'accesscode', 'EXTRA')).toBe(1);
    expect(result.cards.find((c) => c.instanceId === 'opp')).toBeTruthy();
    expect(result.cards.find((c) => c.instanceId === 'old')).toBeUndefined();
  });
});

describe('drawFromDeck', () => {
  it('verschiebt genau eine Kopie auf die Hand', () => {
    const start = startStateFromDeck({ cards: [] }, [
      { cardId: 'ash', quantity: 3, section: 'MAIN' },
    ]);
    const drawn = drawFromDeck(start, 'ash');
    expect(count(drawn, 'ash', 'HAND')).toBe(1);
    expect(count(drawn, 'ash', 'DECK')).toBe(2);
    expect(drawFromDeck(drawn, 'missing')).toBe(drawn);
  });
});
