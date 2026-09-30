import { describe, expect, it } from 'vitest';
import {
  initialState,
  statesForTree,
  type CardData,
  type ComboNodeData,
  type StartState,
} from '@/lib/combo/state';
import { buildStep, withMoves } from '@/lib/combo/play';
import { STAPLES } from '@/lib/combo/reactions';
import { existingBranch, stressBranch, stressTest, type StapleEntry } from '@/lib/combo/stress';

const eff = (text: string, patterns: string[] = []) => ({
  index: 0,
  text,
  activated: true,
  patterns: patterns as never[],
});
const ALUBER: CardData = {
  id: 'ALU',
  name: 'Aluber',
  type: 'Effect Monster',
  effects: [
    eff(
      'If this card is Normal or Special Summoned: You can add 1 "Branded" Spell/Trap from your Deck to your hand.',
      ['TRIGGER_IF_OPT']
    ),
  ],
};
const FUSION: CardData = { id: 'BF', name: 'Branded Fusion', type: 'Spell Card', effects: [] };
const ASH: CardData = {
  id: 'ASH',
  name: 'Ash Blossom & Joyous Spring',
  type: 'Tuner Monster',
  effects: [eff('You can discard this card; negate that effect.', ['QUICK'])],
};
const JUDGMENT: CardData = { id: 'SJ', name: 'Solemn Judgment', type: 'Trap Card', effects: [] };
const cards = new Map([ALUBER, FUSION, ASH, JUDGMENT].map((c) => [c.id, c]));

const byName = (name: string) => STAPLES.find((s) => s.name === name)!;
const entries: StapleEntry[] = [
  { staple: byName('Ash Blossom & Joyous Spring'), cardId: 'ASH' },
  { staple: byName('Infinite Impermanence'), cardId: 'IMP' },
  { staple: byName('Droll & Lock Bird'), cardId: 'DROLL' },
  { staple: byName('Mulcharmy Purulia'), cardId: 'PUR' },
  { staple: byName('Mulcharmy Fuwalos'), cardId: 'FUW' },
  { staple: byName('Solemn Judgment'), cardId: 'SJ' },
];

/** NS Aluber, Aluber sucht Branded Fusion, Chain wird aufgelöst */
function play(start: StartState) {
  let nodes: ComboNodeData[] = [];
  const step = (intent: Parameters<typeof buildStep>[0]) => {
    const states = statesForTree(nodes, start, cards);
    const parent = nodes.at(-1) ?? null;
    const state = parent ? states.get(parent.id)! : initialState(start);
    nodes = [...nodes, ...buildStep(intent, { nodes, parent, state, cards })];
  };
  step({ kind: 'normalSummon', instanceId: 'alu' });
  step({ kind: 'activate', instanceId: 'alu', effectIndex: 0 });
  const act = nodes.at(-1)!;
  nodes = nodes.map((n) =>
    n.id === act.id
      ? withMoves(n, 'resolveMoves', [{ instanceId: 'bf', cardId: 'BF', from: 'DECK', to: 'HAND' }])
      : n
  );
  step({ kind: 'resolve' });
  return { nodes, states: statesForTree(nodes, start, cards), start: initialState(start) };
}

const START: StartState = {
  cards: [
    { instanceId: 'alu', cardId: 'ALU', owner: 'self', zone: 'HAND' },
    { instanceId: 'bf', cardId: 'BF', owner: 'self', zone: 'DECK' },
  ],
};

