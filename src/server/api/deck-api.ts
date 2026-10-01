import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { parseYDKFile } from '@/lib/utils/deck.utils';
import { deckIssues, sectionFor, type RuleCard, type Section } from '@/lib/deck/deck-rules';
import { idsForPasscodes, writeDeckCards } from '@/server/services/deck-store.service';
import { findCard, userNicknames } from './combo-api';
import { ApiError } from './http';

/**
 * Decks über die REST-API: anlegen aus YDK oder aus Kartenlisten (Name, Spitzname, Passcode),
 * lesen mit Regelhinweisen. Unbekannte Karten brechen ab, statt ein halbes Deck anzulegen.
 */

const cardRef = z.union([
  z.string().trim().min(1),
  z.object({
    card: z.string().trim().min(1),
    quantity: z.number().int().min(1).max(3).default(1),
  }),
]);

export const createDeckSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().max(1000).optional(),
    /** Inhalt einer YDK-Datei (EDOPro, YGOPRODeck) */
    ydk: z.string().max(20000).optional(),
    main: z.array(cardRef).max(60).optional(),
    extra: z.array(cardRef).max(15).optional(),
    side: z.array(cardRef).max(15).optional(),
  })
  .refine((b) => !(b.ydk && (b.main || b.extra || b.side)), {
    message: 'Entweder ydk oder main/extra/side angeben',
  });

type Ref = z.infer<typeof cardRef>;

/** Kartenlisten auflösen; Extra-Deck-Karten im Main Deck wandern ins Extra Deck */
async function resolveLists(userId: string, lists: Partial<Record<Section, Ref[]>>) {
  const nicknames = await userNicknames(userId);
  const cache = new Map<string, Awaited<ReturnType<typeof findCard>>>();
  const sections: Record<Section, string[]> = { MAIN: [], EXTRA: [], SIDE: [] };
  const missing: string[] = [];
  const matched: { ref: string; name: string }[] = [];
  for (const [section, refs] of Object.entries(lists) as [Section, Ref[] | undefined][]) {
    for (const ref of refs ?? []) {
      const { card: query, quantity } = typeof ref === 'string' ? { card: ref, quantity: 1 } : ref;
      if (!cache.has(query)) cache.set(query, await findCard(query, nicknames));
      const card = cache.get(query);
      if (!card) {
        missing.push(query);
        continue;
      }
      if (card.name.toLowerCase() !== query.toLowerCase() && card.id !== query)
        matched.push({ ref: query, name: card.name });
      const target = section === 'SIDE' ? 'SIDE' : sectionFor(card.type);
      for (let i = 0; i < quantity; i++) sections[target].push(card.id);
    }
  }
  return { sections, missing: [...new Set(missing)], matched };
}

export async function createDeckFromRequest(userId: string, req: z.infer<typeof createDeckSchema>) {
  let sections: Record<Section, string[]>;
  let matched: { ref: string; name: string }[] = [];
  if (req.ydk) {
    const parsed = parseYDKFile(req.ydk);
    const { map, missing } = await idsForPasscodes([
      ...parsed.main,
      ...parsed.extra,
      ...parsed.side,
    ]);
    if (missing.length)
      throw new ApiError('NOT_POSSIBLE', 'Passcodes nicht in der Kartendatenbank', { missing });
    sections = { MAIN: map(parsed.main), EXTRA: map(parsed.extra), SIDE: map(parsed.side) };
  } else {
    const resolved = await resolveLists(userId, {
      MAIN: req.main,
      EXTRA: req.extra,
      SIDE: req.side,
    });
    if (resolved.missing.length)
      throw new ApiError('NOT_POSSIBLE', 'Karten nicht gefunden', { missing: resolved.missing });
    sections = resolved.sections;
    matched = resolved.matched;
  }
  const deck = await prisma.deck.create({
    data: { name: req.name, description: req.description ?? null, userId },
    select: { id: true },
  });
  await writeDeckCards(deck.id, sections);
  return { id: deck.id, matched };
}

/** Deckliste nach Abschnitten, dazu die Regelhinweise wie auf der Deckseite */
export async function deckView(userId: string, deckId: string) {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    select: {
      id: true,
      name: true,
      format: true,
      userId: true,
      deckCards: {
        orderBy: { card: { name: 'asc' } },
        select: {
          quantity: true,
          deckSection: true,
          card: {
            select: {
              id: true,
              passcode: true,
              name: true,
              nameDe: true,
              type: true,
              banTcg: true,
            },
          },
        },
      },
    },
  });
  if (!deck || deck.userId !== userId) throw new ApiError('NOT_FOUND', 'Deck nicht gefunden');
  const section = (s: string) =>
    deck.deckCards
      .filter((c) => c.deckSection === s)
      .map(({ card: { banTcg, ...card }, quantity }) => ({
        ...card,
        quantity,
        ...(banTcg && { banTcg }),
      }));
  const entries = deck.deckCards.map((c) => ({
    cardId: c.card.id,
    quantity: c.quantity,
    section: c.deckSection as Section,
  }));
  const cards = new Map<string, RuleCard>(deck.deckCards.map((c) => [c.card.id, c.card]));
  return {
    id: deck.id,
    name: deck.name,
    format: deck.format,
    main: section('MAIN'),
    extra: section('EXTRA'),
    side: section('SIDE'),
    warnings: deckIssues(entries, cards),
  };
}
