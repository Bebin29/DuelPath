'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import type { ParsedEffects } from '@/lib/cards/effects';
import type { CardMove, ComboNodeData, StartState } from '@/lib/combo/state';
import { sortByDepth, toComboCard, type ComboCard } from '@/lib/combo/cards';
import { STAPLES, type Staple } from '@/lib/combo/reactions';
import { startStateFromDeck, type DeckEntry } from '@/lib/combo/deck';
import { saveComboSchema, type SaveComboInput } from '@/lib/validations/combo.schema';

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
export async function createCombo(title: string, deckId?: string): Promise<Result<{ id: string }>> {
  const userId = await currentUserId();
  if (!userId) return { error: 'Unauthorized' };
  const trimmed = title.trim().slice(0, 100);
  if (!trimmed) return { error: 'Titel fehlt' };

  let startState: StartState = { cards: [] };
  if (deckId) {
    const deck = await getDeckForCombo(deckId);
    if (!deck.data) return { error: deck.error };
    startState = startStateFromDeck(startState, deck.data.entries);
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
  const nodes: ComboNodeData[] = rows.map((n) => ({
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
  }));
  const startState = combo.startState as unknown as StartState;

  // Alle Karten, die im Startzustand oder in einem Knoten vorkommen
  const cardIds = new Set<string>(startState.cards.map((c) => c.cardId));
  for (const n of nodes) {
    if (n.cardId) cardIds.add(n.cardId);
    for (const m of [...(n.costMoves ?? []), ...(n.resolveMoves ?? [])]) {
      if (m.cardId) cardIds.add(m.cardId);
    }
    if (n.negates?.type === 'NAME') cardIds.add(n.negates.cardId);
  }
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
    },
  });

  return {
    data: {
      id: combo.id,
      title: combo.title,
      deckId: combo.deckId,
      startState,
      nodes,
      cards: cards.map((c) => ({
        ...c,
        effects: (c.effects as unknown as ParsedEffects | null)?.effects ?? [],
      })),
    },
  };
}

export async function saveCombo(comboId: string, input: SaveComboInput): Promise<Result<true>> {
  const owned = await ownCombo(comboId);
  if (owned.error) return { error: owned.error };

  const parsed = saveComboSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Ungültige Daten' };
  const { title, deckId, startState, nodes } = parsed.data;

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
    prisma.comboNode.createMany({
      data: sortByDepth(nodes).map((n) => ({
        ...n,
        comboId,
        costMoves: n.costMoves as Prisma.InputJsonValue,
        resolveMoves: n.resolveMoves as Prisma.InputJsonValue,
        negates: (n.negates ?? undefined) as Prisma.InputJsonValue | undefined,
      })),
    }),
    prisma.combo.update({
      where: { id: comboId },
      data: { title, deckId, startState: startState as Prisma.InputJsonValue },
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
