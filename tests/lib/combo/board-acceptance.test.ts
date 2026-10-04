import { describe, expect, it } from 'vitest';
import { parseEffects } from '@/lib/cards/effects';
import { boardThreats } from '@/lib/combo/opponent-board';
import { stressBranch, stressTest } from '@/lib/combo/stress';
import {
  initialState,
  statesForTree,
  type CardData,
  type ComboNodeData,
  type StartState,
} from '@/lib/combo/state';

const beast: CardData = {
  id: 'beast',
  name: 'Naturia Beast',
  type: 'Synchro Monster',
  effects: [
    {
      index: 0,
      activated: true,
      patterns: ['NEG_ACT_DESTROY'],
      text: 'When a Spell Card is activated (Quick Effect): You can send the top 2 cards of your Deck to the GY; negate the activation, and if you do, destroy it. This card must be face-up on the field to activate and to resolve this effect.',
    },
  ],
};
const spell: CardData = {
  id: 'spell',
  name: 'Test Spell',
  type: 'Spell Card',
  race: 'Continuous',
  effects: [{ index: 0, activated: true, patterns: [], text: 'Draw 1 card.' }],
};
const monster: CardData = { ...spell, id: 'monster', name: 'Test Monster', type: 'Effect Monster' };
const trap: CardData = { ...spell, id: 'trap', name: 'Test Trap', type: 'Trap Card' };
const cards = new Map([beast, spell, monster, trap].map((c) => [c.id, c]));
const start: StartState = {
  cards: [
    { instanceId: 'beast', cardId: 'beast', owner: 'opponent', zone: 'MONSTER', position: 'ATK' },
    { instanceId: 'monster', cardId: 'monster', owner: 'self', zone: 'MONSTER', position: 'ATK' },
    { instanceId: 'hand', cardId: 'spell', owner: 'self', zone: 'HAND' },
    { instanceId: 'set', cardId: 'spell', owner: 'self', zone: 'SPELL_TRAP', position: 'SET' },
    { instanceId: 'open', cardId: 'spell', owner: 'self', zone: 'FIELD', position: 'ATK' },
    { instanceId: 'gy', cardId: 'spell', owner: 'self', zone: 'GY' },
    { instanceId: 'trap', cardId: 'trap', owner: 'self', zone: 'SPELL_TRAP', position: 'SET' },
  ],
};
const node = (id: string, data: Partial<ComboNodeData>): ComboNodeData => ({
  id,
  parentId: null,
  kind: 'ACTIVATE',
  player: 'self',
  effectIndex: 0,
  ...data,
});
const activate = (id: string, instanceId: string, cardId = 'spell') =>
  node(id, {
    instanceId,
    cardId,
    ...(instanceId === 'hand' || instanceId === 'set' || instanceId === 'trap'
      ? {
          costMoves: [
            {
              instanceId,
              from: instanceId === 'hand' ? ('HAND' as const) : ('SPELL_TRAP' as const),
              to: 'SPELL_TRAP' as const,
              position: 'ATK' as const,
            },
          ],
        }
      : {}),
  });
function run(nodes: ComboNodeData[], initial = start, deck = cards) {
  const line = nodes.map((n, i) => ({ ...n, parentId: nodes[i - 1]?.id ?? null }));
  const state = initialState(initial);
  const states = statesForTree(line, initial, deck);
  const threats = boardThreats(state, deck);
  const entries = threats.map((t) => ({
    staple: t.staple,
    cardId: t.card.id,
    instanceId: t.instanceId,
  }));
  return { line, state, states, threats, hits: stressTest(line, states, state, deck, entries) };
}

