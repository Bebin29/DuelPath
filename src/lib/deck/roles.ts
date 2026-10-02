import { z } from 'zod';
import type { CardEffect } from '@/lib/cards/effects';
import { coverageOdds, handOdds } from './odds';
import { HAND_SIZE } from './hand-tester';

/**
 * Rollen im Deck (Deckbau-Plan 3.1, 3.2): eine Rolle pro Karte, damit die Rollen das Deck aufteilen
 * und die Kennzahlen exakt bleiben. Gespeichert pro Deck als Passcode → Rolle.
 */

export const ROLES = ['starter', 'extender', 'handtrap', 'breaker', 'garnet', 'other'] as const;
export type Role = (typeof ROLES)[number];
export type Roles = Record<string, Role>;
export type Going = 'first' | 'second';

export const rolesSchema = z
  .record(z.string().min(1).max(64), z.enum(ROLES))
  .refine((r) => Object.keys(r).length <= 120, 'Zu viele Rollen');

/** Liest gespeicherte Rollen; Unbekanntes fällt still heraus statt die Seite zu brechen */
export function parseRoles(value: unknown): Roles {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, r]) => ROLES.includes(r as Role))
  ) as Roles;
}

/** Bekannte Boardbreaker für den Vorschlag; Verbotenes landet ohnehin nicht im Deck */
const BREAKERS = new Set([
  'Evenly Matched',
  'Dark Ruler No More',
  'Lightning Storm',
  'Forbidden Droplet',
  'Triple Tactics Talent',
  "Harpie's Feather Duster",
  'Raigeki',
  'Cosmic Cyclone',
  'Book of Eclipse',
  'Interrupted Kaiju Slumber',
  'Super Polymerization',
]);
const isBreaker = (name: string) => BREAKERS.has(name) || / Kaiju$/.test(name);

/**
 * Rollen-Vorschläge: Starter aus 1-Card-Combos, Extender aus größeren Starthänden, Breaker aus der
 * festen Liste, Handtraps aus den Staples. Gesetzte Rollen bleiben unberührt.
 */
export function suggestRoles(
  cards: { id: string; name: string }[],
  starthands: string[][],
  staples: Set<string>,
  roles: Roles
): Roles {
  const starters = new Set(starthands.filter((h) => new Set(h).size === 1).map((h) => h[0]));
  const extenders = new Set(starthands.filter((h) => new Set(h).size > 1).flat());
  const out: Roles = {};
  for (const { id, name } of cards) {
    if (roles[id]) continue;
    const role: Role | null = starters.has(id)
      ? 'starter'
      : extenders.has(id)
        ? 'extender'
        : isBreaker(name)
          ? 'breaker'
          : staples.has(id)
            ? 'handtrap'
            : null;
    if (role) out[id] = role;
  }
  return out;
}

/** Hartes Once per Turn: eine zweite Kopie auf der Hand bringt nichts */
export const isHardOpt = (effects: CardEffect[]) => effects.some((e) => e.opt?.kind === 'HARD');

export const TIERS = ['brick', 'playable', 'good', 'great'] as const;
export type Tier = (typeof TIERS)[number];
export const METRICS = {
  first: ['starter', 'starterHandtrap', 'brick', 'garnet'],
  second: ['starter', 'starterBreaker', 'brick', 'garnet'],
} as const;
export type Metric = (typeof METRICS)[Going][number];

export interface RoleCard {
  quantity: number;
  role: Role;
  hardOpt: boolean;
}

/** Was zählt in der Hand: Rollen ohne Garnet und Sonstige zählen OPT-Duplikate einmal */
const DEDUP: Role[] = ['starter', 'extender', 'handtrap', 'breaker'];

type Counted = Record<Role, number>;

function tierOf(h: Counted, going: Going): Tier {
  const s = h.starter;
  if (going === 'first') {
    // Ein zweiter, anderer Starter verlängert wie ein Extender
    const e = h.extender + Math.max(0, s - 1);
    if (s === 0) return 'brick';
    if (e >= 1 && h.handtrap >= 1) return 'great';
    return e >= 1 || h.handtrap >= 1 ? 'good' : 'playable';
  }
  const b = h.breaker;
  if (s === 0 && b < 2) return 'brick';
  if (s >= 1 && b >= 2) return 'great';
  return s >= 1 && b >= 1 ? 'good' : 'playable';
}

const METRIC_TEST: Record<Metric, (h: Counted, going: Going) => boolean> = {
  starter: (h) => h.starter >= 1,
  starterHandtrap: (h) => h.starter >= 1 && h.handtrap >= 1,
  starterBreaker: (h) => h.starter >= 1 && h.breaker >= 1,
  brick: (h, going) => tierOf(h, going) === 'brick',
  garnet: (h) => h.garnet >= 1,
};

export interface RoleOdds {
  /** Anteil der Hände je Stufe, zusammen 1 */
  tiers: Record<Tier, number>;
  /** Kennzahlen der Zugfolge in fester Reihenfolge (METRICS) */
  metrics: { key: Metric; value: number }[];
}

/**
 * Kennzahlen über die Rollen. Karten einer Rolle bilden eine Klasse; nur Karten mit hartem OPT
 * und mehreren Kopien bekommen eine eigene Klasse, weil von ihnen nur eine Kopie zählt.
 */
export function roleOdds(cards: RoleCard[], size: number, going: Going): RoleOdds {
  const classes: { role: Role; dedup: boolean; count: number }[] = ROLES.map((role) => ({
    role,
    dedup: false,
    count: 0,
  }));
  for (const c of cards) {
    if (c.quantity <= 0) continue;
    if (c.hardOpt && c.quantity > 1 && DEDUP.includes(c.role))
      classes.push({ role: c.role, dedup: true, count: c.quantity });
    else classes[ROLES.indexOf(c.role)].count += c.quantity;
  }
  const counted = (drawn: number[]) => {
    const h = Object.fromEntries(ROLES.map((r) => [r, 0])) as Counted;
    classes.forEach((c, i) => (h[c.role] += c.dedup ? Math.min(1, drawn[i]) : drawn[i]));
    return h;
  };
  const metrics = METRICS[going];
  const odds = handOdds(
    classes.map((c) => c.count),
    size,
    [
      ...TIERS.map((tier) => (d: number[]) => tierOf(counted(d), going) === tier),
      ...metrics.map((m) => (d: number[]) => METRIC_TEST[m](counted(d), going)),
    ]
  );
  return {
    tiers: Object.fromEntries(TIERS.map((t, i) => [t, odds[i]])) as Record<Tier, number>,
    metrics: metrics.map((key, i) => ({ key, value: odds[TIERS.length + i] })),
  };
}

/** Kennzahlen und Abdeckung eines Main Decks, für Deckseite und API gleich */
export function deckRatios(
  counts: Map<string, number>,
  info: (cardId: string) => { role: Role; hardOpt: boolean },
  starthands: string[][],
  going: Going
) {
  const size = HAND_SIZE[going];
  return {
    roles: roleOdds(
      [...counts].map(([id, quantity]) => ({ quantity, ...info(id) })),
      size,
      going
    ),
    coverage: coverageOdds(counts, starthands, size),
  };
}
