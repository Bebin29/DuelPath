import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import { drawFromDeck, startStateFromDeck, type DeckEntry } from '@/lib/combo/deck';
import { sortByDepth } from '@/lib/combo/cards';
import type { CardMove, ComboNodeData, StartState, Zone } from '@/lib/combo/state';

/**
 * Legt für den Test-Nutzer ein Branded-Despia-Deck und die Beispiel-Line aus UX- und UI-Plan an:
 * NS Aluber, Aluber sucht Branded Fusion; Goldfish über Branded Fusion zu Albion, Branch B mit Ash Blossom.
 * Mehrfach ausführbar: vorhandene Beispiele werden ersetzt.
 *
 * Usage: npm run db:sample (nach db:seed und cards:import)
 */
const EMAIL = 'test@duelpath.local';
const DECK_NAME = 'Branded Despia (Beispiel)';
const COMBO_TITLE = 'Aluber 1-Card (Beispiel)';

const C = {
  aluber: '62962630',
  albaz: '68468459',
  tragedy: '36577931',
  quem: '45883110',
  brandedFusion: '44362883',
  brandedOpening: '36637374',
  brandedInRed: '82738008',
  ash: '14558127',
  imperm: '10045474',
  called: '24224830',
  fuwalos: '42141493',
  nibiru: '27204311',
  veiler: '97268402',
  droll: '94145021',
  albion: '87746184',
  lubellion: '70534340',
  mirrorjade: '44146295',
};

