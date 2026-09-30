import { describe, expect, it } from 'vitest';
import {
  containsHand,
  coverage,
  drawHand,
  expandDeck,
  handRoles,
  matchingCombos,
  seededRandom,
  suggestTitle,
} from '@/lib/deck/hand-tester';
import { missingFromDeck } from '@/lib/deck/deck-check';

const seeded = seededRandom;

describe('Hand-Tester', () => {
  const pool = expandDeck([
    { cardId: 'ALU', quantity: 3 },
    { cardId: 'ASH', quantity: 3 },
    { cardId: 'X', quantity: 34 },
  ]);

  it('zieht ohne Zurücklegen', () => {
    expect(pool).toHaveLength(40);
    const hand = drawHand(pool, 5, seeded(1));
    expect(hand).toHaveLength(5);
    expect(drawHand(['A', 'B'], 5)).toHaveLength(2);
  });

  it('zählt Kopien beim Vergleich der Starthand', () => {
    expect(containsHand(['ALU', 'X', 'ASH'], ['ALU', 'ASH'])).toBe(true);
    expect(containsHand(['ALU', 'X'], ['ALU', 'ALU'])).toBe(false);
    expect(containsHand(['ALU'], [])).toBe(false);
    const combos = [
      { id: 'one', startHand: ['ALU'] },
      { id: 'two', startHand: ['ALU', 'ALU'] },
    ];
    expect(matchingCombos(['ALU', 'X'], combos).map((c) => c.id)).toEqual(['one']);
  });

  it('schätzt die Abdeckung nahe am erwarteten Wert', () => {
    // Mindestens ein Aluber in 5 aus 40 mit 3 Kopien: 1 - C(37,5)/C(40,5) ≈ 33,8 %
    const rate = coverage(pool, [{ id: 'one', startHand: ['ALU'] }], 5, 4000, seeded(7));
    expect(rate).toBeGreaterThan(0.31);
    expect(rate).toBeLessThan(0.37);
    expect(coverage(pool, [], 5)).toBe(0);
    // Gleicher Startwert, gleiche Zahl
    const again = coverage(pool, [{ id: 'one', startHand: ['ALU'] }], 5, 4000, seeded(7));
    expect(again).toBe(rate);
  });

  it('markiert Starter, Handtraps und Extender', () => {
    expect(
      handRoles(['ALU', 'ASH', 'X'], [{ id: 'one', startHand: ['ALU'] }], new Set(['ASH']))
    ).toEqual(['starter', 'handtrap', 'extender']);
  });

  it('schlägt einen Titel vor', () => {
    expect(suggestTitle(['Aluber the Jester of Despia', 'Ash'])).toBe('Aluber 2-Card');
    expect(suggestTitle(['Ash Blossom & Joyous Spring'])).toBe('Ash Blossom 1-Card');
  });
});

describe('Deck-Abgleich', () => {
  it('meldet fehlende und zu wenige Kopien', () => {
    const deck = new Map([
      ['ALU', 1],
      ['BF', 1],
    ]);
    expect(
      missingFromDeck({ startHand: ['ALU', 'ALU'], cardIds: ['ALU', 'BF', 'GONE'] }, deck)
    ).toEqual([
      { cardId: 'ALU', need: 2, have: 1 },
      { cardId: 'GONE', need: 1, have: 0 },
    ]);
  });
});
