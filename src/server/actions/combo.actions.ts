'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import type { CardMove, ComboNodeData, StartState } from '@/lib/combo/state';
import { toComboCard, type ComboCard } from '@/lib/combo/cards';
import { nodeRows } from '@/lib/prisma/node-rows';
import { STAPLES, type Staple } from '@/lib/combo/reactions';
import { drawFromDeck, startStateFromDeck, type DeckEntry } from '@/lib/combo/deck';
import { saveComboSchema, type SaveComboInput } from '@/lib/validations/combo.schema';
import { comboStats } from '@/lib/combo/summary';
import { deckCounts, missingFromDeck } from '@/lib/deck/deck-check';
import {
  parseStatus,
  type ComboStatus,
  type LibraryCard,
  type LibraryEntry,
} from '@/lib/combo/library';

type Result<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Lädt ein Combo nur, wenn es dem angemeldeten Nutzer gehört */
async function ownCombo(comboId: string) {
  const userId = await currentUserId();
  if (!userId) return { error: 'Unauthorized' as const };
  const combo = await prisma.combo.findUnique({ where: { id: comboId } });
  if (!combo || combo.userId !== userId) return { error: 'Not found' as const };
  return { combo };
}

type NodeRow = Awaited<ReturnType<typeof prisma.comboNode.findMany>>[number];

function nodeFromRow(n: NodeRow): ComboNodeData {
  return {
    id: n.id,
    parentId: n.parentId,
    rank: n.rank,
    note: n.note,
    kind: n.kind as ComboNodeData['kind'],
    player: n.player as ComboNodeData['player'],
    edgeLabel: n.edgeLabel,
    instanceId: n.instanceId,
    cardId: n.cardId,
    effectIndex: n.effectIndex,
    action: n.action as ComboNodeData['action'],
    costMoves: n.costMoves as unknown as CardMove[],
    resolveMoves: n.resolveMoves as unknown as CardMove[],
    negates: n.negates as unknown as ComboNodeData['negates'],
    optOverride: n.optOverride,
    ignoredHits: n.ignoredHits as string[] | null,
    interruptions: n.interruptions as Record<string, number> | null,
  };
}

/** Alle Karten, die im Startzustand oder in einem Knoten vorkommen */
function cardIdsOf(startState: StartState, nodes: ComboNodeData[]): Set<string> {
  const ids = new Set<string>(startState.cards.map((c) => c.cardId));
  for (const n of nodes) {
    if (n.cardId) ids.add(n.cardId);
    for (const m of [...(n.costMoves ?? []), ...(n.resolveMoves ?? [])]) {
      if (m.cardId) ids.add(m.cardId);
    }
    if (n.negates?.type === 'NAME') ids.add(n.negates.cardId);
  }
  return ids;
}

/**
 * Bibliothek (UX-Plan 7.2): alle Combos mit Kennzahlen. Karten werden einmal für alle geladen;
 * für die Anzeige reichen Name und Bild, die Effekte braucht nur die Endboard-Zahl.
 */
export async function listLibrary(
  deckId?: string
): Promise<Result<{ entries: LibraryEntry[]; cards: Record<string, LibraryCard> }>> {
  const userId = await currentUserId();
  if (!userId) return { error: 'Unauthorized' };
  const combos = await prisma.combo.findMany({
    where: { userId, ...(deckId && { deckId }) },
    orderBy: { updatedAt: 'desc' },
    include: {
      deck: {
        select: {
          name: true,
          deckCards: { select: { cardId: true, quantity: true, deckSection: true } },
        },
      },
      nodes: { orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }] },
    },
  });
  const parsed = combos.map((c) => ({
    combo: c,
    startState: c.startState as unknown as StartState,
    nodes: c.nodes.map(nodeFromRow),
  }));
  const ids = new Set<string>();
  for (const p of parsed) for (const id of cardIdsOf(p.startState, p.nodes)) ids.add(id);
  const rows = await prisma.card.findMany({
    where: { id: { in: [...ids] } },
    select: {
      id: true,
      name: true,
      nameDe: true,
      type: true,
      race: true,
      imageSmall: true,
      effects: true,
      effectsOverride: true,
    },
  });
  const full = new Map(rows.map((r) => [r.id, toComboCard(r)]));
  const cards = Object.fromEntries(
    rows.map((r) => [r.id, { name: r.name, nameDe: r.nameDe, imageSmall: r.imageSmall }])
  );

  return {
    data: {
      cards,
      entries: parsed.map(({ combo, startState, nodes }) => {
        const stats = comboStats(startState, nodes, full);
        return {
          id: combo.id,
          title: combo.title,
          deckId: combo.deckId,
          deckName: combo.deck?.name ?? null,
          updatedAt: combo.updatedAt.toISOString(),
          tags: combo.tags,
          status: parseStatus(combo.status),
          stats,
          missing: combo.deck ? missingFromDeck(stats, deckCounts(combo.deck.deckCards)).length : 0,
        };
      }),
    },
  };
}

