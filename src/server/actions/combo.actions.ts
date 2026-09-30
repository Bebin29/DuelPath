'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import type { ParsedEffects } from '@/lib/cards/effects';
import type { CardMove, ComboNodeData, StartState } from '@/lib/combo/state';
import { sortByDepth, type ComboCard } from '@/lib/combo/cards';
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

export async function createCombo(title: string): Promise<Result<{ id: string }>> {
  const userId = await currentUserId();
  if (!userId) return { error: 'Unauthorized' };
  const trimmed = title.trim().slice(0, 100);
  if (!trimmed) return { error: 'Titel fehlt' };
  const combo = await prisma.combo.create({
    data: { title: trimmed, userId, startState: { cards: [] } },
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
    orderBy: { createdAt: 'asc' },
  });
  const nodes: ComboNodeData[] = rows.map((n) => ({
    id: n.id,
    parentId: n.parentId,
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
  const { title, startState, nodes } = parsed.data;

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
      data: { title, startState: startState as Prisma.InputJsonValue },
    }),
  ]);
  return { data: true };
}