const MAIN: [string, number][] = [
  [C.aluber, 3],
  [C.albaz, 3],
  [C.tragedy, 2],
  [C.quem, 3],
  [C.brandedFusion, 1],
  [C.brandedOpening, 3],
  [C.brandedInRed, 2],
  [C.ash, 3],
  [C.imperm, 3],
  [C.called, 2],
  [C.fuwalos, 2],
  [C.nibiru, 1],
  [C.veiler, 1],
  [C.droll, 1],
];
const EXTRA: [string, number][] = [
  [C.albion, 2],
  [C.lubellion, 1],
  [C.mirrorjade, 1],
];

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`Test-Nutzer ${EMAIL} fehlt, zuerst npm run db:seed`);
  const missing = await prisma.card.count({ where: { id: { in: Object.values(C) } } });
  if (missing !== Object.values(C).length)
    throw new Error('Karten fehlen, zuerst npm run cards:import');

  await prisma.combo.deleteMany({ where: { userId: user.id, title: COMBO_TITLE } });
  await prisma.deck.deleteMany({ where: { userId: user.id, name: DECK_NAME } });

  const deck = await prisma.deck.create({
    data: {
      name: DECK_NAME,
      userId: user.id,
      deckCards: {
        create: [
          ...MAIN.map(([cardId, quantity]) => ({ cardId, quantity, deckSection: 'MAIN' })),
          ...EXTRA.map(([cardId, quantity]) => ({ cardId, quantity, deckSection: 'EXTRA' })),
        ],
      },
    },
  });

  const entries: DeckEntry[] = [
    ...MAIN.map(([cardId, quantity]) => ({ cardId, quantity, section: 'MAIN' as const })),
    ...EXTRA.map(([cardId, quantity]) => ({ cardId, quantity, section: 'EXTRA' as const })),
  ];
  const opponentHand: StartState['cards'] = [
    { instanceId: 'opp-ash', cardId: C.ash, owner: 'opponent', zone: 'HAND' },
    ...[1, 2, 3, 4].map((i) => ({
      instanceId: `opp-hand-${i}`,
      cardId: C.veiler,
      owner: 'opponent' as const,
      zone: 'HAND' as const,
    })),
  ];
  let start = startStateFromDeck({ cards: opponentHand }, entries);
  for (const id of [C.aluber, C.ash, C.imperm, C.called, C.brandedOpening])
    start = drawFromDeck(start, id);

  const inst = (cardId: string, zone: Zone) => {
    const c = start.cards.find((x) => x.cardId === cardId && x.zone === zone && x.owner === 'self');
    if (!c) throw new Error(`Karte ${cardId} nicht in ${zone}`);
    return c.instanceId;
  };
  const aluber = inst(C.aluber, 'HAND');
  const fusion = inst(C.brandedFusion, 'DECK');
  const albaz = inst(C.albaz, 'DECK');
  const quem = inst(C.quem, 'DECK');
  const albion = inst(C.albion, 'EXTRA');
  const move = (
    instanceId: string,
    cardId: string,
    from: Zone,
    to: Zone,
    extra: Partial<CardMove> = {}
  ): CardMove => ({
    instanceId,
    cardId,
    from,
    to,
    ...extra,
  });

  const node = (
    id: string,
    parentId: string | null,
    rank: number,
    data: Partial<ComboNodeData>
  ): ComboNodeData => ({
    id: `${id}-${deck.id}`,
    parentId: parentId ? `${parentId}-${deck.id}` : null,
    rank,
    kind: 'ACTION',
    player: 'self',
    costMoves: [],
    resolveMoves: [],
    ...data,
  });
  const nodes: ComboNodeData[] = [
    node('ns', null, 0, {
      kind: 'ACTION',
      action: 'NORMAL_SUMMON',
      cardId: C.aluber,
      resolveMoves: [move(aluber, C.aluber, 'HAND', 'MONSTER', { slot: 2, position: 'ATK' })],
    }),
    node('search', 'ns', 0, {
      kind: 'ACTIVATE',
      instanceId: aluber,
      cardId: C.aluber,
      effectIndex: 0,
      resolveMoves: [move(fusion, C.brandedFusion, 'DECK', 'HAND')],
      note: 'Immer zuerst Aluber, damit Ash hier landet und nicht auf Branded Fusion.',
    }),
    node('react', 'search', 0, { kind: 'OPPONENT' }),
    node('none', 'react', 0, { kind: 'RESOLVE', edgeLabel: 'Keine Reaktion' }),
    node('ash', 'react', 1, {
      kind: 'ACTIVATE',
      player: 'opponent',
      edgeLabel: 'Ash Blossom',
      instanceId: 'opp-ash',
      cardId: C.ash,
      effectIndex: 0,
      costMoves: [move('opp-ash', C.ash, 'HAND', 'GY', { owner: 'opponent' })],
      negates: { type: 'EFFECT', nodeId: `search-${deck.id}` },
    }),
    node('ashResolve', 'ash', 0, { kind: 'RESOLVE' }),
    node('fusion', 'none', 0, {
      kind: 'ACTIVATE',
      instanceId: fusion,
      cardId: C.brandedFusion,
      effectIndex: 0,
      costMoves: [
        move(fusion, C.brandedFusion, 'HAND', 'SPELL_TRAP', { slot: 1, position: 'ATK' }),
      ],
      resolveMoves: [
        move(albaz, C.albaz, 'DECK', 'GY'),
        move(quem, C.quem, 'DECK', 'GY'),
        move(albion, C.albion, 'EXTRA', 'MONSTER', { slot: 1, position: 'ATK' }),
      ],
    }),
    node('fusionResolve', 'fusion', 0, { kind: 'RESOLVE' }),
    node('end', 'fusionResolve', 0, { kind: 'END' }),
  ];

  const combo = await prisma.combo.create({
    data: {
      title: COMBO_TITLE,
      userId: user.id,
      deckId: deck.id,
      startState: start as unknown as Prisma.InputJsonValue,
    },
  });
  await prisma.comboNode.createMany({
    data: sortByDepth(nodes).map((n) => ({
      ...n,
      comboId: combo.id,
      costMoves: (n.costMoves ?? []) as unknown as Prisma.InputJsonValue,
      resolveMoves: (n.resolveMoves ?? []) as unknown as Prisma.InputJsonValue,
      negates: (n.negates ?? undefined) as Prisma.InputJsonValue | undefined,
    })),
  });

  console.log(`Deck:  ${deck.name}`);
  console.log(`Combo: ${combo.title} → /combos/${combo.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
