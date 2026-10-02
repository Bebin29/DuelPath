import { describe, expect, it } from 'vitest';
import { atLeast, binom, coverageOdds } from '@/lib/deck/odds';
import { coverage, expandDeck, seededRandom } from '@/lib/deck/hand-tester';
import { roleOdds, suggestRoles, type RoleCard } from '@/lib/deck/roles';

describe('atLeast', () => {
  it('rechnet die hypergeometrische Verteilung wie von Hand', () => {
    // 1 − C(31,5)/C(40,5)
    expect(atLeast(40, 9, 5)).toBeCloseTo(1 - binom(31, 5) / binom(40, 5), 12);
    expect(atLeast(40, 9, 5)).toBeCloseTo(0.74178, 5);
    expect(atLeast(40, 3, 5)).toBeCloseTo(0.33755, 5);
    expect(atLeast(60, 3, 5)).toBeCloseTo(0.23334, 5);
  });
});

describe('coverageOdds', () => {
  const deck = new Map([
    ['A', 3],
    ['B', 2],
    ['C', 1],
    ['X', 34],
  ]);

  it('stimmt bei einer 1-Card-Combo mit der Formel überein', () => {
    const odds = coverageOdds(deck, [['B']], 5);
    expect(odds.base).toBeCloseTo(atLeast(40, 2, 5), 12);
    expect(odds.card.get('B')?.plus).toBeCloseTo(atLeast(41, 3, 5), 12);
    expect(odds.card.get('B')?.minus).toBeCloseTo(atLeast(39, 1, 5), 12);
    // Eine Karte mehr, die nichts startet, verdünnt
    expect(odds.rest.plus).toBeCloseTo(atLeast(41, 2, 5), 12);
    // Bei drei Kopien gibt es keine vierte
    expect(coverageOdds(deck, [['A']], 5).card.get('A')?.plus).toBeUndefined();
  });

  it('stimmt mit der bisherigen Simulation überein', () => {
    const combos = [['A'], ['B', 'C'], ['B', 'B', 'X']];
    const exact = coverageOdds(deck, combos, 5).base;
    const pool = expandDeck([...deck].map(([cardId, quantity]) => ({ cardId, quantity })));
    const starters = combos.map((startHand, i) => ({ id: String(i), startHand }));
    const simulated = coverage(pool, starters, 5, 40000, seededRandom(7));
    expect(Math.abs(exact - simulated)).toBeLessThan(0.015);
  });

  it('übergeht Combos mit zu großer Starthand', () => {
    expect(coverageOdds(deck, [['A', 'B', 'C', 'X', 'X', 'X']], 5).base).toBe(0);
  });
});

describe('roleOdds', () => {
  const card = (role: RoleCard['role'], quantity: number, hardOpt = false): RoleCard => ({
    role,
    quantity,
    hardOpt,
  });

  it('teilt die Hände vollständig in Stufen auf', () => {
    const cards = [card('starter', 12), card('handtrap', 9), card('other', 19)];
    const { tiers, metrics } = roleOdds(cards, 5, 'first');
    expect(tiers.brick + tiers.playable + tiers.good + tiers.great).toBeCloseTo(1, 12);
    expect(metrics.find((m) => m.key === 'starter')?.value).toBeCloseTo(atLeast(40, 12, 5), 12);
    expect(metrics.find((m) => m.key === 'starterHandtrap')?.value).toBeCloseTo(0.61009, 5);
  });

  it('zählt zwei Kopien eines Starters mit hartem OPT nicht als Starter plus Extender', () => {
    // Nur 3× derselbe Starter: eine Hand mit zwei Kopien bleibt „spielbar“
    const opt = roleOdds([card('starter', 3, true), card('other', 37)], 5, 'first');
    const soft = roleOdds([card('starter', 3, false), card('other', 37)], 5, 'first');
    expect(opt.tiers.good).toBe(0);
    expect(soft.tiers.good).toBeCloseTo(1 - atLeast(40, 3, 5, 0) + atLeast(40, 3, 5, 2), 12);
  });

  it('wertet going second Breaker als Ersatz für einen Starter', () => {
    const { tiers } = roleOdds([card('breaker', 9), card('other', 31)], 6, 'second');
    expect(tiers.playable).toBeCloseTo(atLeast(40, 9, 6, 2), 12);
    expect(tiers.good + tiers.great).toBe(0);
  });
});

describe('suggestRoles', () => {
  it('schlägt Rollen aus Combos, Breakern und Staples vor und lässt gesetzte stehen', () => {
    const cards = [
      { id: 'peg', name: 'Crystal Beast Sapphire Pegasus' },
      { id: 'ext', name: 'Crystal Bond' },
      { id: 'em', name: 'Evenly Matched' },
      { id: 'ash', name: 'Ash Blossom & Joyous Spring' },
      { id: 'kai', name: 'Gameciel, the Sea Turtle Kaiju' },
      { id: 'set', name: 'Rainbow Dragon' },
    ];
    const roles = suggestRoles(cards, [['peg'], ['peg', 'ext']], new Set(['ash']), {
      set: 'garnet',
    });
    expect(roles).toEqual({
      peg: 'starter',
      ext: 'extender',
      em: 'breaker',
      ash: 'handtrap',
      kai: 'breaker',
    });
  });
});
