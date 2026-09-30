import { describe, expect, it } from 'vitest';
import type { CardData, ComboNodeData, StartState } from '@/lib/combo/state';
import { comboStats } from '@/lib/combo/summary';

const ASH: CardData = {
  id: 'ASH',
  name: 'Ash',
  type: 'Tuner Monster',
  effects: [
    { index: 0, text: 'You can discard this card; negate.', activated: true, patterns: ['QUICK'] },
  ],
};
const MON: CardData = { id: 'MON', name: 'Mon', type: 'Effect Monster', effects: [] };
const cards = new Map([ASH, MON].map((c) => [c.id, c]));
const start: StartState = {
  cards: [
    { instanceId: 'm', cardId: 'MON', owner: 'self', zone: 'HAND' },
    { instanceId: 'a', cardId: 'ASH', owner: 'self', zone: 'HAND' },
    { instanceId: 'x', cardId: 'MON', owner: 'opponent', zone: 'HAND' },
  ],
};
const node = (id: string, parentId: string | null, extra: Partial<ComboNodeData> = {}) =>
  ({ id, parentId, rank: 0, kind: 'ACTION', player: 'self', ...extra }) as ComboNodeData;

describe('comboStats', () => {
  it('zählt Lines, Schritte der Hauptline und Unterbrechungen am Ende', () => {
    const nodes = [
      node('ns', null, {
        action: 'NORMAL_SUMMON',
        cardId: 'MON',
        resolveMoves: [{ instanceId: 'm', cardId: 'MON', from: 'HAND', to: 'MONSTER', slot: 0 }],
      }),
      node('end', 'ns', { kind: 'END' }),
      node('alt', 'ns', { rank: 1, kind: 'OPPONENT', player: 'opponent' }),
    ];
    expect(comboStats(start, nodes, cards)).toEqual({
      startHand: ['MON', 'ASH'],
      lines: 2,
      branches: 1,
      steps: 2,
      endboard: 1,
      cardIds: ['MON', 'ASH'],
    });
  });

  it('kommt ohne Schritte aus', () => {
    expect(comboStats(start, [], cards)).toMatchObject({ lines: 0, steps: 0, endboard: null });
  });
});
