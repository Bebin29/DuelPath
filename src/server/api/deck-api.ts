import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { parseYDKFile } from '@/lib/utils/deck.utils';
import { deckIssues, sectionFor, type RuleCard, type Section } from '@/lib/deck/deck-rules';
import { idsForPasscodes, writeDeckCards } from '@/server/services/deck-store.service';
import { effectsOf } from '@/lib/cards/effect-override';
import {
  ROLES,
  deckRatios,
  isHardOpt,
  parseRoles,
  rolesSchema,
  suggestRoles,
  type Going,
} from '@/lib/deck/roles';
import { loadLibrary } from '@/server/services/library.service';
import { applySidePlan, parseSidePlans } from '@/lib/deck/side-plan';
import { STAPLES } from '@/lib/combo/reactions';
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
      roles: true,
      sidePlans: true,
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
  const roles = parseRoles(deck.roles);
  const section = (s: string) =>
    deck.deckCards
      .filter((c) => c.deckSection === s)
      .map(({ card: { banTcg, ...card }, quantity }) => ({
        ...card,
        quantity,
        ...(banTcg && { banTcg }),
        ...(roles[card.id] && { role: roles[card.id] }),
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
    sidePlans: parseSidePlans(deck.sidePlans).map(({ in: inCards, out, ...plan }) => {
      const named = (r: Record<string, number>) =>
        Object.entries(r).map(([id, quantity]) => ({
          id,
          name: cards.get(id)?.name ?? id,
          quantity,
        }));
      return { ...plan, in: named(inCards), out: named(out) };
    }),
  };
}

async function ownDeck(userId: string, deckId: string) {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    select: {
      userId: true,
      roles: true,
      sidePlans: true,
      deckCards: {
        select: {
          quantity: true,
          deckSection: true,
          card: { select: { id: true, name: true, effects: true, effectsOverride: true } },
        },
      },
    },
  });
  if (!deck || deck.userId !== userId) throw new ApiError('NOT_FOUND', 'Deck nicht gefunden');
  return deck;
}

export const rolesPatchSchema = z.object({
  roles: z.record(z.string().min(1), z.enum(ROLES).nullable()),
});

/** Rollen setzen (Name, Spitzname oder Passcode → Rolle), null nimmt eine Rolle zurück */
export async function patchRoles(
  userId: string,
  deckId: string,
  req: z.infer<typeof rolesPatchSchema>
) {
  const deck = await ownDeck(userId, deckId);
  const nicknames = await userNicknames(userId);
  const inDeck = new Set(deck.deckCards.map((c) => c.card.id));
  const roles = parseRoles(deck.roles);
  const missing: string[] = [];
  for (const [ref, role] of Object.entries(req.roles)) {
    const card = await findCard(ref, nicknames);
    if (!card || !inDeck.has(card.id)) {
      missing.push(ref);
      continue;
    }
    if (role) roles[card.id] = role;
    else delete roles[card.id];
  }
  if (missing.length) throw new ApiError('NOT_POSSIBLE', 'Karten nicht im Deck', { missing });
  await prisma.deck.update({ where: { id: deckId }, data: { roles: rolesSchema.parse(roles) } });
  return deckView(userId, deckId);
}

const pct = (v: number) => Math.round(v * 1000) / 10;

/**
 * Kennzahlen wie im Tab Ratios: Stufen, Wahrscheinlichkeiten, Abdeckung durch die eigenen Combos,
 * Grenznutzen je Karte und die günstigsten Kürzungen. Werte in Prozent mit einer Nachkommastelle.
 */
export async function deckOdds(
  userId: string,
  deckId: string,
  query: { going?: Going; matchup?: string }
) {
  const deck = await ownDeck(userId, deckId);
  const library = await loadLibrary(userId, deckId);
  const roles = parseRoles(deck.roles);
  const main = deck.deckCards.filter((c) => c.deckSection === 'MAIN');
  let counts = new Map<string, number>();
  for (const c of main) counts.set(c.card.id, (counts.get(c.card.id) ?? 0) + c.quantity);
  // Mit Matchup: Main Deck nach dem Side-Plan, Zugfolge aus dem Plan
  const plan = query.matchup
    ? parseSidePlans(deck.sidePlans).find(
        (p) =>
          p.matchup.toLowerCase() === query.matchup!.toLowerCase() &&
          (!query.going || p.going === query.going)
      )
    : undefined;
  if (query.matchup && !plan) throw new ApiError('NOT_FOUND', 'Kein Side-Plan für dieses Matchup');
  const sided = plan
    ? applySidePlan(
        deck.deckCards.map((c) => ({
          cardId: c.card.id,
          quantity: c.quantity,
          section: c.deckSection as Section,
        })),
        plan
      )
    : null;
  if (sided) counts = sided.main;
  const going = plan?.going ?? query.going ?? 'first';
  const byId = new Map(deck.deckCards.map((c) => [c.card.id, c.card]));
  const starthands = library.entries.map((e) => e.stats.required);
  const { roles: odds, coverage } = deckRatios(
    counts,
    (id) => ({ role: roles[id] ?? 'other', hardOpt: isHardOpt(effectsOf(byId.get(id)!)) }),
    starthands,
    going
  );
  const name = (id: string) => byId.get(id)?.name ?? id;
  const hasCombos = coverage.card.size > 0;
  const staples = new Set(STAPLES.map((s) => s.name));
  return {
    going,
    ...(plan && { matchup: plan.matchup, sideIssues: sided!.issues }),
    tiers: Object.fromEntries(Object.entries(odds.tiers).map(([k, v]) => [k, pct(v)])),
    metrics: Object.fromEntries(odds.metrics.map((m) => [m.key, pct(m.value)])),
    coverage: hasCombos ? pct(coverage.base) : null,
    combos: library.entries.length,
    cards: [...counts].map(([id, quantity]) => {
      const m = coverage.card.get(id) ?? coverage.rest;
      return {
        id,
        name: name(id),
        quantity,
        role: roles[id] ?? 'other',
        ...(hasCombos && {
          ...(m.plus !== undefined && { plus: pct(m.plus - coverage.base) }),
          ...(m.minus !== undefined && { minus: pct(m.minus - coverage.base) }),
        }),
      };
    }),
    cut: [...coverage.card]
      .filter(([, m]) => m.minus !== undefined)
      .map(([id, m]) => ({ id, name: name(id), minus: pct(m.minus! - coverage.base) }))
      .sort((a, b) => b.minus - a.minus)
      .slice(0, 3),
    suggested: suggestRoles(
      [...counts.keys()].map((id) => ({ id, name: name(id) })),
      starthands,
      new Set([...counts.keys()].filter((id) => staples.has(name(id)))),
      roles
    ),
  };
}
