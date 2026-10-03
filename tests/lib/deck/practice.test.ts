import { describe, expect, it } from 'vitest';
import type { CardData, ComboNodeData, StartState } from '@/lib/combo/state';
import { expandDeck, seededRandom } from '@/lib/deck/hand-tester';
import {
  bestKnownEnd,
  bestTarget,
  formatDuration,
  matchingTargets,
  practiceHands,
  scoreHand,
  totals,
  type PracticeAttempt,
  type PracticeTarget,
} from '@/lib/deck/practice';

const target = (over: Partial<PracticeTarget> = {}): PracticeTarget => ({
  comboId: 'c1',
  title: 'Aluber 1-Card',
  startHand: ['ALU'],
  interruptions: 3,
  field: ['NEG', 'NEG', 'TRAP'],
  steps: 12,
  ...over,
});

describe('Übungsmodus', () => {
  const pool = expandDeck([
    { cardId: 'ALU', quantity: 3 },
    { cardId: 'ASH', quantity: 3 },
    { cardId: 'X', quantity: 34 },
  ]);

  it('zieht nur Hände, zu denen es eine gespeicherte Line gibt', () => {
    const hands = practiceHands(pool, [target()], 10, 5, seededRandom(3));
    expect(hands).toHaveLength(10);
    for (const { hand, targets } of hands) {
      expect(hand).toHaveLength(5);
      expect(hand).toContain('ALU');
      expect(targets.map((t) => t.comboId)).toEqual(['c1']);
    }
  });

  it('gibt ohne passende Line oder ohne Deck nichts zurück', () => {
    expect(practiceHands(pool, [], 10, 5, seededRandom(3))).toEqual([]);
    expect(practiceHands([], [target()], 10, 5, seededRandom(3))).toEqual([]);
    // Starthand größer als die gezogene Hand: damit lässt sich nicht üben
    const big = target({ startHand: ['ALU', 'ALU', 'ALU', 'ASH', 'ASH', 'X'] });
    expect(practiceHands(pool, [big], 10, 5, seededRandom(3))).toEqual([]);
  });

  it('zählt Kopien beim Suchen der passenden Lines', () => {
    const one = target({ comboId: 'one', startHand: ['ALU'] });
    const two = target({ comboId: 'two', startHand: ['ALU', 'ALU'] });
    const none = target({ comboId: 'none', startHand: [] });
    expect(matchingTargets(['ALU', 'X'], [one, two, none]).map((t) => t.comboId)).toEqual(['one']);
  });

  it('nimmt als Vorbild das stärkste Ende, bei Gleichstand die kürzere Line', () => {
    const weak = target({ comboId: 'weak', interruptions: 2 });
    const strong = target({ comboId: 'strong', interruptions: 4, steps: 20 });
    const short = target({ comboId: 'short', interruptions: 4, steps: 15 });
    expect(bestTarget([weak, strong, short])?.comboId).toBe('short');
    expect(bestTarget([])).toBeNull();
  });

  it('wertet das erreichte Endboard gegen das Vorbild', () => {
    const t = target();
    const short = scoreHand({ interruptions: 2, field: ['NEG', 'TRAP'] }, t);
    expect(short.verdict).toBe('short');
    expect(short.best).toBe(3);
    expect(short.missing).toEqual(['NEG']);

    const equal = scoreHand({ interruptions: 3, field: ['NEG', 'NEG', 'TRAP'] }, t);
    expect(equal.verdict).toBe('equal');
    expect(equal.missing).toEqual([]);

    // Mehr Unterbrechungen als bekannt, obwohl eine Karte des Vorbilds fehlt
    const ahead = scoreHand({ interruptions: 4, field: ['NEG', 'NEG', 'OTHER'] }, t);
    expect(ahead.verdict).toBe('ahead');
    expect(ahead.missing).toEqual(['TRAP']);
  });

  it('zählt den Lauf zusammen', () => {
    const attempt = (n: number, interruptions: number, ms: number): PracticeAttempt => {
      const t = target();
      return {
        number: n,
        hand: { hand: ['ALU'], targets: [t] },
        target: t,
        reached: { interruptions, field: [] },
        score: scoreHand({ interruptions, field: [] }, t),
        ms,
      };
    };
    const sum = totals([attempt(1, 1, 60_000), attempt(2, 3, 40_000), attempt(3, 5, 50_000)]);
    expect(sum).toEqual({ played: 3, short: 1, equal: 1, ahead: 1, ms: 150_000, perHand: 50_000 });
    expect(totals([])).toEqual({ played: 0, short: 0, equal: 0, ahead: 0, ms: 0, perHand: 0 });
  });

  it('nimmt als bestes bekanntes Ende die Hauptline, nicht den kurzen Branch', () => {
    const negator: CardData = {
      id: 'NEG',
      name: 'Negator',
      type: 'Fusion Monster',
      effects: [
        {
          index: 0,
          text: '(Quick Effect): You can negate the activation.',
          activated: true,
          patterns: ['QUICK', 'NEG_ACTIVATION'] as never[],
        },
      ],
    };
    const ash: CardData = {
      id: 'ASH',
      name: 'Ash',
      type: 'Tuner Monster',
      effects: [
        {
          index: 0,
          text: 'You can discard this card; negate that effect.',
          activated: true,
          patterns: ['QUICK', 'NEG_EFFECT_CHAINED'] as never[],
        },
      ],
    };
    const cards = new Map([negator, ash].map((c) => [c.id, c]));
    const startState: StartState = {
      cards: [
        { instanceId: 'ash', cardId: 'ASH', owner: 'self', zone: 'HAND' },
        { instanceId: 'neg1', cardId: 'NEG', owner: 'self', zone: 'EXTRA' },
        { instanceId: 'neg2', cardId: 'NEG', owner: 'self', zone: 'EXTRA' },
      ],
    };
    const summon = (instanceId: string, slot: number) => ({
      instanceId,
      from: 'EXTRA' as const,
      to: 'MONSTER' as const,
      slot,
      position: 'ATK' as const,
    });
    const node = (over: Partial<ComboNodeData> & { id: string }): ComboNodeData => ({
      parentId: null,
      rank: 0,
      kind: 'ACTION',
      player: 'self',
      ...over,
    });
    // Hauptline beschwört zwei Negierer; der Branch hört nach einem auf und kommt mit der
    // Handtrap auf der Hand auf dieselbe Zahl
    const nodes = [
      node({ id: 'a', resolveMoves: [summon('neg1', 0)] }),
      node({ id: 'b', parentId: 'a', resolveMoves: [summon('neg2', 1)] }),
      node({ id: 'c', parentId: 'a', rank: 1 }),
    ];
    expect(bestKnownEnd(startState, nodes, cards)).toEqual({
      interruptions: 3,
      field: ['NEG', 'NEG'],
      steps: 2,
    });
    expect(bestKnownEnd(startState, [], cards)).toBeNull();
  });

  it('schreibt die Zeit als Uhr', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(67_800)).toBe('1:07');
    expect(formatDuration(600_000)).toBe('10:00');
    expect(formatDuration(3_723_000)).toBe('1:02:03');
    expect(formatDuration(-5_000)).toBe('0:00');
  });
});