/** Kopie einer Combo mit neuen Knoten-IDs, etwa um eine Line mit anderer Starthand zu probieren */
export async function duplicateCombo(
  comboId: string,
  title: string
): Promise<Result<{ id: string }>> {
  const owned = await ownCombo(comboId);
  if (owned.error) return { error: owned.error };
  const { combo } = owned;
  const rows = await prisma.comboNode.findMany({ where: { comboId } });
  const nodes = rows.map(nodeFromRow);
  const ids = new Map(nodes.map((n) => [n.id, crypto.randomUUID()]));
  const remap = (id: string) => ids.get(id) ?? id;
  const copied = nodes.map((n) => ({
    ...n,
    id: remap(n.id),
    parentId: n.parentId ? remap(n.parentId) : null,
    negates:
      n.negates && 'nodeId' in n.negates
        ? { ...n.negates, nodeId: remap(n.negates.nodeId) }
        : n.negates,
  }));
  const created = await prisma.combo.create({
    data: {
      title: title.trim().slice(0, 100) || combo.title,
      userId: combo.userId,
      deckId: combo.deckId,
      tags: combo.tags,
      status: 'DRAFT',
      startState: combo.startState as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  await prisma.comboNode.createMany({ data: nodeRows(created.id, copied) });
  return { data: created };
}

export async function listCombos(): Promise<
  Result<{ id: string; title: string; updatedAt: Date; deckName: string | null }[]>
> {
  const userId = await currentUserId();
  if (!userId) return { error: 'Unauthorized' };
  const combos = await prisma.combo.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, title: true, updatedAt: true, deck: { select: { name: true } } },
  });
  return {
    data: combos.map((c) => ({ ...c, deckName: c.deck?.name ?? null, deck: undefined })),
  };
}