describe('Gegnerboard-Abnahme: Naturia Beast', () => {
  it('erkennt den echten Kartentext auch nach dem Effektparser als reine Zauberkarten-Antwort', () => {
    const parsed = { ...beast, effects: parseEffects(beast.effects[0].text, beast).effects };
    const result = run([activate('a', 'hand')], start, new Map(cards).set('beast', parsed));
    expect(result.threats[0].staple.hits).toEqual(['SPELL_ACTIVATION']);
    expect(result.hits.map((h) => h.stepId)).toEqual(['a']);
  });
  it('trifft weder Beschwörungen noch Monstereffekte', () => {
    expect(
      run([
        node('summon', { kind: 'ACTION', action: 'NORMAL_SUMMON' }),
        activate('monster-effect', 'monster', 'monster'),
      ]).hits
    ).toEqual([]);
  });

  it('trifft nur Kartenaktivierungen aus Hand und verdecktem Feld, keine offenen oder GY-Effekte', () => {
    const result = run([
      activate('hand-activation', 'hand'),
      node('resolve-1', { kind: 'RESOLVE' }),
      activate('set-activation', 'set'),
      node('resolve-2', { kind: 'RESOLVE' }),
      activate('open-effect', 'open'),
      node('resolve-3', { kind: 'RESOLVE' }),
      activate('gy-effect', 'gy'),
      node('resolve-4', { kind: 'RESOLVE' }),
      activate('trap-activation', 'trap', 'trap'),
    ]);
    expect(result.hits.map((h) => h.stepId)).toEqual(['hand-activation', 'set-activation']);
  });

  it.each(['GY', 'SET'] as const)(
    'meldet nach Entfernen/Verdecken (%s) keine weiteren Treffer',
    (mode) => {
      const result = run([
        activate('before', 'hand'),
        node('resolve', { kind: 'RESOLVE' }),
        node('remove', {
          kind: 'ACTION',
          action: 'OTHER',
          resolveMoves: [
            {
              instanceId: 'beast',
              from: 'MONSTER',
              to: mode === 'GY' ? 'GY' : 'MONSTER',
              ...(mode === 'SET' ? { position: 'SET' as const } : {}),
            },
          ],
        }),
        activate('after', 'set'),
      ]);
      expect(result.hits.map((h) => h.stepId)).toEqual(['before']);
    }
  );

  it('zeigt alternative Eingriffspunkte, berechnet aber keine zweite Unterbrechung im Standardmodus', () => {
    const result = run([
      activate('a', 'hand'),
      node('r', { kind: 'RESOLVE' }),
      activate('b', 'set'),
    ]);
    expect(result.hits).toHaveLength(2);
    const entry = result.threats[0];
    const branch = stressBranch(
      result.hits[0],
      entry,
      result.line,
      result.states,
      result.state,
      'Beast'
    );
    expect(branch.instanceId).toBe('beast');
    expect(branch.negates).toMatchObject({ type: 'ACTIVATION', nodeId: 'a' });
    const branched = run([result.line[0], branch, ...result.line.slice(1)]);
    expect(branched.hits).toEqual([]);
  });

  it.each(['Trap Card', 'Spell/Trap Card'])(
    'trennt auch bei %s die Kartenaktivierung vom Effekt',
    (wording) => {
      const negator = {
        ...beast,
        effects: [
          { ...beast.effects[0], text: `When a ${wording} is activated: negate the activation.` },
        ],
      };
      const deck = new Map(cards).set('beast', negator);
      const initial: StartState = {
        cards: [
          ...start.cards,
          {
            instanceId: 'open-trap',
            cardId: 'trap',
            owner: 'self',
            zone: 'SPELL_TRAP',
            position: 'ATK',
          },
          { instanceId: 'gy-trap', cardId: 'trap', owner: 'self', zone: 'GY' },
        ],
      };
      const result = run(
        [
          activate('set-trap', 'trap', 'trap'),
          node('resolve', { kind: 'RESOLVE' }),
          activate('open-trap-effect', 'open-trap', 'trap'),
          node('resolve-2', { kind: 'RESOLVE' }),
          activate('gy-trap-effect', 'gy-trap', 'trap'),
        ],
        initial,
        deck
      );
      expect(result.hits.map((h) => h.stepId)).toEqual(['set-trap']);
    }
  );
});
