// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { toPortable, fromPortable, cardRefsOf, type PortableSource } from '@/lib/combo/portable';
import { parseEffects } from '@/lib/cards/effects';
import { initialState, stateAt, type ComboNodeData, type StartState } from '@/lib/combo/state';
import { endboardSummary } from '@/lib/combo/endboard';
import { sortByDepth } from '@/lib/combo/cards';
import { saveComboSchema } from '@/lib/validations/combo.schema';

const catalogue = (prefix: string) =>
  [
    {
      key: 'hard',
      name: 'Crystal Beast Test',
      passcode: '100',
      type: 'Effect Monster',
      race: 'Beast',
      text: 'You can add 1 card from your Deck to your hand. You can only use this effect of "Crystal Beast Test" once per turn.',
    },
    {
      key: 'soft',
      name: 'Soft Test',
      passcode: '101',
      type: 'Effect Monster',
      race: 'Warrior',
      text: 'Once per turn: You can draw 1 card.',
    },
    {
      key: 'spell',
      name: 'Normal Test',
      passcode: '102',
      type: 'Spell Card',
      race: 'Normal',
      text: 'Pay 500 LP; draw 1 card. You can only activate 1 "Normal Test" per turn.',
    },
    {
      key: 'opp',
      name: 'Counter Test',
      passcode: '103',
      type: 'Trap Card',
      race: 'Counter',
      text: 'Negate the activation.',
    },
    {
      key: 'xyz',
      name: 'Xyz Test',
      passcode: '104',
      type: 'XYZ Monster',
      race: 'Warrior',
      text: '',
    },
    {
      key: 'search',
      name: 'Searched Test',
      passcode: '105',
      type: 'Effect Monster',
      race: 'Beast',
      text: '',
    },
    {
      key: 'grant',
      name: 'Grant Test',
      passcode: null,
      type: 'Spell Card',
      race: 'Continuous',
      text: 'You can Normal Summon 1 "Crystal Beast" monster in addition to your Normal Summon/Set.',
    },
  ].map(({ key, text, ...card }) => ({
    ...card,
    id: `${prefix}-${key}`,
    effects: parseEffects(text, card).effects,
  }));

