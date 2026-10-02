'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';
import { toComboCard, type ComboCard } from '@/lib/combo/cards';
import { deckCounts } from '@/lib/deck/deck-check';
import { parseRoles, rolesSchema, type Roles } from '@/lib/deck/roles';
import { parseSidePlans, sidePlansSchema, type SidePlan } from '@/lib/deck/side-plan';
import type { Prisma } from '@/generated/prisma/client';

type Result<T> = { data: T; error?: undefined } | { data?: undefined; error: string };
export type DeckSection = 'MAIN' | 'EXTRA' | 'SIDE';

export interface DeckViewCard extends ComboCard {
  banTcg: string | null;
  passcode: string | null;
  archetype: string | null;
}

export interface DeckViewEntry {
  cardId: string;
  quantity: number;
  section: DeckSection;
}

export interface DeckSummary {
  id: string;
  name: string;
  main: number;
  extra: number;
  side: number;
  combos: number;
  cover: (string | null)[];
  updatedAt: string;
}

const CARD_SELECT = {
  id: true,
  name: true,
  nameDe: true,
  type: true,
  race: true,
  imageSmall: true,
  effects: true,
  effectsOverride: true,
  linkMarkers: true,
  banTcg: true,
  passcode: true,
  archetype: true,
} as const;

async function userId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Deckübersicht (UI-Plan 7.5.4): Anzahl je Bereich, Combos und drei Artworks als Erkennung */
export async function listDeckSummaries(): Promise<Result<DeckSummary[]>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  const decks = await prisma.deck.findMany({
    where: { userId: uid },
    orderBy: { updatedAt: 'desc' },
    include: {
      deckCards: { include: { card: { select: { imageSmall: true } } } },
      _count: { select: { combos: true } },
    },
  });
  const count = (cards: (typeof decks)[number]['deckCards'], section: DeckSection) =>
    cards.filter((c) => c.deckSection === section).reduce((n, c) => n + c.quantity, 0);
  return {
    data: decks.map((d) => ({
      id: d.id,
      name: d.name,
      main: count(d.deckCards, 'MAIN'),
      extra: count(d.deckCards, 'EXTRA'),
      side: count(d.deckCards, 'SIDE'),
      combos: d._count.combos,
      cover: d.deckCards
        .filter((c) => c.deckSection === 'MAIN')
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 3)
        .map((c) => c.card.imageSmall),
      updatedAt: d.updatedAt.toISOString(),
    })),
  };
}

const entriesSchema = z
  .array(
    z.object({
      cardId: z.string().min(1).max(64),
      quantity: z.number().int().min(1).max(3),
      section: z.enum(['MAIN', 'EXTRA', 'SIDE']),
    })
  )
  .max(120);

export interface DeckVersionView {
  id: string;
  name: string;
  entries: DeckViewEntry[];
  roles: Roles;
  createdAt: string;
}

const toViewCard = (card: Prisma.CardGetPayload<{ select: typeof CARD_SELECT }>) => ({
  ...toComboCard(card),
  banTcg: card.banTcg,
  passcode: card.passcode,
  archetype: card.archetype,
});

const toVersion = (v: {
  id: string;
  name: string;
  entries: unknown;
  roles: unknown;
  createdAt: Date;
}): DeckVersionView => {
  const entries = entriesSchema.safeParse(v.entries);
  return {
    id: v.id,
    name: v.name,
    entries: entries.success ? entries.data : [],
    roles: parseRoles(v.roles),
    createdAt: v.createdAt.toISOString(),
  };
};

export async function getDeckView(deckId: string): Promise<
  Result<{
    id: string;
    name: string;
    entries: DeckViewEntry[];
    /** Karten des Decks und seiner Versionen */
    cards: DeckViewCard[];
    roles: Roles;
    sidePlans: SidePlan[];
    versions: DeckVersionView[];
  }>
> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      deckCards: { include: { card: { select: CARD_SELECT } } },
      versions: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!deck || deck.userId !== uid) return { error: 'Not found' };
  const versions = deck.versions.map(toVersion);
  // Karten, die nur noch in einer Version stehen, braucht der Vergleich trotzdem
  const known = new Set(deck.deckCards.map((dc) => dc.cardId));
  const extra = [
    ...new Set(
      versions.flatMap((v) => v.entries.map((e) => e.cardId)).filter((id) => !known.has(id))
    ),
  ];
  const old = extra.length
    ? await prisma.card.findMany({ where: { id: { in: extra } }, select: CARD_SELECT })
    : [];
  return {
    data: {
      id: deck.id,
      name: deck.name,
      roles: parseRoles(deck.roles),
      sidePlans: parseSidePlans(deck.sidePlans),
      versions,
      entries: deck.deckCards.map((dc) => ({
        cardId: dc.cardId,
        quantity: dc.quantity,
        section: dc.deckSection as DeckSection,
      })),
      cards: [...deck.deckCards.map((dc) => toViewCard(dc.card)), ...old.map(toViewCard)],
    },
  };
}

