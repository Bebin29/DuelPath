import { describe, expect, it } from 'vitest';
import { initialState, type CardData, type ComboNodeData } from '@/lib/combo/state';
import { endboardSummary, interruptionsOf, lineEnds, missingCards } from '@/lib/combo/endboard';

const eff = (text: string, patterns: string[] = []) => ({
  index: 0,
  text,
  activated: true,
  patterns: patterns as never[],
});
const ASH: CardData = {
  id: 'ASH',
  name: 'Ash',
  type: 'Tuner Monster',
  effects: [eff('You can discard this card; negate that effect.', ['QUICK', 'NEG_EFFECT_CHAINED'])],
};
const NEGATOR: CardData = {
  id: 'NEG',
  name: 'Negator',
  type: 'Fusion Monster',
  effects: [eff('(Quick Effect): You can negate the activation.', ['QUICK', 'NEG_ACTIVATION'])],
};
const TRAP: CardData = { id: 'TRAP', name: 'Trap', type: 'Trap Card', effects: [] };
const IMPERM: CardData = {
  id: 'IMP',
  name: 'Infinite Impermanence',
  type: 'Trap Card',
  effects: [
    eff('Target 1 face-up monster your opponent controls; negate its effects.', [
      'NEG_EFFECTS_LINGER',
    ]),
    {
      ...eff('If you control no cards, you can activate this card from your hand.'),
      index: 1,
      activated: false,
    },
  ],
};
const VANILLA: CardData = { id: 'VAN', name: 'Vanilla', type: 'Normal Monster', effects: [] };
const cards = new Map([ASH, NEGATOR, TRAP, VANILLA].map((c) => [c.id, c]));

const start = initialState({
  cards: [
    { instanceId: 'ash', cardId: 'ASH', owner: 'self', zone: 'HAND' },
    { instanceId: 'van', cardId: 'VAN', owner: 'self', zone: 'HAND' },
    { instanceId: 'neg', cardId: 'NEG', owner: 'self', zone: 'EXTRA' },
    { instanceId: 'trap', cardId: 'TRAP', owner: 'self', zone: 'DECK' },
  ],
});
const end = initialState({
  cards: [
    { instanceId: 'ash', cardId: 'ASH', owner: 'self', zone: 'HAND' },
    { instanceId: 'van', cardId: 'VAN', owner: 'self', zone: 'GY' },
    { instanceId: 'neg', cardId: 'NEG', owner: 'self', zone: 'MONSTER', slot: 5 },
    {
      instanceId: 'trap',
      cardId: 'TRAP',
      owner: 'self',
      zone: 'SPELL_TRAP',
      slot: 0,
      position: 'SET',
    },
  ],
});

describe('Endboard', () => {
  it('erkennt Handtrap, Negierer und gesetzte Falle', () => {
    expect(interruptionsOf(ASH, end.cards.ash)).toBe(1);
    expect(interruptionsOf(NEGATOR, end.cards.neg)).toBe(1);
    expect(interruptionsOf(TRAP, end.cards.trap)).toBe(1);
    expect(interruptionsOf(VANILLA, start.cards.van)).toBe(0);
    expect(interruptionsOf(IMPERM, { ...start.cards.van, cardId: 'IMP' })).toBe(1);
    expect(interruptionsOf(TRAP, { ...start.cards.van, cardId: 'TRAP' })).toBe(0);
  });

  it('zählt Unterbrechungen, Korrekturen und die gebrauchte Starthand', () => {
    const summary = endboardSummary(end, start, cards);
    expect(summary).toMatchObject({ interruptions: 3, startHandUsed: 1, normalSummonLeft: true });
    expect(endboardSummary(end, start, cards, { trap: 0, neg: 2 }).interruptions).toBe(3);
  });

  it('findet Line-Enden mit der Hauptline zuerst und fehlende Karten', () => {
    const n = (id: string, parentId: string | null, rank = 0): ComboNodeData => ({
      id,
      parentId,
      rank,
      kind: 'ACTION',
      player: 'self',
    });
    const nodes = [n('a', null), n('b', 'a'), n('c', 'a', 1), n('d', 'c')];
    expect(lineEnds(nodes).map((e) => [e.leaf.id, e.branches.map((b) => b.id)])).toEqual([
      ['b', []],
      ['d', ['c']],
    ]);
    expect(missingCards(end, start)).toEqual(['NEG', 'TRAP']);
  });
});
