// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { reactionNode, STAPLES } from '@/lib/combo/reactions';
import { stateAt, type CardData, type ComboNodeData, type StartState } from '@/lib/combo/state';

const card = (id: string, type: string, race?: string): CardData => ({
  id,
  name: id,
  type,
  race,
  effects: [{ index: 0, text: '', activated: true, patterns: [] }],
});
const CARDS = new Map(
  [
    card('starter', 'Effect Monster'),
    {
      ...card('ash', 'Tuner Monster'),
      effects: [{ index: 0, text: '', activated: true, patterns: ['QUICK' as const] }],
    },
    card('strike', 'Trap Card', 'Counter'),
    card('called', 'Spell Card', 'Quick-Play'),
  ].map((c) => [c.id, c])
);
const START: StartState = {
  cards: [
    { instanceId: 'starter-1', cardId: 'starter', owner: 'self', zone: 'HAND' },
    { instanceId: 'ash-1', cardId: 'ash', owner: 'opponent', zone: 'HAND' },
  ],
};
const summon: ComboNodeData = {
  id: 'ns',
  parentId: null,
  kind: 'ACTION',
  player: 'self',
  action: 'NORMAL_SUMMON',
  resolveMoves: [{ instanceId: 'starter-1', from: 'HAND', to: 'MONSTER' }],
};
const activation: ComboNodeData = {
  id: 'act',
  parentId: 'ns',
  kind: 'ACTIVATE',
  player: 'self',
  instanceId: 'starter-1',
  cardId: 'starter',
  effectIndex: 0,
};
const opp: ComboNodeData = { id: 'opp', parentId: 'act', kind: 'OPPONENT', player: 'opponent' };

describe('reactionNode', () => {
  it('Ash Blossom: vorhandene Handkarte abwerfen und den obersten Link negieren', () => {
    const nodes = [summon, activation, opp];
    const before = stateAt(nodes, 'opp', START, CARDS);
    const node = reactionNode(
      opp,
      CARDS.get('ash')!,
      { kind: 'discard', negation: 'EFFECT_TOP' },
      'opponent',
      before,
      nodes
    );

    expect(node).toMatchObject({
      parentId: 'opp',
      kind: 'ACTIVATE',
      player: 'opponent',
      instanceId: 'ash-1',
      costMoves: [{ instanceId: 'ash-1', from: 'HAND', to: 'GY' }],
      negates: { type: 'EFFECT', nodeId: 'act' },
    });

    const after = stateAt(
      [...nodes, node, { id: 'r', parentId: node.id, kind: 'RESOLVE', player: 'self' }],
      'r',
      START,
      CARDS
    );
    expect(after.cards['ash-1'].zone).toBe('GY');
    expect(after.warnings).toEqual([]);
  });

  it('Solemn Strike ohne Chain negiert die letzte Beschwörung und legt die gesetzte Falle an', () => {
    const nodes = [summon, { ...opp, parentId: 'ns' }];
    const before = stateAt(nodes, 'opp', START, CARDS);
    const node = reactionNode(
      nodes[1],
      CARDS.get('strike')!,
      { kind: 'setTrap', negation: 'ACTIVATION_OR_SUMMON' },
      'opponent',
      before,
      nodes
    );

    expect(node.negates).toEqual({ type: 'SUMMON', nodeId: 'ns' });
    const after = stateAt(
      [...nodes, node, { id: 'r', parentId: node.id, kind: 'RESOLVE', player: 'self' }],
      'r',
      START,
      CARDS
    );
    expect(after.cards['starter-1'].zone).toBe('GY');
    // Counter Trap nach der Chain auf den Friedhof
    expect(after.cards[node.instanceId!].zone).toBe('GY');
  });

  it('Called by the Grave antwortet mit Namenssperre auf die gegnerische Reaktion', () => {
    const nodes = [summon, activation, opp];
    const ash = reactionNode(
      opp,
      CARDS.get('ash')!,
      { kind: 'discard', negation: 'EFFECT_TOP' },
      'opponent',
      stateAt(nodes, 'opp', START, CARDS),
      nodes
    );
    const withAsh = [...nodes, ash];
    const called = reactionNode(
      ash,
      CARDS.get('called')!,
      { kind: 'quickPlay', negation: 'NAME_TOP' },
      'self',
      stateAt(withAsh, ash.id, START, CARDS),
      withAsh
    );

    expect(called.negates).toEqual({ type: 'NAME', cardId: 'ash' });
    expect(called.costMoves).toEqual([
      expect.objectContaining({ cardId: 'called', owner: 'self', from: 'HAND', to: 'SPELL_TRAP' }),
    ]);
  });

  it('die Staple-Liste enthält jede Karte nur einmal', () => {
    const names = STAPLES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
