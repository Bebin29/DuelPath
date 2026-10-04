'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import { toComboCard, type ComboCard } from '@/lib/combo/cards';
import { nodeRows } from '@/lib/prisma/node-rows';
import {
  createComboFor,
  isStoreError,
  loadCombo,
  loadDeckEntries,
  nodeFromRow,
  storeCombo,
  type LoadedCombo,
} from '@/server/services/combo-store.service';
import { comboFromPortable, portableCombo } from '@/server/services/combo-portable.service';
import type { CardRef, PortableCombo, PortableError, PortableWarning } from '@/lib/combo/portable';
import { STAPLES, type Staple } from '@/lib/combo/reactions';
import type { DeckEntry } from '@/lib/combo/deck';
import type { SaveComboInput } from '@/lib/validations/combo.schema';
import type { LibraryCard, LibraryEntry } from '@/lib/combo/library';
import { loadLibrary } from '@/server/services/library.service';

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

/**
 * Bibliothek (UX-Plan 7.2): alle Combos mit Kennzahlen. Karten werden einmal für alle geladen;
 * für die Anzeige reichen Name und Bild, die Effekte braucht nur die Endboard-Zahl.
 */
export async function listLibrary(
  deckId?: string
): Promise<Result<{ entries: LibraryEntry[]; cards: Record<string, LibraryCard> }>> {
  const userId = await currentUserId();
  if (!userId) return { error: 'Unauthorized' };
  return { data: await loadLibrary(userId, deckId) };
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
      ...(combo.importChecks && {
        importChecks: Object.fromEntries(
          Object.entries(combo.importChecks as Record<string, Prisma.InputJsonValue>).map(
            ([id, check]) => [remap(id), check]
          )
        ),
      }),
      startState: combo.startState as Prisma.InputJsonValue,
      ...(combo.importedCards && { importedCards: combo.importedCards as Prisma.InputJsonValue }),
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
  startHand: string[] = [],
  /** Going Second: Karten auf dem Gegnerboard, Fallen und Zauber gesetzt (UX-Plan 7.1) */
  opponent: { cardId: string; zone: 'MONSTER' | 'SPELL_TRAP' | 'FIELD' }[] = []
): Promise<Result<{ id: string }>> {
  const userId = await currentUserId();
  if (!userId) return { error: 'Unauthorized' };
  const created = await createComboFor(userId, { title, deckId, startHand, opponent });
  return isStoreError(created) ? { error: created.message } : { data: created };
}

export async function deleteCombo(comboId: string): Promise<Result<true>> {
  const owned = await ownCombo(comboId);
  if (owned.error) return { error: owned.error };
  await prisma.combo.delete({ where: { id: comboId } });
  return { data: true };
}

export type { LoadedCombo };

export async function getCombo(comboId: string): Promise<Result<LoadedCombo>> {
  const userId = await currentUserId();
  if (!userId) return { error: 'Unauthorized' };
  const combo = await loadCombo(userId, comboId);
  return combo ? { data: combo } : { error: 'Not found' };
}

/**
 * Autosave der Workbench. Mit `revision` schlägt das Speichern fehl (CONFLICT), wenn die Combo
 * inzwischen anderswo geändert wurde, etwa über die API.
 */
export async function saveCombo(
  comboId: string,
  input: SaveComboInput,
  revision?: number
): Promise<Result<{ revision: number }>> {
  const userId = await currentUserId();
  if (!userId) return { error: 'Unauthorized' };
  const stored = await storeCombo(userId, comboId, input, revision);
  if (!isStoreError(stored)) return { data: stored };
  return {
    error:
      stored.code === 'CONFLICT'
        ? 'CONFLICT'
        : stored.code === 'NOT_FOUND'
          ? 'Not found'
          : stored.message,
  };
}

/** Combo als JSON-Datei; Karten stehen als Passcode, damit die Datei woanders ebenso gilt */
export async function exportCombo(comboId: string): Promise<Result<PortableCombo>> {
  const userId = await currentUserId();
  if (!userId) return { error: 'Unauthorized' };
  const file = await portableCombo(userId, comboId);
  return file ? { data: file } : { error: 'Not found' };
}

/** Grund, warum eine Datei nicht eingelesen wurde; die Oberfläche übersetzt den Code */
export type ImportError = PortableError | { code: 'denied' };

/**
 * Liest eine JSON-Datei und legt daraus eine **neue** Combo an, nie in eine bestehende hinein.
 * Fehlende Karten stehen in `missing`, der Rest wird importiert.
 */
export async function importCombo(
  json: unknown
): Promise<
  | { data: { id: string; missing: CardRef[]; warnings: PortableWarning[] }; error?: undefined }
  | { data?: undefined; error: ImportError }
> {
  const userId = await currentUserId();
  if (!userId) return { error: { code: 'denied' } };
  return comboFromPortable(userId, json);
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
      passcode: true,
      name: true,
      nameDe: true,
      type: true,
      race: true,
      imageSmall: true,
      effects: true,
      effectsOverride: true,
      linkMarkers: true,
    },
  });
  const byName = new Map(rows.map((r) => [r.name, toComboCard(r)]));
  return STAPLES.flatMap((staple) => {
    const card = byName.get(staple.name);
    return card ? [{ card, staple }] : [];
  });
}

/**
 * Karten der gepflegten Boardbreaker-Liste, damit die Einstellungen Bild und deutschen Namen
 * zeigen können wie bei den Staples. Namen ohne Treffer in der Datenbank fallen still heraus.
 */
export async function getBreakerCards(names: string[]): Promise<Record<string, ComboCard>> {
  if (names.length === 0) return {};
  const rows = await prisma.card.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true, nameDe: true, type: true, imageSmall: true },
  });
  return Object.fromEntries(rows.map((r) => [r.name, toComboCard(r)]));
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
  const deck = await loadDeckEntries(userId, deckId);
  return deck ? { data: deck } : { error: 'Deck nicht gefunden' };
}
