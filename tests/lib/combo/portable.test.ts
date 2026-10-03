// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  fromPortable,
  PORTABLE_FORMAT,
  toPortable,
  type CardRef,
  type PortableCombo,
  type PortableSource,
} from '@/lib/combo/portable';
import type { ComboNodeData, StartState } from '@/lib/combo/state';

/**
 * Round-Trip des portablen Combo-Formats. Geprüft wird vor allem das, was die Leseansicht
 * `/api/v1/combos/:id` weglässt: costMoves, resolveMoves, optOverride, ignoredHits,
 * interruptions, dazu Branches, Chain mit Negierungen und das Gegnerboard aus dem Startzustand.
 */

/** Kartenbestand einer Installation; `local` ist die Card.id, die dort vergeben wurde */
interface TestCard {
  local: string;
  name: string;
  passcode: string | null;
}

const catalogue = (prefix: string): TestCard[] => [
  { local: `${prefix}-ash`, name: 'Snake-Eye Ash', passcode: '90241276' },
  { local: `${prefix}-oak`, name: 'Snake-Eye Oak', passcode: '45663742' },
  { local: `${prefix}-blossom`, name: 'Ash Blossom & Joyous Spring', passcode: '14558127' },
  { local: `${prefix}-called`, name: 'Called by the Grave', passcode: '24224830' },
  { local: `${prefix}-apollousa`, name: 'Apollousa, Bow of the Goddess', passcode: '4280258' },
  // Ohne Passcode: der Import muss über den Namen zurückfinden
  { local: `${prefix}-droll`, name: 'Droll & Lock Bird', passcode: null },
];

const lookup = (cards: TestCard[]) => (id: string) => cards.find((c) => c.local === id);

/** Wie der Server auflöst: erst Passcode, dann Name */
const resolver = (cards: TestCard[]) => (ref: CardRef) =>
  (ref.passcode ? cards.find((c) => c.passcode === ref.passcode) : undefined)?.local ??
  cards.find((c) => c.name === ref.name)?.local;

const A = catalogue('a');
const B = catalogue('b');

const startState = (p: string): StartState => ({
  cards: [
    { instanceId: 'i-ash', cardId: `${p}-ash`, owner: 'self', zone: 'HAND' },
    { instanceId: 'i-called', cardId: `${p}-called`, owner: 'self', zone: 'HAND' },
    { instanceId: 'i-droll', cardId: `${p}-droll`, owner: 'self', zone: 'HAND' },
    { instanceId: 'i-oak', cardId: `${p}-oak`, owner: 'self', zone: 'DECK' },
    // Going Second: das Gegnerboard steht im Startzustand und darf nicht verloren gehen
    {
      instanceId: 'i-apollousa',
      cardId: `${p}-apollousa`,
      owner: 'opponent',
      controller: 'opponent',
      zone: 'MONSTER',
      slot: 0,
      position: 'ATK',
    },
    {
      instanceId: 'i-oppblossom',
      cardId: `${p}-blossom`,
      owner: 'opponent',
      zone: 'HAND',
    },
  ],
});

/**
 * Baum mit zwei Branches. Branch 0 ist die Chain: Ash aktiviert, der Gegner chaint Ash Blossom,
 * darauf Called by the Grave mit Namenssperre. Branch 1 ist die Line ohne Reaktion.
 */
const nodes = (p: string): ComboNodeData[] => [
  {
    id: 'A',
    parentId: null,
    rank: 0,
    kind: 'ACTIVATE',
    player: 'self',
    cardId: `${p}-ash`,
    instanceId: 'i-ash',
    effectIndex: 0,
    costMoves: [
      { instanceId: 'i-ash', from: 'HAND', to: 'MONSTER', slot: 0, position: 'ATK' },
      { instanceId: 'i-droll', from: 'HAND', to: 'GY' },
    ],
    resolveMoves: [],
    targets: ['i-oak'],
    optOverride: true,
    note: 'Kosten vor der Chain',
  },
  {
    id: 'B',
    parentId: 'A',
    rank: 0,
    kind: 'OPPONENT',
    player: 'opponent',
    edgeLabel: 'Ash Blossom',
    costMoves: [],
    resolveMoves: [],
  },
  {
    id: 'C',
    parentId: 'B',
    rank: 0,
    kind: 'ACTIVATE',
    player: 'opponent',
    cardId: `${p}-blossom`,
    instanceId: 'i-oppblossom',
    effectIndex: 0,
    costMoves: [{ instanceId: 'i-oppblossom', from: 'HAND', to: 'GY' }],
    resolveMoves: [],
    negates: { type: 'EFFECT', nodeId: 'A' },
  },
  {
    id: 'D',
    parentId: 'C',
    rank: 0,
    kind: 'ACTIVATE',
    player: 'self',
    cardId: `${p}-called`,
    instanceId: 'i-called',
    effectIndex: 0,
    costMoves: [{ instanceId: 'i-called', from: 'HAND', to: 'SPELL_TRAP', slot: 0 }],
    resolveMoves: [],
    negates: { type: 'NAME', cardId: `${p}-blossom` },
    targets: ['i-oppblossom'],
  },
  {
    id: 'E',
    parentId: 'D',
    rank: 0,
    kind: 'RESOLVE',
    player: 'self',
    costMoves: [],
    resolveMoves: [
      { instanceId: 'i-oak', cardId: `${p}-oak`, from: 'DECK', to: 'MONSTER', slot: 1 },
      { instanceId: 'i-token', cardId: `${p}-oak`, from: 'DECK', to: 'MONSTER', slot: 2, token: true },
    ],
    ignoredHits: ['Ash Blossom & Joyous Spring', 'Droll & Lock Bird'],
  },
  {
    id: 'F',
    parentId: 'E',
    rank: 0,
    kind: 'END',
    player: 'self',
    costMoves: [],
    resolveMoves: [],
    interruptions: { 'i-oak': 2, 'i-ash': 1 },
  },
  // Zweiter Branch am selben Elternknoten
  {
    id: 'G',
    parentId: 'A',
    rank: 1,
    kind: 'RESOLVE',
    player: 'self',
    edgeLabel: 'Keine Reaktion',
    costMoves: [],
    resolveMoves: [{ instanceId: 'i-oak', cardId: `${p}-oak`, from: 'DECK', to: 'HAND' }],
    note: 'Ohne Handtrap läuft die Line durch',
  },
];

