import { describe, expect, it } from 'vitest';
import { adjustPlan, applySidePlan, diffEntries, type SidePlan } from '@/lib/deck/side-plan';

const entries = [
  { cardId: 'starter', quantity: 3, section: 'MAIN' as const },
  { cardId: 'garnet', quantity: 2, section: 'MAIN' as const },
  { cardId: 'em', quantity: 2, section: 'SIDE' as const },
  { cardId: 'ash', quantity: 3, section: 'SIDE' as const },
];
const plan = (p: Partial<SidePlan>): SidePlan => ({
  id: 'p',
  matchup: 'Ryzeal',
  going: 'second',
  in: {},
  out: {},
  ...p,
});

describe('applySidePlan', () => {
  it('tauscht Karten zwischen Main und Side Deck', () => {
    const { main, issues } = applySidePlan(entries, plan({ in: { em: 2 }, out: { garnet: 2 } }));
    expect(Object.fromEntries(main)).toEqual({ starter: 3, em: 2 });
    expect(issues).toEqual([]);
  });

  it('meldet ungleich viele Karten und Karten, die nicht da sind', () => {
    const { main, issues } = applySidePlan(entries, plan({ in: { em: 3 }, out: { starter: 1 } }));
    // Nur die zwei Kopien aus dem Side Deck kommen rein
    expect(main.get('em')).toBe(2);
    expect(issues).toEqual([
      { kind: 'unbalanced', in: 3, out: 1 },
      { kind: 'notInSide', cardId: 'em' },
    ]);
  });
});

describe('adjustPlan', () => {
  it('begrenzt die Anzahl und entfernt Karten bei 0', () => {
    const p = adjustPlan(plan({}), 'in', 'ash', 5, 3);
    expect(p.in).toEqual({ ash: 3 });
    expect(adjustPlan(p, 'in', 'ash', -3, 3).in).toEqual({});
  });
});

describe('diffEntries', () => {
  it('listet Zu- und Abgänge je Bereich', () => {
    const after = [
      { cardId: 'starter', quantity: 3, section: 'MAIN' as const },
      { cardId: 'garnet', quantity: 1, section: 'MAIN' as const },
      { cardId: 'em', quantity: 3, section: 'SIDE' as const },
    ];
    expect(diffEntries(entries, after)).toEqual([
      { cardId: 'em', section: 'SIDE', delta: 1 },
      { cardId: 'garnet', section: 'MAIN', delta: -1 },
      { cardId: 'ash', section: 'SIDE', delta: -3 },
    ]);
  });
});
