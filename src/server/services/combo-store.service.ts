import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import type { CardMove, ComboNodeData, StartState } from '@/lib/combo/state';
import { toComboCard, type ComboCard } from '@/lib/combo/cards';
import { nodeRows } from '@/lib/prisma/node-rows';
import { drawFromDeck, startStateFromDeck, type DeckEntry } from '@/lib/combo/deck';
import { newInstanceId } from '@/lib/combo/tree';
import { saveComboSchema, type SaveComboInput } from '@/lib/validations/combo.schema';
import { parseStatus, type ComboStatus } from '@/lib/combo/library';

/**
 * Laden, Anlegen und Speichern von Combos für einen Nutzer. Browser (Server Actions) und REST-API
 * nutzen denselben Weg; die Revision verhindert, dass einer die Änderungen des anderen still
 * überschreibt.
 */

export const CARD_SELECT = {
  id: true,
  name: true,
  nameDe: true,
  type: true,
  race: true,
  imageSmall: true,
  effects: true,
  effectsOverride: true,
  linkMarkers: true,
} as const;

export interface LoadedCombo {
  id: string;
  title: string;
  deckId: string | null;
  tags: string[];
  status: ComboStatus;
  revision: number;
  startState: StartState;
  nodes: ComboNodeData[];
  cards: ComboCard[];
}

export type StoreError = { code: 'NOT_FOUND' | 'INVALID' | 'CONFLICT'; message: string };

type NodeRow = Awaited<ReturnType<typeof prisma.comboNode.findMany>>[number];

export function nodeFromRow(n: NodeRow): ComboNodeData {
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
export function cardIdsOf(startState: StartState, nodes: ComboNodeData[]): Set<string> {
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

export async function loadCards(ids: Iterable<string>): Promise<ComboCard[]> {
  const rows = await prisma.card.findMany({ where: { id: { in: [...ids] } }, select: CARD_SELECT });
  return rows.map(toComboCard);
}

/** Combo samt Knoten und Kartendaten, nur für den Besitzer */
export async function loadCombo(userId: string, comboId: string): Promise<LoadedCombo | null> {
  const combo = await prisma.combo.findUnique({ where: { id: comboId } });
  if (!combo || combo.userId !== userId) return null;
  const rows = await prisma.comboNode.findMany({
    where: { comboId },
    orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }],
  });
  const nodes = rows.map(nodeFromRow);
  const startState = combo.startState as unknown as StartState;
  return {
    id: combo.id,
    title: combo.title,
    deckId: combo.deckId,
    tags: combo.tags,
    status: parseStatus(combo.status),
    revision: combo.revision,
    startState,
    nodes,
    cards: await loadCards(cardIdsOf(startState, nodes)),
  };
}

/** Main und Extra Deck eines eigenen Decks mit Kartendaten */
export async function loadDeckEntries(
  userId: string,
  deckId: string
): Promise<{ entries: DeckEntry[]; cards: ComboCard[] } | null> {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    select: {
      userId: true,
      deckCards: {
        where: { deckSection: { in: ['MAIN', 'EXTRA'] } },
        select: { quantity: true, deckSection: true, card: { select: CARD_SELECT } },
      },
    },
  });
  if (!deck || deck.userId !== userId) return null;
  return {
    entries: deck.deckCards.map((dc) => ({
      cardId: dc.card.id,
      quantity: dc.quantity,
      section: dc.deckSection as DeckEntry['section'],
    })),
    cards: deck.deckCards.map((dc) => toComboCard(dc.card)),
  };
}

export interface CreateComboInput {
  title: string;
  deckId?: string;
  /** Passcodes der Starthand; werden aus dem Deck gezogen */
  startHand?: string[];
  /** Going Second: Karten auf dem Gegnerboard, Zauber und Fallen gesetzt */
  opponent?: { cardId: string; zone: 'MONSTER' | 'SPELL_TRAP' | 'FIELD' }[];
}

