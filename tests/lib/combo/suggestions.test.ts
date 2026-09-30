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
    // Ash-Typ: "When a card or effect is activated ... (Quick Effect)" trifft auch die Trigger-Muster
    {
      id: 'ashlike',
      name: 'Ashlike',
      type: 'Tuner Monster',
      effects: [fx({ patterns: ['QUICK', 'TRIGGER_WHEN_OPT', 'TRIGGER_MANDATORY'] })],
    },
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
    { instanceId: 'opp-2', cardId: 'ashlike', owner: 'opponent', zone: 'HAND' },
  ],
};
const ids = (list: { instanceId: string }[]) => list.map((c) => c.instanceId).sort();

describe('candidateEffects', () => {
  it('ohne Chain: aktivierte Effekte des Spielers, keine Fallen von der Hand, keine Spells aus dem Friedhof', () => {
    const list = candidateEffects(initialState(START), 'self', CARDS);
    // Imperm fehlt: "If you control no cards", der Spieler kontrolliert aber Karten
    expect(ids(list)).toEqual(['ignition-1', 'quick-1', 'trap-2', 'trigger-1']);
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
    expect(ids(candidateEffects(state, 'self', CARDS))).toEqual(['quick-1', 'trap-2']);
    expect(ids(candidateEffects(state, 'opponent', CARDS))).toEqual(['opp-1', 'opp-2']);
  });

  it('Imperm von der Hand nur, wenn der Spieler keine Karten kontrolliert', () => {
    const handOnly = initialState({ cards: START.cards.filter((c) => c.zone === 'HAND') });
    expect(ids(candidateEffects(handOnly, 'self', CARDS))).toContain('imperm-1');
  });
});

describe('jevRequest', () => {
  it('stellt pro Kandidat eine Frage mit dem Effekttext aus den Kartendaten', () => {
    const state = initialState(START);
    const candidates = candidateEffects(state, 'self', CARDS);
    const { state: jevState, questions } = jevRequest(toSuggestionInput(state, candidates), CARDS);

    expect(Object.keys(questions)).toHaveLength(candidates.length);
    expect(questions.c0.type).toBe('noul');
    expect(questions.c0.instructions).toContain('Full card text');
    expect(JSON.stringify(jevState)).toContain('Trap (set)');
  });
});