const start = (p: string): StartState => ({
  cards: [
    ...['h1', 'h2', 'h3'].map((instanceId) => ({
      instanceId,
      cardId: `${p}-hard`,
      owner: 'self' as const,
      zone: 'HAND' as const,
    })),
    ...['s1', 's2'].map((instanceId) => ({
      instanceId,
      cardId: `${p}-soft`,
      owner: 'self' as const,
      zone: 'MONSTER' as const,
    })),
    { instanceId: 'spell', cardId: `${p}-spell`, owner: 'self', zone: 'HAND' },
    {
      instanceId: 'opp',
      cardId: `${p}-opp`,
      owner: 'opponent',
      controller: 'opponent',
      zone: 'SPELL_TRAP',
      slot: 0,
      position: 'SET',
    },
    { instanceId: 'host', cardId: `${p}-xyz`, owner: 'self', zone: 'MONSTER', slot: 4 },
    {
      instanceId: 'material',
      cardId: `${p}-hard`,
      owner: 'self',
      zone: 'MATERIAL',
      attachedTo: 'host',
    },
    {
      instanceId: 'equip',
      cardId: `${p}-spell`,
      owner: 'self',
      zone: 'SPELL_TRAP',
      equippedTo: 'host',
    },
    { instanceId: 'token', cardId: `${p}-search`, owner: 'self', zone: 'MONSTER', token: true },
    {
      instanceId: 'grant',
      cardId: `${p}-grant`,
      owner: 'self',
      zone: 'SPELL_TRAP',
      position: 'ATK',
    },
  ],
});
const nodes = (p: string): ComboNodeData[] => {
  const out: ComboNodeData[] = [];
  const add = (id: string, rest: Partial<ComboNodeData>) =>
    out.push({
      id,
      parentId: out.at(-1)?.id ?? null,
      rank: 0,
      kind: 'ACTIVATE',
      player: 'self',
      ...rest,
    });
  add('ns1', {
    kind: 'ACTION',
    action: 'NORMAL_SUMMON',
    instanceId: 'h1',
    cardId: `${p}-hard`,
    resolveMoves: [{ instanceId: 'h1', from: 'HAND', to: 'MONSTER', slot: 0 }],
  });
  add('a', {
    instanceId: 'h1',
    cardId: `${p}-hard`,
    effectIndex: 0,
    resolveMoves: [{ instanceId: 'found', cardId: `${p}-search`, from: 'DECK', to: 'HAND' }],
    note: 'Search',
    targets: ['s1'],
  });
  add('b', {
    instanceId: 'opp',
    cardId: `${p}-opp`,
    effectIndex: 0,
    player: 'opponent',
    negates: { type: 'EFFECT', nodeId: 'a' },
  });
  add('c', {
    instanceId: 'spell',
    cardId: `${p}-spell`,
    effectIndex: 0,
    costMoves: [{ instanceId: 'spell', from: 'HAND', to: 'SPELL_TRAP', slot: 1 }],
    negates: { type: 'NAME', cardId: `${p}-opp` },
    optOverride: true,
    ignoredHits: ['Ash Blossom & Joyous Spring'],
  });
  add('r1', { kind: 'RESOLVE' });
  add('ns2', {
    kind: 'ACTION',
    action: 'NORMAL_SUMMON',
    instanceId: 'h2',
    cardId: `${p}-hard`,
    resolveMoves: [{ instanceId: 'h2', from: 'HAND', to: 'MONSTER', slot: 1 }],
  });
  add('ns3', {
    kind: 'ACTION',
    action: 'NORMAL_SUMMON',
    instanceId: 'h3',
    cardId: `${p}-hard`,
    resolveMoves: [{ instanceId: 'h3', from: 'HAND', to: 'MONSTER', slot: 2 }],
  });
  add('hard2', {
    instanceId: 'h2',
    cardId: `${p}-hard`,
    effectIndex: 0,
    resolveMoves: [{ instanceId: 'found2', cardId: `${p}-search`, from: 'DECK', to: 'HAND' }],
  });
  add('r2', { kind: 'RESOLVE' });
  for (const [id, instanceId] of [
    ['soft1', 's1'],
    ['softAgain', 's1'],
    ['soft2', 's2'],
  ]) {
    add(id, { instanceId, cardId: `${p}-soft`, effectIndex: 0 });
    add(`resolve-${id}`, { kind: 'RESOLVE' });
  }
  add('cardNegation', {
    instanceId: 'opp',
    cardId: `${p}-opp`,
    effectIndex: 0,
    player: 'opponent',
    negates: { type: 'CARD', instanceId: 'h2' },
  });
  add('r3', { kind: 'RESOLVE' });
  add('xyz', {
    kind: 'ACTION',
    action: 'SPECIAL_SUMMON',
    instanceId: 'xyz',
    cardId: `${p}-xyz`,
    resolveMoves: [
      { instanceId: 'xyz', cardId: `${p}-xyz`, from: 'EXTRA', to: 'MONSTER', slot: 3 },
      { instanceId: 's1', from: 'MONSTER', to: 'MATERIAL', attachTo: 'xyz' },
    ],
  });
  add('end', { kind: 'END', interruptions: { xyz: 2, h2: 1 } });
  // Sibling alternatives exercise remapping of both other node-negation kinds.
  add('activationNegation', {
    parentId: 'a',
    rank: 2,
    instanceId: 'opp',
    cardId: `${p}-opp`,
    effectIndex: 0,
    player: 'opponent',
    negates: { type: 'ACTIVATION', nodeId: 'a' },
  });
  add('r4', { kind: 'RESOLVE' });
  add('summonNegation', {
    parentId: 'ns1',
    rank: 3,
    instanceId: 'opp',
    cardId: `${p}-opp`,
    effectIndex: 0,
    player: 'opponent',
    negates: { type: 'SUMMON', nodeId: 'ns1' },
  });
  add('r5', { kind: 'RESOLVE' });
  return out;
};
const source = (p: string): PortableSource => ({
  title: 'Engine roundtrip',
  tags: ['Test'],
  status: 'TOURNAMENT',
  startState: start(p),
});
const A = catalogue('a'),
  B = catalogue('b');