/** Legt eine Combo an; mit Deck wird es gleich in den Startzustand geladen */
export async function createCombo(
  title: string,
  deckId?: string,
  /** Passcodes der Starthand; werden aus dem Deck gezogen (UX-Plan 7.1 und 7.3) */
  startHand: string[] = []
): Promise<Result<{ id: string }>> {
  const userId = await currentUserId();
  if (!userId) return { error: 'Unauthorized' };
  const trimmed = title.trim().slice(0, 100);
  if (!trimmed) return { error: 'Titel fehlt' };

  let startState: StartState = { cards: [] };
  if (deckId) {
    const deck = await getDeckForCombo(deckId);
    if (!deck.data) return { error: deck.error };
    startState = startStateFromDeck(startState, deck.data.entries);
    for (const cardId of startHand) startState = drawFromDeck(startState, cardId);
  }

  const combo = await prisma.combo.create({
    data: {
      title: trimmed,
      userId,
      deckId: deckId ?? null,
      startState: startState as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  return { data: combo };
}

export async function deleteCombo(comboId: string): Promise<Result<true>> {
  const owned = await ownCombo(comboId);
  if (owned.error) return { error: owned.error };
  await prisma.combo.delete({ where: { id: comboId } });
  return { data: true };
}

export interface LoadedCombo {
  id: string;
  title: string;
  deckId: string | null;
  tags: string[];
  status: ComboStatus;
  startState: StartState;
  nodes: ComboNodeData[];
  cards: ComboCard[];
}

export async function getCombo(comboId: string): Promise<Result<LoadedCombo>> {
  const owned = await ownCombo(comboId);
  if (owned.error) return { error: owned.error };
  const { combo } = owned;

  const rows = await prisma.comboNode.findMany({
    where: { comboId },
    orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }],
  });
  const nodes = rows.map(nodeFromRow);
  const startState = combo.startState as unknown as StartState;

  const cardIds = cardIdsOf(startState, nodes);
  const cards = await prisma.card.findMany({
    where: { id: { in: [...cardIds] } },
    select: {
      id: true,
      name: true,
      nameDe: true,
      type: true,
      race: true,
      imageSmall: true,
      effects: true,
      effectsOverride: true,
    },
  });

  return {
    data: {
      id: combo.id,
      title: combo.title,
      deckId: combo.deckId,
      tags: combo.tags,
      status: parseStatus(combo.status),
      startState,
      nodes,
      cards: cards.map(toComboCard),
    },
  };
}

export async function saveCombo(comboId: string, input: SaveComboInput): Promise<Result<true>> {
  const owned = await ownCombo(comboId);
  if (owned.error) return { error: owned.error };

  const parsed = saveComboSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Ungültige Daten' };
  const { title, deckId, startState, nodes, tags, status } = parsed.data;

  if (deckId) {
    const deck = await prisma.deck.findUnique({ where: { id: deckId }, select: { userId: true } });
    if (!deck || deck.userId !== owned.combo.userId) return { error: 'Deck nicht gefunden' };
  }

  const ids = new Set(nodes.map((n) => n.id));
  if (ids.size !== nodes.length) return { error: 'Doppelte Knoten-IDs' };
  if (nodes.some((n) => n.parentId && !ids.has(n.parentId))) {
    return { error: 'Knoten verweist auf unbekannten Elternknoten' };
  }

  await prisma.$transaction([
    prisma.comboNode.deleteMany({ where: { comboId } }),
    prisma.comboNode.createMany({ data: nodeRows(comboId, nodes) }),
    prisma.combo.update({
      where: { id: comboId },
      data: { title, deckId, tags, status, startState: startState as Prisma.InputJsonValue },
    }),
  ]);
  return { data: true };
}

export interface StapleCard {
  card: ComboCard;
  staple: Staple;
}

/** Staple-Karten für die Schnellauswahl; im TCG verbotene Karten fallen heraus */
export async function getStaples(): Promise<StapleCard[]> {
  const rows = await prisma.card.findMany({
    where: {
      name: { in: STAPLES.map((s) => s.name) },
      OR: [{ banTcg: null }, { banTcg: { not: 'Forbidden' } }],
    },
    select: {
      id: true,
      name: true,
      nameDe: true,
      type: true,
      race: true,
      imageSmall: true,
      effects: true,
      effectsOverride: true,
    },
  });
  const byName = new Map(rows.map((r) => [r.name, toComboCard(r)]));
  return STAPLES.flatMap((staple) => {
    const card = byName.get(staple.name);
    return card ? [{ card, staple }] : [];
  });
}

/** Decks des Nutzers für die Zuordnung im Editor */
export async function listDeckOptions(): Promise<{ id: string; name: string }[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  return prisma.deck.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
}

/** Main und Extra Deck eines eigenen Decks mit Effektdaten für den Startzustand */
export async function getDeckForCombo(
  deckId: string
): Promise<Result<{ entries: DeckEntry[]; cards: ComboCard[] }>> {
  const userId = await currentUserId();
  if (!userId) return { error: 'Unauthorized' };
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    select: {
      userId: true,
      deckCards: {
        where: { deckSection: { in: ['MAIN', 'EXTRA'] } },
        select: {
          quantity: true,
          deckSection: true,
          card: {
            select: {
              id: true,
              name: true,
              nameDe: true,
              type: true,
              race: true,
              imageSmall: true,
              effects: true,
              effectsOverride: true,
            },
          },
        },
      },
    },
  });
  if (!deck || deck.userId !== userId) return { error: 'Deck nicht gefunden' };

  return {
    data: {
      entries: deck.deckCards.map((dc) => ({
        cardId: dc.card.id,
        quantity: dc.quantity,
        section: dc.deckSection as DeckEntry['section'],
      })),
      cards: deck.deckCards.map((dc) => toComboCard(dc.card)),
    },
  };
}
