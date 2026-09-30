// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { CardEffect } from '@/lib/cards/effects';
import { candidateEffects, jevRequest, toSuggestionInput } from '@/lib/combo/suggestions';
import {
  stateAt,
  initialState,
  type CardData,
  type ComboNodeData,
  type StartState,
} from '@/lib/combo/state';

const fx = (extra: Partial<CardEffect> = {}): CardEffect => ({
  index: 0,
  text: 'Some effect.',
  activated: true,
  patterns: [],
  ...extra,
});
const CARDS = new Map<string, CardData>(
  [
    {
      id: 'ignition',
      name: 'Ignition',
      type: 'Effect Monster',
      effects: [fx({ opt: { kind: 'HARD', wording: 'use', per: 'turn', limit: 1 } })],
    },
    { id: 'quick', name: 'Quick', type: 'Effect Monster', effects: [fx({ patterns: ['QUICK'] })] },
    {
      id: 'trigger',
      name: 'Trigger',
      type: 'Effect Monster',
      effects: [fx({ patterns: ['TRIGGER_IF_OPT'] })],
    },
    { id: 'trap', name: 'Trap', type: 'Trap Card', race: 'Normal', effects: [fx()] },
    {
      id: 'imperm',
      name: 'Imperm',
      type: 'Trap Card',
      race: 'Normal',
      effects: [
        fx({ text: 'If you control no cards, you can activate this card from your hand.' }),
      ],
    },
    { id: 'spell', name: 'Spell', type: 'Spell Card', race: 'Normal', effects: [fx()] },
    { id: 'passive', name: 'Passive', type: 'Effect Monster', effects: [fx({ activated: false })] },
  ].map((c) => [c.id, c])
);
const START: StartState = {
  cards: [
    { instanceId: 'ignition-1', cardId: 'ignition', owner: 'self', zone: 'MONSTER' },
    { instanceId: 'quick-1', cardId: 'quick', owner: 'self', zone: 'HAND' },
    { instanceId: 'trigger-1', cardId: 'trigger', owner: 'self', zone: 'GY' },
    { instanceId: 'trap-1', cardId: 'trap', owner: 'self', zone: 'HAND' },
    { instanceId: 'trap-2', cardId: 'trap', owner: 'self', zone: 'SPELL_TRAP', position: 'SET' },
    { instanceId: 'imperm-1', cardId: 'imperm', owner: 'self', zone: 'HAND' },
    { instanceId: 'spell-1', cardId: 'spell', owner: 'self', zone: 'GY' },
    { instanceId: 'passive-1', cardId: 'passive', owner: 'self', zone: 'MONSTER' },
    { instanceId: 'opp-1', cardId: 'quick', owner: 'opponent', zone: 'HAND' },
  ],
};
const ids = (list: { instanceId: string }[]) => list.map((c) => c.instanceId).sort();

describe('candidateEffects', () => {
  it('ohne Chain: aktivierte Effekte des Spielers, keine Fallen von der Hand, keine Spells aus dem Friedhof', () => {
    const list = candidateEffects(initialState(START), 'self', CARDS);
    expect(ids(list)).toEqual(['ignition-1', 'imperm-1', 'quick-1', 'trap-2', 'trigger-1']);
  });

  it('bei offener Chain nur Spell Speed 2+ und keine Trigger; verbrauchter OPT fällt weg', () => {
    const nodes: ComboNodeData[] = [
      {
        id: 'a',
        parentId: null,
        kind: 'ACTIVATE',
        player: 'self',
        instanceId: 'ignition-1',
        cardId: 'ignition',
        effectIndex: 0,
      },
    ];
    const state = stateAt(nodes, 'a', START, CARDS);
    expect(ids(candidateEffects(state, 'self', CARDS))).toEqual(['imperm-1', 'quick-1', 'trap-2']);
    expect(ids(candidateEffects(state, 'opponent', CARDS))).toEqual(['opp-1']);
  });
});

describe('jevRequest', () => {
  it('stellt pro Kandidat eine Frage mit dem Effekttext aus den Kartendaten', () => {
    const state = initialState(START);
    const candidates = candidateEffects(state, 'self', CARDS);
    const { state: jevState, questions } = jevRequest(toSuggestionInput(state, candidates), CARDS);

    expect(Object.keys(questions)).toHaveLength(candidates.length);
    expect(questions.c0.type).toBe('noul');
    expect(JSON.stringify(questions)).toContain('you can activate this card from your hand');
    expect(JSON.stringify(jevState)).toContain('Trap (set)');
  });
});
