import { describe, expect, it } from 'vitest';
import {
  initialState,
  statesForTree,
  type CardData,
  type ComboNodeData,
  type GameState,
  type StartState,
} from '@/lib/combo/state';
import { buildStep, withMoves } from '@/lib/combo/play';
import { STAPLES } from '@/lib/combo/reactions';
import { existingBranch, stressBranch, stressTest, type StapleEntry } from '@/lib/combo/stress';
import { boardThreatKey, boardThreats } from '@/lib/combo/opponent-board';

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
function play(start: StartState, deck: Map<string, CardData> = cards) {
  let nodes: ComboNodeData[] = [];
  const step = (intent: Parameters<typeof buildStep>[0]) => {
    const states = statesForTree(nodes, start, deck);
    const parent = nodes.at(-1) ?? null;
    const state = parent ? states.get(parent.id)! : initialState(start);
    nodes = [...nodes, ...buildStep(intent, { nodes, parent, state, cards: deck })];
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
  return { nodes, states: statesForTree(nodes, start, deck), start: initialState(start) };
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

/**
 * Gegnerboard im Stresstest (Lücke L1): Dieselbe Line (1 NS Aluber, 2 Alubers Effekt, 3 Auflösen)
 * läuft gegen ein Board aus Apollousa und gesetzter Solemn Warning.
 * Von Hand: Warning beantwortet die Beschwörung auf 1, Apollousa den Monstereffekt auf 2.
 */
describe('stressTest gegen ein Gegnerboard', () => {
  const APOLLOUSA: CardData = {
    id: 'APO',
    name: 'Apollousa, Bow of the Goddess',
    type: 'Link Monster',
    effects: [
      eff(
        "(Quick Effect): You can make this card lose exactly 800 ATK, and if you do, negate the activation of an opponent's monster effect.",
        ['QUICK', 'NEG_ACTIVATION']
      ),
    ],
  };
  const WARNING: CardData = {
    id: 'WARN',
    name: 'Solemn Warning',
    type: 'Trap Card',
    effects: [
      eff(
        'When a monster(s) would be Summoned, OR when a card or effect is activated that includes an effect that Special Summons a monster(s): Pay 2000 LP; negate the Summon or effect, and if you do, destroy that card.',
        ['NEG_SUMMON', 'NEG_ACT_DESTROY']
      ),
    ],
  };
  const withBoard = new Map([...cards, ['APO', APOLLOUSA], ['WARN', WARNING]] as const);
  const START_BOARD: StartState = {
    cards: [
      ...START.cards,
      { instanceId: 'apo', cardId: 'APO', owner: 'opponent', zone: 'MONSTER', position: 'ATK' },
      {
        instanceId: 'warn',
        cardId: 'WARN',
        owner: 'opponent',
        zone: 'SPELL_TRAP',
        slot: 0,
        position: 'SET',
      },
    ],
  };

  const played = play(START_BOARD, withBoard);
  const [ns, act] = played.nodes;
  const threats = boardThreats(played.start, withBoard);
  const run = (line: ComboNodeData[], states: Map<string, GameState>) =>
    stressTest(
      line,
      states,
      played.start,
      withBoard,
      threats.map((t) => ({ staple: t.staple, cardId: t.card.id, instanceId: t.instanceId }))
    );

  it('meldet pro Schritt, welche liegende Karte ihn beantwortet', () => {
    expect(run(played.nodes, played.states)).toEqual([
      expect.objectContaining({
        staple: boardThreatKey('apo'),
        pattern: 'MONSTER_EFFECT',
        stepId: act.id,
        source: 'apo',
        target: 'alu',
      }),
      expect.objectContaining({
        staple: boardThreatKey('warn'),
        pattern: 'SUMMON',
        stepId: ns.id,
        source: 'warn',
      }),
    ]);
  });

  it('lässt eine Karte weg, die die Line vorher vom Feld räumt', () => {
    // Zwischen Beschwörung und Effekt verlässt Apollousa das Feld
    const pop: ComboNodeData = {
      id: 'pop',
      parentId: ns.id,
      kind: 'ACTION',
      player: 'self',
      action: 'OTHER',
      resolveMoves: [{ instanceId: 'apo', cardId: 'APO', from: 'MONSTER', to: 'GY' }],
    };
    const tree = [
      pop,
      ...played.nodes.map((n) => (n.id === act.id ? { ...n, parentId: pop.id } : n)),
    ];
    const states = statesForTree(tree, START_BOARD, withBoard);
    const hits = run([ns, pop, ...played.nodes.slice(1)], states);
    expect(hits.some((h) => h.source === 'apo')).toBe(false);
    // Die gesetzte Warning auf Schritt 1 steht weiter
    expect(hits.map((h) => h.source)).toEqual(['warn']);
  });

  it('legt den Branch mit der liegenden Instanz an, statt eine neue Kopie anzulegen', () => {
    const [hit] = run(played.nodes, played.states);
    const entry = threats.find((t) => t.instanceId === 'apo')!;
    const branch = stressBranch(
      hit,
      entry,
      played.nodes,
      played.states,
      played.start,
      'Apollousa auf 2'
    );
    expect(branch).toMatchObject({
      parentId: act.id,
      player: 'opponent',
      instanceId: 'apo',
      cardId: 'APO',
      negates: { type: 'ACTIVATION', nodeId: act.id },
    });
    // Eine offene Karte auf dem Feld bewegt sich für ihren Effekt nicht
    expect(branch.costMoves).toEqual([]);
  });
});
