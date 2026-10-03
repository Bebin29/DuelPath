'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';
import {
  BAN_STATUS,
  fromIsoDate,
  isBanStatus,
  toIsoDate,
  type BanStatus,
  type BanlistKey,
  type BanlistView,
  type Banlists,
} from '@/lib/deck/banlist';

type Result<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

async function userId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

const toView = (list: {
  key: string;
  name: string;
  effectiveOn: Date | null;
  importedAt?: Date | null;
  cards: { cardId: string; status: string }[];
}): BanlistView => ({
  key: list.key === 'current' ? 'current' : 'next',
  name: list.name,
  effectiveOn: list.effectiveOn ? toIsoDate(list.effectiveOn) : null,
  importedAt: list.importedAt?.toISOString() ?? null,
  changes: Object.fromEntries(
    list.cards.filter((c) => isBanStatus(c.status)).map((c) => [c.cardId, c.status as BanStatus])
  ),
});

/**
 * Beide Listen für den Deck-Check. `current` fehlt, solange kein Import gelaufen
 * ist; `next` fehlt, solange niemand eine nächste Liste angelegt hat.
 */
export async function getBanlists(): Promise<Banlists> {
  const uid = await userId();
  const nextKey = uid ? `next:${uid}` : null;
  const lists = await prisma.banlist.findMany({
    where: { key: { in: ['current', ...(nextKey ? [nextKey] : [])] } },
    select: {
      key: true,
      name: true,
      effectiveOn: true,
      importedAt: true,
      cards: { select: { cardId: true, status: true } },
    },
  });
  const find = (key: BanlistKey) => lists.find((l) => l.key === key);
  const current = find('current');
  const next = lists.find((l) => l.key === nextKey);
  return {
    current: current ? toView(current) : null,
    next: next ? toView(next) : null,
  };
}

/** Karten einer Liste mit Namen und Bild, für die Pflege in den Einstellungen */
export interface BanlistCardView {
  cardId: string;
  name: string;
  nameDe: string | null;
  imageSmall: string | null;
  /** Stand auf der aktuellen Liste, zum Vergleich */
  banTcg: string | null;
  status: BanStatus;
}

export async function getNextBanlistCards(): Promise<Result<BanlistCardView[]>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  const cards = await prisma.banlistCard.findMany({
    where: { banlist: { key: `next:${uid}` } },
    orderBy: { card: { name: 'asc' } },
    select: {
      cardId: true,
      status: true,
      card: { select: { name: true, nameDe: true, imageSmall: true, banTcg: true } },
    },
  });
  return {
    data: cards
      .filter((c) => isBanStatus(c.status))
      .map((c) => ({
        cardId: c.cardId,
        name: c.card.name,
        nameDe: c.card.nameDe,
        imageSmall: c.card.imageSmall,
        banTcg: c.card.banTcg,
        status: c.status as BanStatus,
      })),
  };
}

const isoDate = z.string().refine((v) => fromIsoDate(v) !== null, 'Ungültiges Datum');

const nextSchema = z.object({
  name: z.string().trim().min(1).max(60),
  effectiveOn: isoDate,
  changes: z
    .array(z.object({ cardId: z.string().min(1).max(64), status: z.enum(BAN_STATUS) }))
    .max(300),
});

/**
 * Legt die nächste Liste an oder schreibt sie neu. Die Karten ersetzen den
 * bisherigen Stand, damit entfernte Einträge auch wirklich verschwinden.
 */
export async function saveNextBanlist(input: z.input<typeof nextSchema>): Promise<Result<true>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  const parsed = nextSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Ungültige Liste' };
  const { name, effectiveOn, changes } = parsed.data;
  if (new Set(changes.map((c) => c.cardId)).size !== changes.length)
    return { error: 'Eine Karte darf nur einmal in der Liste stehen' };

  // Nur Karten, die es wirklich gibt; ein unbekannter Passcode würde sonst die Transaktion werfen
  const known = await prisma.card.findMany({
    where: { id: { in: changes.map((c) => c.cardId) } },
    select: { id: true },
  });
  const knownIds = new Set(known.map((c) => c.id));
  if (changes.some((c) => !knownIds.has(c.cardId))) return { error: 'Unbekannte Karte' };
  const cards = changes;

  const date = fromIsoDate(effectiveOn)!;
  await prisma.$transaction(async (tx) => {
    const list = await tx.banlist.upsert({
      where: { key: `next:${uid}` },
      create: { key: `next:${uid}`, name, effectiveOn: date },
      update: { name, effectiveOn: date },
      select: { id: true },
    });
    await tx.banlistCard.deleteMany({ where: { banlistId: list.id } });
    if (cards.length > 0)
      await tx.banlistCard.createMany({
        data: cards.map((c) => ({ banlistId: list.id, cardId: c.cardId, status: c.status })),
      });
  });
  return { data: true };
}

export async function deleteNextBanlist(): Promise<Result<true>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  await prisma.banlist.deleteMany({ where: { key: `next:${uid}` } });
  return { data: true };
}

/** Stand der aktuellen Liste nachtragen, wenn er nicht zum Importdatum passt */
export async function setCurrentBanlistDate(effectiveOn: string): Promise<Result<true>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  const date = typeof effectiveOn === 'string' ? fromIsoDate(effectiveOn) : null;
  if (!date) return { error: 'Ungültiges Datum' };
  await prisma.banlist.upsert({
    where: { key: 'current' },
    create: { key: 'current', name: 'TCG', effectiveOn: date },
    update: { effectiveOn: date },
  });
  return { data: true };
}
