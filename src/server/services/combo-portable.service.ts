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
} from '@/lib/combo/portable';
import { cardIdsOf, nodeFromRow } from '@/server/services/combo-store.service';

/**
 * Combos als JSON-Datei sichern und wieder einlesen (DUE-44). Browser (Server Actions) und
 * REST-API nutzen denselben Weg. Der Import legt immer eine neue Combo an und schreibt nie in eine
 * bestehende; Karten, die der lokale Bestand nicht kennt, werden gemeldet, der Rest kommt mit.
 */

const CARD_REF_SELECT = { id: true, name: true, passcode: true } as const;

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
  const nodes = rows.map(nodeFromRow);
  const startState = combo.startState as unknown as StartState;
  const cards = await prisma.card.findMany({
    where: { id: { in: [...cardIdsOf(startState, nodes)] } },
    select: CARD_REF_SELECT,
  });
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
    (id) => byId.get(id)
  );
}

export type ComboImport =
  | { data: { id: string; missing: CardRef[] }; error?: undefined }
  | { data?: undefined; error: PortableError };

/**
 * Liest eine Datei und legt daraus eine neue Combo an. Ein Deck wird nicht zugeordnet: Deck-IDs
 * sind lokal, der Deckname in der Datei ist nur Information.
 */
export async function comboFromPortable(userId: string, json: unknown): Promise<ComboImport> {
  // Alle Karten der Datei in einer Abfrage holen, erst über den Passcode, dann über den Namen
  const refs = cardRefsOf(json);
  const passcodes = [...new Set(refs.flatMap((r) => (r.passcode ? [r.passcode] : [])))];
  const names = [...new Set(refs.map((r) => r.name))];
  const rows = refs.length
    ? await prisma.card.findMany({
        where: { OR: [{ passcode: { in: passcodes } }, { name: { in: names } }] },
        select: CARD_REF_SELECT,
      })
    : [];
  const byPasscode = new Map(rows.flatMap((r) => (r.passcode ? [[r.passcode, r.id]] : [])));
  const byName = new Map(rows.map((r) => [r.name, r.id]));

  const read = fromPortable(json, (ref) =>
    ref.passcode ? (byPasscode.get(ref.passcode) ?? byName.get(ref.name)) : byName.get(ref.name)
  );
  if (read.error) return { error: read.error };

  const { title, tags, status, startState, nodes } = read.data;
  const created = await prisma.combo.create({
    data: {
      title,
      userId,
      tags,
      status,
      startState: startState as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  await prisma.comboNode.createMany({ data: nodeRows(created.id, nodes) });
  return { data: { id: created.id, missing: read.missing } };
}
