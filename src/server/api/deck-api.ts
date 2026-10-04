import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import { parseYDKFile } from '@/lib/utils/deck.utils';
import { deckIssues, type RuleCard, type Section } from '@/lib/deck/deck-rules';
import { toIsoDate } from '@/lib/deck/banlist';
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
import { parseGame, tally } from '@/lib/deck/games';
import { STAPLES } from '@/lib/combo/reactions';
import { findCard, userBreakers, userNicknames } from './combo-api';
import {
  resolveImport,
  resolveLists,
  type ImportProblem,
} from '@/server/services/deck-import.service';
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
    /** ydke-Link, YGOPRODeck-Deck-URL, YDK-Inhalt oder eine Kartenliste wie „3 Crystal Bond“ */
    text: z.string().trim().min(1).max(50000).optional(),
    main: z.array(cardRef).max(60).optional(),
    extra: z.array(cardRef).max(15).optional(),
    side: z.array(cardRef).max(15).optional(),
  })
  .refine((b) => [b.ydk, b.text, b.main || b.extra || b.side].filter(Boolean).length <= 1, {
    message: 'Entweder ydk, text oder main/extra/side angeben',
  });

const PROBLEM: Record<ImportProblem, string> = {
  invalidYdke: 'Ungültiger ydke-Link',
  fetchFailed: 'YGOPRODeck-Seite nicht erreichbar',
  noDeckOnPage: 'Keine Deckliste auf der YGOPRODeck-Seite gefunden',
  empty: 'Keine Karten im Text erkannt',
  tooMany: 'Mehr Karten als in ein Deck passen',
};

export async function createDeckFromRequest(userId: string, req: z.infer<typeof createDeckSchema>) {
  let sections: Record<Section, string[]>;
  let matched: { ref: string; name: string }[] = [];
  if (req.text) {
    const result = await resolveImport(userId, req.text);
    if ('problem' in result) throw new ApiError('INVALID', PROBLEM[result.problem]);
    if (result.data.missing.length)
      throw new ApiError('NOT_POSSIBLE', 'Karten nicht gefunden', {
        missing: result.data.missing,
      });
    sections = result.data.sections;
    matched = result.data.matched;
  } else if (req.ydk) {
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

/**
 * Side-Pläne für die API: Karten mit Namen und je Plan die Bilanz der eingetragenen Spiele
 * (Deckbau-Plan 3.7). Rohe Zahlen, nie eine Quote, damit sieben Spiele nicht nach Statistik
 * aussehen. Eine Frage wie „welcher meiner Pläne hält nicht?“ lässt sich damit beantworten.
 */
function sidePlanViews(
  stored: unknown,
  rows: Parameters<typeof parseGame>[0][],
  cards: Map<string, RuleCard>
) {
  const plans = parseSidePlans(stored);
  const planIds = new Set(plans.map((p) => p.id));
  const games = rows.flatMap((row) => {
    const game = parseGame(row);
    return game ? [game] : [];
  });
  const named = (r: Record<string, number>) =>
    Object.entries(r).map(([id, quantity]) => ({ id, name: cards.get(id)?.name ?? id, quantity }));
  return plans.map((plan) => {
    const { win, loss, draw } = tally(games, plan, planIds);
    return {
      id: plan.id,
      matchup: plan.matchup,
      going: plan.going,
      in: named(plan.in),
      out: named(plan.out),
      record: { win, loss, draw },
    };
  });
}

/** Deckliste nach Abschnitten, dazu die Regelhinweise wie auf der Deckseite */
export async function deckView(userId: string, deckId: string) {
  const banlist = await prisma.banlist.findUnique({
    where: { key: 'current' },
    select: { name: true, effectiveOn: true, importedAt: true },
  });
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    select: {
      id: true,
      name: true,
      format: true,
      userId: true,
      roles: true,
      sidePlans: true,
      games: { orderBy: { playedAt: 'desc' } },
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
              tcgDate: true,
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
      .map(({ card: { banTcg, tcgDate, ...card }, quantity }) => ({
        ...card,
        quantity,
        ...(banTcg && { banTcg }),
        ...(!tcgDate && { ocgOnly: true }),
        ...(roles[card.id] && { role: roles[card.id] }),
      }));
  const entries = deck.deckCards.map((c) => ({
    cardId: c.card.id,
    quantity: c.quantity,
    section: c.deckSection as Section,
  }));
  const cards = new Map<string, RuleCard>(
    deck.deckCards.map((c) => [
      c.card.id,
      { ...c.card, tcgDate: c.card.tcgDate?.toISOString() ?? null },
    ])
  );
  return {
    id: deck.id,
    name: deck.name,
    format: deck.format,
    main: section('MAIN'),
    extra: section('EXTRA'),
    side: section('SIDE'),
    warnings: deckIssues(entries, cards),
    // Stand der Liste, gegen die geprüft wurde; null, solange kein Import gelaufen ist
    banlist: banlist && {
      name: banlist.name,
      effectiveOn: banlist.effectiveOn ? toIsoDate(banlist.effectiveOn) : null,
      importedAt: banlist.importedAt?.toISOString() ?? null,
    },
    sidePlans: sidePlanViews(deck.sidePlans, deck.games, cards),
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
  const breakers = await userBreakers(userId);
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
      breakers,
      roles
    ),
  };
}