describe('stressTest', () => {
  const { nodes, states, start } = play(START);
  const [ns, act, resolve] = nodes;
  const hits = stressTest(nodes, states, start, cards, entries);
  const of = (name: string) => hits.filter((h) => h.staple.startsWith(name));

  it('Ash trifft die Suche aus dem Deck und kennt den Satzteil', () => {
    expect(of('Ash')).toEqual([
      expect.objectContaining({
        stepId: act.id,
        anchorId: act.id,
        target: 'alu',
        phrase: expect.objectContaining({
          text: 'add 1 "Branded" Spell/Trap from your Deck to your hand',
        }),
      }),
    ]);
  });

  it('Imperm trifft den Effekt des offenen Monsters auf dem Feld', () => {
    expect(of('Infinite')).toEqual([expect.objectContaining({ stepId: act.id, target: 'alu' })]);
  });

  it('Droll steht an der Suche, der Branch entsteht nach der Auflösung', () => {
    expect(of('Droll')).toEqual([
      expect.objectContaining({ stepId: act.id, anchorId: resolve.id, target: 'bf' }),
    ]);
  });

  it('Mulcharmy zählt Beschwörungen am Anfang des Zuges', () => {
    expect(of('Mulcharmy Purulia')).toEqual([
      expect.objectContaining({ stepId: ns.id, anchorId: null, count: 1 }),
    ]);
    expect(of('Mulcharmy Fuwalos')).toEqual([]);
  });

  it('Solemn nur mit gesetzter Karte auf dem Gegnerboard', () => {
    expect(of('Solemn')).toEqual([]);
    const withSolemn = play({
      cards: [
        ...START.cards,
        {
          instanceId: 'sj',
          cardId: 'SJ',
          owner: 'opponent',
          zone: 'SPELL_TRAP',
          slot: 0,
          position: 'SET',
        },
      ],
    });
    const solemn = stressTest(
      withSolemn.nodes,
      withSolemn.states,
      withSolemn.start,
      cards,
      entries
    ).filter((h) => h.staple === 'Solemn Judgment');
    expect(solemn.map((h) => h.stepId)).toEqual([withSolemn.nodes[0].id]);
  });

  it('lässt entfernte Treffer weg und prüft Lines mit Unterbrechung nicht', () => {
    const ignored = nodes.map((n) =>
      n.id === act.id ? { ...n, ignoredHits: ['Ash Blossom & Joyous Spring'] } : n
    );
    expect(
      stressTest(ignored, states, start, cards, entries).some((h) => h.staple.startsWith('Ash'))
    ).toBe(false);
    const branch = stressBranch(
      of('Ash')[0],
      { staple: entries[0].staple, card: ASH },
      nodes,
      states,
      start,
      'Ash auf 2'
    );
    expect(stressTest([...nodes.slice(0, 2), branch], states, start, cards, entries)).toEqual([]);
  });

  it('prüft Paare nur nach der ersten Unterbrechung und ohne denselben Staple', () => {
    const IMP: CardData = {
      id: 'IMP',
      name: 'Infinite Impermanence',
      type: 'Trap Card',
      effects: [],
    };
    const withImp = new Map([...cards, ['IMP', IMP]]);
    const imperm = stressBranch(
      of('Infinite')[0],
      { staple: entries[1].staple, card: IMP },
      nodes,
      states,
      start,
      'Imperm auf 2'
    );
    // Nach der Unterbrechung: Chain auflösen, dann Aluber auf den Friedhof und wieder beschwören
    const after: ComboNodeData[] = [
      { id: 'res2', parentId: imperm.id, kind: 'RESOLVE', player: 'self' },
      {
        id: 'ss2',
        parentId: 'res2',
        kind: 'ACTION',
        player: 'self',
        action: 'SPECIAL_SUMMON',
        resolveMoves: [{ instanceId: 'bf', cardId: 'BF', from: 'DECK', to: 'HAND' }],
      },
    ];
    const tree = [...nodes, imperm, ...after];
    const treeStates = statesForTree(tree, START, withImp);
    const branchLine = [ns, act, imperm, ...after];
    const pairs = stressTest(branchLine, treeStates, start, withImp, entries, { pairs: true });
    expect(pairs.length).toBeGreaterThan(0);
    expect(pairs.every((h) => ['res2', 'ss2', imperm.id].includes(h.stepId))).toBe(true);
    expect(pairs.some((h) => h.staple === 'Infinite Impermanence')).toBe(false);
    expect(pairs.some((h) => h.pattern === 'TURN_START_HAND_SUMMONS')).toBe(false);
    expect(pairs.map((h) => h.staple)).toContain('Droll & Lock Bird');
    // Ohne Paar-Modus bleibt eine Line mit Unterbrechung ungeprüft
    expect(stressTest(branchLine, treeStates, start, withImp, entries)).toEqual([]);
  });

  it('legt den Ash-Branch am Schritt an und negiert dessen Effekt', () => {
    const branch = stressBranch(
      of('Ash')[0],
      { staple: entries[0].staple, card: ASH },
      nodes,
      states,
      start,
      'Ash auf 2'
    );
    expect(branch).toMatchObject({
      parentId: act.id,
      player: 'opponent',
      edgeLabel: 'Ash auf 2',
      negates: { type: 'EFFECT', nodeId: act.id },
    });
    expect(existingBranch([...nodes, branch], act.id, 'ASH')?.id).toBe(branch.id);
    const legacy: ComboNodeData = {
      id: 'opp',
      parentId: act.id,
      kind: 'OPPONENT',
      player: 'opponent',
    };
    const under = { ...branch, id: 'under', parentId: 'opp' };
    expect(existingBranch([...nodes, legacy, under], act.id, 'ASH')?.id).toBe('under');
  });
});