const exported = () => toPortable(source('a'), nodes('a'), (id) => A.find((c) => c.id === id));
const resolve = (ref: { passcode: string | null; name: string }) =>
  B.find((c) => (ref.passcode ? c.passcode === ref.passcode : c.name === ref.name))?.id;

describe('portable engine roundtrip', () => {
  it('retains engine states, warnings and complete endboards on every branch across installations', () => {
    const read = fromPortable(JSON.parse(JSON.stringify(exported())), resolve, (id) =>
      B.find((c) => c.id === id)
    );
    expect(read.error).toBeUndefined();
    expect(read.warnings).toEqual([]);
    expect(read.data!.status).toBe('DRAFT');
    const before = nodes('a');
    const remap = new Map(sortByDepth(before).map((n, i) => [n.id, read.data!.nodes[i].id]));
    const normalize = (value: unknown) =>
      JSON.stringify(value).replace(/"[ab]-(hard|soft|spell|opp|xyz|search|grant)"/g, '"$1"');
    const cardsA = new Map(A.map((c) => [c.id, c])),
      cardsB = new Map(B.map((c) => [c.id, c]));
    for (const old of before) {
      const newNode = read.data!.nodes.find((n) => n.id === remap.get(old.id))!;
      const a = stateAt(before, old.id, start('a'), cardsA);
      const b = stateAt(read.data!.nodes, newNode.id, read.data!.startState, cardsB);
      expect(
        normalize({
          ...a,
          chain: a.chain.map((l) => ({ ...l, nodeId: remap.get(l.nodeId) })),
          warnings: a.warnings.map((w) => ({ ...w, nodeId: remap.get(w.nodeId) })),
        })
      ).toEqual(normalize(b));
      expect(
        normalize(endboardSummary(a, initialState(start('a')), cardsA, old.interruptions))
      ).toEqual(
        normalize(
          endboardSummary(b, initialState(read.data!.startState), cardsB, newNode.interruptions)
        )
      );
    }
    expect(exported().nodes.some((n) => n.rank === 3)).toBe(true);
    const last = stateAt(before, 'end', start('a'), cardsA);
    expect(last.warnings.some((w) => w.nodeId === 'ns3' && /Normal Summon/.test(w.message))).toBe(
      true
    );
    expect(last.warnings.some((w) => w.nodeId === 'hard2' && /OPT/.test(w.message))).toBe(true);
    expect(last.warnings.some((w) => w.nodeId === 'softAgain' && /OPT/.test(w.message))).toBe(true);
    expect(last.warnings.some((w) => w.nodeId === 'soft2' && /OPT/.test(w.message))).toBe(false);
    expect(last.extraSummonsUsed).toEqual(['grant']);
    expect(last.cards.spell.zone).toBe('GY');
    expect(last.cards.s1.attachedTo).toBe('xyz');
    expect(last.cards.found2.cardId).toBe('a-search');
  });

  it('exports stubs everywhere without effect texts or patterns, plus effect checks', () => {
    const file = exported();
    expect(cardRefsOf(file).every((r) => r.type && r.effects)).toBe(true);
    expect(file.nodes.find((n) => n.note === 'Search')?.effectCheck?.count).toBe(
      A[0].effects.length
    );
    expect(JSON.stringify(file)).not.toContain('Pay 500 LP');
    expect(JSON.stringify(file)).not.toContain('patterns');
  });

  it('reports effective local effect changes on the exact step and keeps the tree', () => {
    const changed = B.map((c) =>
      c.id === 'b-hard' ? { ...c, effects: parseEffects('Draw 2 cards.', c).effects } : c
    );
    const read = fromPortable(exported(), resolve, (id) => changed.find((c) => c.id === id));
    expect(read.warnings?.filter((w) => w.code === 'effects').map((w) => w.nodeId)).toEqual(
      read
        .data!.nodes.filter((n) => n.cardId === 'b-hard' && n.effectIndex != null)
        .map((n) => n.id)
    );
    expect(read.data!.nodes).toHaveLength(nodes('a').length);
    const node = read.data!.nodes.find((n) => n.note === 'Search')!;
    expect(
      stateAt(
        read.data!.nodes,
        node.id,
        read.data!.startState,
        new Map(changed.map((c) => [c.id, c]))
      ).warnings.some((w) => /Importdatei/.test(w.message))
    ).toBe(true);
  });

  it('preserves long name-only placeholder ids through autosave validation', () => {
    const file = exported();
    file.startState.cards[0].card = { passcode: null, name: 'X'.repeat(200) };
    file.nodes
      .filter((n) => n.instanceId === 'h1')
      .forEach((n) => {
        n.card = file.startState.cards[0].card;
      });
    const read = fromPortable(file, () => null);
    expect(read.error).toBeUndefined();
    expect(read.data!.startState.cards[0].cardId).toBe(`missing:name:${'X'.repeat(200)}`);
    expect(saveComboSchema.safeParse(read.data).success).toBe(true);
  });
});

