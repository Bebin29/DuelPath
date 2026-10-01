import { describe, expect, it } from 'vitest';
import type { ComboCard } from '@/lib/combo/cards';
import { initialState } from '@/lib/combo/state';
import { cardActions } from '@/lib/combo/card-actions';

const card = (id: string, type: string, effects: ComboCard['effects'] = []): ComboCard => ({
  id,
  name: id,
  nameDe: null,
  type,
  imageSmall: null,
  effects,
});
const hopt = { kind: 'HARD' as const, wording: 'use' as const, per: 'turn' as const, limit: 1 };
const ALUBER = card('ALU', 'Effect Monster', [
  {
    index: 0,
    text: 'If this card is Normal Summoned: add 1.',
    activated: true,
    opt: hopt,
    patterns: [],
  },
  { index: 1, text: 'Continuous.', activated: false, patterns: [] },
]);
const FUSION = card('BF', 'Spell Card', [
  { index: 0, text: 'Fusion Summon 1 Fusion Monster.', activated: true, patterns: [] },
]);
const ALBION = card('ALB', 'Fusion Monster');
const cards = new Map([ALUBER, FUSION, ALBION].map((c) => [c.id, c]));
const state = initialState({
  cards: [
    { instanceId: 'alu', cardId: 'ALU', owner: 'self', zone: 'HAND' },
    { instanceId: 'bf', cardId: 'BF', owner: 'self', zone: 'HAND' },
    { instanceId: 'alb', cardId: 'ALB', owner: 'self', zone: 'EXTRA' },
  ],
});
const keys = (list: { key?: string }[]) => list.map((a) => a.key);

describe('cardActions', () => {
  it('zeigt nur aktivierte Effekte mit Ziffer und OPT-Stand', () => {
    const { effects, other } = cardActions(state, cards, 'alu');
    expect(effects).toHaveLength(1);
    expect(effects[0]).toMatchObject({ key: '1', opt: 'HOPT', free: true });
    expect(keys(other)).toEqual(['N', 'S', undefined, 'G', 'B', 'D']);
  });

  it('bietet ohne Normal Summon nur noch Setzen und Special Summon an', () => {
    const used = { ...state, normalSummonUsed: true };
    expect(cardActions(used, cards, 'alu').other.map((a) => a.id)).not.toContain('ns');
  });

  it('setzt Zauber und beschwört Extra-Deck-Monster erst nach der Materialwahl', () => {
    expect(cardActions(state, cards, 'bf').other[0]).toMatchObject({ id: 'set', key: 'S' });
    const extra = cardActions(state, cards, 'alb').other;
    expect(extra[0]).toMatchObject({ id: 'xs', extraSummon: true });
    expect(extra.map((a) => a.id)).not.toContain('extra');
  });
});