/** Jetzigen Stand als Version sichern (Deckbau-Plan 3.5) */
export async function createDeckVersion(
  deckId: string,
  /** createdAt nur beim Zurückholen einer gelöschten Version */
  input: { name: string; entries: DeckViewEntry[]; roles: Roles; createdAt?: string }
): Promise<Result<DeckVersionView>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  const deck = await prisma.deck.findUnique({ where: { id: deckId }, select: { userId: true } });
  if (!deck || deck.userId !== uid) return { error: 'Not found' };
  const entries = entriesSchema.safeParse(input.entries);
  const roles = rolesSchema.safeParse(input.roles);
  const name = input.name.trim().slice(0, 60);
  if (!entries.success || !roles.success || !name) return { error: 'Ungültige Version' };
  const createdAt = input.createdAt ? new Date(input.createdAt) : undefined;
  if (createdAt && Number.isNaN(createdAt.getTime())) return { error: 'Ungültiges Datum' };
  const version = await prisma.deckVersion.create({
    data: {
      deckId,
      name,
      entries: entries.data,
      roles: roles.data,
      ...(createdAt && { createdAt }),
    },
  });
  return { data: toVersion(version) };
}

export async function deleteDeckVersion(versionId: string): Promise<Result<true>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  const version = await prisma.deckVersion.findUnique({
    where: { id: versionId },
    select: { deck: { select: { userId: true } } },
  });
  if (!version || version.deck.userId !== uid) return { error: 'Not found' };
  await prisma.deckVersion.delete({ where: { id: versionId } });
  return { data: true };
}

/** Karte für die Deckseite nachladen, etwa nach dem Hinzufügen aus der Suche */
export async function getDeckCard(cardId: string): Promise<Result<DeckViewCard>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  const card = await prisma.card.findUnique({ where: { id: cardId }, select: CARD_SELECT });
  if (!card) return { error: 'Not found' };
  return { data: toViewCard(card) };
}

/**
 * Speichert das ganze Deck auf einmal (Autosave der Deckseite, Rückgängig nach YDK-Import).
 * Regeln wie 40 bis 60 Karten oder die Banlist prüft die Seite als Hinweis, nicht hier.
 */
export async function saveDeck(
  deckId: string,
  input: { name?: string; entries: DeckViewEntry[]; roles?: Roles; sidePlans?: SidePlan[] }
): Promise<Result<true>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  const deck = await prisma.deck.findUnique({ where: { id: deckId }, select: { userId: true } });
  if (!deck || deck.userId !== uid) return { error: 'Not found' };
  const parsed = entriesSchema.safeParse(input.entries);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Ungültiges Deck' };
  const roles = rolesSchema.optional().safeParse(input.roles);
  if (!roles.success) return { error: 'Ungültige Rollen' };
  const sidePlans = sidePlansSchema.optional().safeParse(input.sidePlans);
  if (!sidePlans.success) return { error: 'Ungültiger Side-Plan' };
  const name = input.name?.trim().slice(0, 100);

  // Doppelte Einträge je Bereich zusammenfassen, höchstens drei Kopien
  const merged = new Map<string, DeckViewEntry>();
  for (const e of parsed.data) {
    const key = `${e.section}:${e.cardId}`;
    const prev = merged.get(key);
    merged.set(key, { ...e, quantity: Math.min(3, (prev?.quantity ?? 0) + e.quantity) });
  }
  await prisma.$transaction([
    prisma.deckCard.deleteMany({ where: { deckId } }),
    prisma.deckCard.createMany({
      data: [...merged.values()].map((e) => ({
        deckId,
        cardId: e.cardId,
        quantity: e.quantity,
        deckSection: e.section,
      })),
    }),
    prisma.deck.update({
      where: { id: deckId },
      data: {
        updatedAt: new Date(),
        ...(name && { name }),
        ...(sidePlans.data && { sidePlans: sidePlans.data }),
        // Nur Rollen von Karten, die im Deck liegen
        ...(roles.data && {
          roles: Object.fromEntries(
            Object.entries(roles.data).filter(([id]) => parsed.data.some((e) => e.cardId === id))
          ),
        }),
      },
    }),
  ]);
  return { data: true };
}

/** Kopien je Karte in Main und Extra Deck, für den Deck-Abgleich in der Workbench */
export async function getDeckCounts(deckId: string): Promise<Result<Record<string, number>>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    select: {
      userId: true,
      deckCards: { select: { cardId: true, quantity: true, deckSection: true } },
    },
  });
  if (!deck || deck.userId !== uid) return { error: 'Not found' };
  return { data: Object.fromEntries(deckCounts(deck.deckCards)) };
}
