import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import { nodeRows } from '@/lib/prisma/node-rows';
import { parseStatus } from '@/lib/combo/library';
import type { StartState } from '@/lib/combo/state';
import {
  cardRefsOf,
  fromPortable,
  toPortable,
  type CardRef,
  type PortableCombo,
  type PortableError,
  type PortableWarning,
} from '@/lib/combo/portable';
import { CARD_SELECT, loadCards } from './combo-cards.service';
import { toComboCard } from '@/lib/combo/cards';
import { cardIdsOf, nodesWithImportChecks } from '@/server/services/combo-store.service';

/**
 * Combos als JSON-Datei sichern und wieder einlesen (DUE-44). Browser (Server Actions) und
 * REST-API nutzen denselben Weg. Der Import legt immer eine neue Combo an und schreibt nie in eine
 * bestehende; Karten, die der lokale Bestand nicht kennt, werden gemeldet, der Rest kommt mit.
 */

/** Datei zu einer eigenen Combo, null wenn sie nicht existiert oder jemand anderem gehört */
export async function portableCombo(
  userId: string,
  comboId: string
): Promise<PortableCombo | null> {
  const combo = await prisma.combo.findUnique({
    where: { id: comboId },
    include: { deck: { select: { name: true } } },
  });
  if (!combo || combo.userId !== userId) return null;

  const rows = await prisma.comboNode.findMany({
    where: { comboId },
    orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }],
  });
  const nodes = nodesWithImportChecks(rows, combo.importChecks);
  const startState = combo.startState as unknown as StartState;
  const cards = await loadCards(cardIdsOf(startState, nodes), combo.importedCards);
  const byId = new Map(cards.map((c) => [c.id, c]));

  return toPortable(
    {
      title: combo.title,
      tags: combo.tags,
      status: parseStatus(combo.status),
      startState,
      deckName: combo.deck?.name ?? null,
    },
    nodes,
    (id) => {
      const c = byId.get(id);
      return c ? { ...c, passcode: c.passcode ?? null } : undefined;
    }
  );
}

export type ComboImport =
  | { data: { id: string; missing: CardRef[]; warnings: PortableWarning[] }; error?: undefined }
  | { data?: undefined; error: PortableError };

/**
 * Liest eine Datei und legt daraus eine neue Combo an. Ein Deck wird nicht zugeordnet: Deck-IDs
 * sind lokal, der Deckname in der Datei ist nur Information.
 */
export async function comboFromPortable(userId: string, json: unknown): Promise<ComboImport> {
  const validation = fromPortable(json, () => null);
  if (validation.error) return { error: validation.error };
  // Alle Karten der Datei in einer Abfrage holen, erst über den Passcode, dann über den Namen
  const refs = cardRefsOf(json);
  const passcodes = [...new Set(refs.flatMap((r) => (r.passcode ? [r.passcode] : [])))];
  const names = [...new Set(refs.map((r) => r.name))];
  const rows = refs.length
    ? await prisma.card.findMany({
        where: { OR: [{ passcode: { in: passcodes } }, { name: { in: names } }] },
        select: CARD_SELECT,
      })
    : [];
  const byPasscode = new Map(rows.flatMap((r) => (r.passcode ? [[r.passcode, r.id]] : [])));
  const byName = new Map(rows.map((r) => [r.name, r.id]));

  const local = new Map(rows.map((r) => [r.id, toComboCard(r)]));
  const read = fromPortable(
    json,
    (ref) =>
      ref.passcode ? (byPasscode.get(ref.passcode) ?? byName.get(ref.name)) : byName.get(ref.name),
    (id) => local.get(id)
  );
  if (read.error) return { error: read.error };

  const { title, tags, status, startState, nodes, importedCards, importChecks } = read.data;
  return prisma.$transaction(async (tx) => {
    const created = await tx.combo.create({
      data: {
        title,
        userId,
        tags,
        status,
        startState: startState as unknown as Prisma.InputJsonValue,
        importedCards: importedCards as Prisma.InputJsonValue,
        importChecks: importChecks as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    await tx.comboNode.createMany({ data: nodeRows(created.id, nodes) });
    return { data: { id: created.id, missing: read.missing, warnings: read.warnings } };
  });
}