const source = (p: string): PortableSource => ({
  title: 'Snake-Eye 1-Card',
  tags: ['1-Card', 'Going Second'],
  status: 'TESTED',
  startState: startState(p),
});

/** Datei so, wie sie auf der Platte landet: einmal durch JSON und zurück */
const onDisk = (file: PortableCombo): PortableCombo => JSON.parse(JSON.stringify(file));

describe('portable', () => {
  const exported = toPortable(source('a'), nodes('a'), lookup(A));

  it('schreibt Karten als Passcode mit Namen und nummeriert die Knoten durch', () => {
    expect(exported.format).toBe(PORTABLE_FORMAT);
    expect(exported.version).toBe(1);
    expect(exported.nodes.map((n) => n.id)).toEqual(['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7']);
    expect(exported.nodes[0].card).toEqual({ passcode: '90241276', name: 'Snake-Eye Ash' });
    // Karte ohne Passcode reist über den Namen
    expect(exported.startState.cards[2].card).toEqual({
      passcode: null,
      name: 'Droll & Lock Bird',
    });
    expect(JSON.stringify(exported)).not.toContain('a-ash');
  });

  it('round trip in eine leere Datenbank ergibt inhaltlich dieselbe Combo', () => {
    const read = fromPortable(onDisk(exported), resolver(B));
    expect(read.error).toBeUndefined();
    expect(read.missing).toEqual([]);

    const again = toPortable(
      { ...source('b'), startState: read.data!.startState },
      read.data!.nodes,
      lookup(B)
    );
    expect(again).toEqual(exported);
  });

  it('überträgt genau die Felder, die die Leseansicht weglässt', () => {
    const read = fromPortable(onDisk(exported), resolver(B));
    const byNote = (note: string) => read.data!.nodes.find((n) => n.note === note)!;

    const root = byNote('Kosten vor der Chain');
    expect(root.costMoves).toEqual([
      { instanceId: 'i-ash', from: 'HAND', to: 'MONSTER', slot: 0, position: 'ATK' },
      { instanceId: 'i-droll', from: 'HAND', to: 'GY' },
    ]);
    expect(root.optOverride).toBe(true);
    expect(root.targets).toEqual(['i-oak']);

    const resolve = read.data!.nodes.find((n) => n.ignoredHits)!;
    expect(resolve.ignoredHits).toEqual(['Ash Blossom & Joyous Spring', 'Droll & Lock Bird']);
    expect(resolve.resolveMoves).toEqual([
      { instanceId: 'i-oak', cardId: 'b-oak', from: 'DECK', to: 'MONSTER', slot: 1 },
      { instanceId: 'i-token', cardId: 'b-oak', from: 'DECK', to: 'MONSTER', slot: 2, token: true },
    ]);

    const end = read.data!.nodes.find((n) => n.kind === 'END')!;
    expect(end.interruptions).toEqual({ 'i-oak': 2, 'i-ash': 1 });
  });

  it('behält Branches, Chain und Gegnerboard', () => {
    const read = fromPortable(onDisk(exported), resolver(B));
    const got = read.data!.nodes;

    // Zwei Kinder am Wurzelknoten, der mit rank 0 setzt die Hauptline fort
    const root = got.find((n) => n.parentId === null)!;
    const children = got.filter((n) => n.parentId === root.id);
    expect(children.map((c) => c.rank)).toEqual([0, 1]);
    expect(children.find((c) => c.rank === 1)!.edgeLabel).toBe('Keine Reaktion');

    // Chain: die Negierung zeigt nach dem Import auf den neuen Knoten, nicht auf die alte ID
    const blossom = got.find((n) => n.player === 'opponent' && n.kind === 'ACTIVATE')!;
    expect(blossom.negates).toEqual({ type: 'EFFECT', nodeId: root.id });
    const called = got.find((n) => n.negates?.type === 'NAME')!;
    expect(called.negates).toEqual({ type: 'NAME', cardId: 'b-blossom' });

    const opponent = read.data!.startState.cards.filter((c) => c.owner === 'opponent');
    expect(opponent).toEqual([
      {
        instanceId: 'i-apollousa',
        cardId: 'b-apollousa',
        owner: 'opponent',
        controller: 'opponent',
        zone: 'MONSTER',
        slot: 0,
        position: 'ATK',
      },
      { instanceId: 'i-oppblossom', cardId: 'b-blossom', owner: 'opponent', zone: 'HAND' },
    ]);
  });

  it('vergibt frische Knoten-IDs und bildet parentId neu ab', () => {
    const read = fromPortable(onDisk(exported), resolver(B));
    const ids = read.data!.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(7);
    expect(ids.some((id) => id.startsWith('n'))).toBe(false);
    for (const node of read.data!.nodes) {
      if (node.parentId) expect(ids).toContain(node.parentId);
    }
    // Zweimal importieren gibt zwei getrennte Combos, keine gemeinsamen IDs
    const second = fromPortable(onDisk(exported), resolver(B));
    expect(second.data!.nodes.map((n) => n.id)).not.toEqual(ids);
  });

  it('übernimmt Titel, Tags und Status', () => {
    const read = fromPortable(onDisk(exported), resolver(B));
    expect(read.data!.title).toBe('Snake-Eye 1-Card');
    expect(read.data!.tags).toEqual(['1-Card', 'Going Second']);
    expect(read.data!.status).toBe('TESTED');
  });

  it('merkt sich den Decknamen, hängt aber kein Deck an', () => {
    const withDeck = toPortable(
      { ...source('a'), deckName: 'Snake-Eye Fire King' },
      nodes('a'),
      lookup(A)
    );
    expect(withDeck.deck).toEqual({ name: 'Snake-Eye Fire King' });
    expect(fromPortable(onDisk(withDeck), resolver(B))).not.toHaveProperty('data.deckId');
  });

  it('lehnt eine unbekannte Version ab statt zu raten', () => {
    const future = { ...onDisk(exported), version: 2 };
    expect(fromPortable(future, resolver(B)).error).toEqual({ code: 'version', version: 2 });
  });

  it('lehnt ein fremdes Format ab', () => {
    expect(fromPortable({ format: 'ydk', version: 1 }, resolver(B)).error).toEqual({
      code: 'format',
    });
    expect(fromPortable('kein JSON-Objekt', resolver(B)).error).toEqual({ code: 'format' });
  });

  it('lehnt einen kaputten Baum ab', () => {
    const file = onDisk(exported);
    const broken = { ...file, nodes: file.nodes.map((n) => ({ ...n, parentId: 'weg' })) };
    expect(fromPortable(broken, resolver(B)).error).toMatchObject({ code: 'invalid' });

    const doubled = { ...file, nodes: [...file.nodes, file.nodes[0]] };
    expect(fromPortable(doubled, resolver(B)).error).toEqual({
      code: 'invalid',
      detail: 'Doppelte Knoten-IDs',
    });
  });

  it('importiert den Rest und meldet Karten, die der Bestand nicht kennt', () => {
    const withoutBlossom = B.filter((c) => c.name !== 'Ash Blossom & Joyous Spring');
    const read = fromPortable(onDisk(exported), resolver(withoutBlossom));

    expect(read.missing).toEqual([
      { passcode: '14558127', name: 'Ash Blossom & Joyous Spring' },
    ]);
    // Der Baum bleibt vollständig, nur die Kartenverweise fallen weg
    expect(read.data!.nodes).toHaveLength(7);
    const blossom = read.data!.nodes.find((n) => n.player === 'opponent' && n.kind === 'ACTIVATE')!;
    expect(blossom.cardId).toBeNull();
    expect(read.data!.nodes.find((n) => n.cardId === 'b-called')!.negates).toBeNull();
    // Die Karte lag beim Gegner auf der Hand: der Startzustand verliert sie, der Rest steht
    expect(read.data!.startState.cards.map((c) => c.instanceId)).toEqual([
      'i-ash',
      'i-called',
      'i-droll',
      'i-oak',
      'i-apollousa',
    ]);
  });

  it('meldet eine fehlende Karte einmal, auch wenn sie mehrfach vorkommt', () => {
    const withoutOak = B.filter((c) => c.name !== 'Snake-Eye Oak');
    const read = fromPortable(onDisk(exported), resolver(withoutOak));
    expect(read.missing).toEqual([{ passcode: '45663742', name: 'Snake-Eye Oak' }]);
    const moves = read.data!.nodes.flatMap((n) => n.resolveMoves ?? []);
    expect(moves).toHaveLength(3);
    expect(moves.every((m) => m.cardId === undefined)).toBe(true);
  });
});