export async function createComboFor(
  userId: string,
  input: CreateComboInput
): Promise<{ id: string } | StoreError> {
  const title = input.title.trim().slice(0, 100);
  if (!title) return { code: 'INVALID', message: 'Titel fehlt' };

  let startState: StartState = { cards: [] };
  if (input.deckId) {
    const deck = await loadDeckEntries(userId, input.deckId);
    if (!deck) return { code: 'NOT_FOUND', message: 'Deck nicht gefunden' };
    startState = startStateFromDeck(startState, deck.entries);
    for (const cardId of input.startHand ?? []) startState = drawFromDeck(startState, cardId);
  }
  const slots = { MONSTER: 0, SPELL_TRAP: 0, FIELD: 0 };
  for (const o of (input.opponent ?? []).slice(0, 11)) {
    if (!['MONSTER', 'SPELL_TRAP', 'FIELD'].includes(o.zone)) continue;
    const slot = o.zone === 'FIELD' ? undefined : slots[o.zone]++;
    if (slot !== undefined && slot > 4) continue;
    startState = {
      cards: [
        ...startState.cards,
        {
          instanceId: newInstanceId(o.cardId),
          cardId: o.cardId,
          owner: 'opponent',
          zone: o.zone,
          ...(slot !== undefined && { slot }),
          position: o.zone === 'MONSTER' ? 'ATK' : 'SET',
        },
      ],
    };
  }

  return prisma.combo.create({
    data: {
      title,
      userId,
      deckId: input.deckId ?? null,
      startState: startState as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
}

/**
 * Speichert den ganzen Baum. Mit `expectedRevision` nur, wenn seitdem niemand gespeichert hat;
 * sonst CONFLICT. Gibt die neue Revision zurück.
 */
export async function storeCombo(
  userId: string,
  comboId: string,
  input: SaveComboInput,
  expectedRevision?: number
): Promise<{ revision: number } | StoreError> {
  const parsed = saveComboSchema.safeParse(input);
  if (!parsed.success)
    return { code: 'INVALID', message: parsed.error.issues[0]?.message ?? 'Ungültige Daten' };
  const { title, deckId, startState, nodes, tags, status } = parsed.data;

  const ids = new Set(nodes.map((n) => n.id));
  if (ids.size !== nodes.length) return { code: 'INVALID', message: 'Doppelte Knoten-IDs' };
  if (nodes.some((n) => n.parentId && !ids.has(n.parentId))) {
    return { code: 'INVALID', message: 'Knoten verweist auf unbekannten Elternknoten' };
  }
  if (deckId) {
    const deck = await prisma.deck.findUnique({ where: { id: deckId }, select: { userId: true } });
    if (!deck || deck.userId !== userId)
      return { code: 'NOT_FOUND', message: 'Deck nicht gefunden' };
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.combo.updateMany({
      where: {
        id: comboId,
        userId,
        ...(expectedRevision !== undefined && { revision: expectedRevision }),
      },
      data: {
        title,
        deckId,
        tags,
        status,
        startState: startState as Prisma.InputJsonValue,
        revision: { increment: 1 },
      },
    });
    if (updated.count === 0) {
      const exists = await tx.combo.findFirst({
        where: { id: comboId, userId },
        select: { id: true },
      });
      return exists
        ? ({ code: 'CONFLICT', message: 'Die Combo wurde inzwischen geändert' } as const)
        : ({ code: 'NOT_FOUND', message: 'Not found' } as const);
    }
    await tx.comboNode.deleteMany({ where: { comboId } });
    await tx.comboNode.createMany({ data: nodeRows(comboId, nodes) });
    const after = await tx.combo.findUnique({ where: { id: comboId }, select: { revision: true } });
    return { revision: after?.revision ?? 0 };
  });
}

export const isStoreError = (value: unknown): value is StoreError =>
  typeof value === 'object' && value !== null && 'code' in value && 'message' in value;