const smallFile = () =>
  toPortable(
    {
      title: 'Validation',
      tags: [],
      status: 'DRAFT',
      startState: { cards: [{ instanceId: 'i', cardId: 'a-hard', owner: 'self', zone: 'HAND' }] },
    },
    [
      {
        id: 'a',
        parentId: null,
        kind: 'ACTIVATE',
        player: 'self',
        cardId: 'a-hard',
        instanceId: 'i',
        effectIndex: 0,
      },
    ],
    (id) => A.find((c) => c.id === id)
  );
describe('portable internal references', () => {
  it.each([
    'node',
    'targets',
    'cardNegation',
    'move',
    'attachTo',
    'interruptions',
    'future',
    'otherBranch',
    'duplicate',
    'inconsistent',
    'cycle',
    'negationNode',
    'oversized',
    'reservedId',
  ])('rejects %s before import', (kind) => {
    const file = smallFile(),
      n = file.nodes[0];
    if (kind === 'node') n.instanceId = 'missing';
    if (kind === 'targets') n.targets = ['missing'];
    if (kind === 'cardNegation') n.negates = { type: 'CARD', instanceId: 'missing' };
    if (kind === 'move') n.costMoves = [{ instanceId: 'missing', from: 'HAND', to: 'GY' }];
    if (kind === 'attachTo')
      n.costMoves = [{ instanceId: 'i', from: 'HAND', to: 'MATERIAL', attachTo: 'missing' }];
    if (kind === 'interruptions') n.interruptions = { missing: 1 };
    if (kind === 'future' || kind === 'otherBranch') {
      n.targets = ['future'];
      file.nodes.push({
        ...n,
        id: 'n2',
        parentId: kind === 'future' ? 'n1' : null,
        targets: null,
        kind: 'ACTION',
        costMoves: [],
        resolveMoves: [{ instanceId: 'future', card: n.card, from: 'DECK', to: 'HAND' }],
      });
    }
    if (kind === 'duplicate') file.startState.cards.push(file.startState.cards[0]);
    if (kind === 'inconsistent')
      n.costMoves = [
        { instanceId: 'i', card: { passcode: 'other', name: 'Other' }, from: 'HAND', to: 'GY' },
      ];
    if (kind === 'cycle') n.parentId = n.id;
    if (kind === 'negationNode') n.negates = { type: 'EFFECT', nodeId: 'missing' };
    if (kind === 'oversized') Object.assign(file, { extra: 'x'.repeat(900_001) });
    if (kind === 'reservedId') n.instanceId = '__proto__';
    expect(fromPortable(file, resolve).error).toMatchObject({ code: 'invalid' });
  });

  it('allows an instance introduced by an earlier move on the same path', () => {
    const file = smallFile();
    file.nodes[0].kind = 'ACTION';
    file.nodes[0].resolveMoves = [
      {
        instanceId: 'new',
        card: { passcode: '105', name: 'Searched Test' },
        from: 'DECK',
        to: 'HAND',
      },
    ];
    file.nodes.push({
      ...file.nodes[0],
      id: 'n2',
      parentId: 'n1',
      targets: ['new'],
      resolveMoves: [],
    });
    expect(fromPortable(file, resolve).error).toBeUndefined();
  });

  it('rejects conflicting definitions for the same missing card', () => {
    const file = smallFile();
    file.nodes[0].card = { ...file.nodes[0].card!, type: 'Trap Card' };
    expect(fromPortable(file, () => null).error).toMatchObject({ code: 'invalid' });
  });
});
