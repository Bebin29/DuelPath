import { z } from 'zod';
import type { Going } from './roles';
import type { SidePlan } from './side-plan';

/**
 * Spielprotokoll am Deck (Deckbau-Plan 3.7): von Hand eingetragen, damit ein Side-Plan nicht
 * für immer eine unkorrigierte Vermutung bleibt. Eine Zeile ist ein Spiel, kein Match; die App
 * zählt nur, wie es ausging, und rechnet daraus nichts aus.
 */

export const GAME_RESULTS = ['win', 'loss', 'draw'] as const;
export type GameResult = (typeof GAME_RESULTS)[number];
export const isGameResult = (v: unknown): v is GameResult => GAME_RESULTS.includes(v as GameResult);

/** Höchstlänge der Notiz; mehr als ein Satz gehört nicht in ein Protokoll */
export const NOTE_MAX = 280;

export interface DeckGame {
  id: string;
  /** Side-Plan, der anlag; null = ohne Plan gespielt */
  sidePlanId: string | null;
  matchup: string;
  going: Going;
  result: GameResult;
  note: string | null;
  playedAt: string;
}

/** Was beim Eintragen aus dem Browser kommt; Id und Zeitpunkt setzt der Server */
export const gameInputSchema = z.object({
  sidePlanId: z.string().min(1).max(64).nullable(),
  matchup: z.string().trim().max(60),
  going: z.enum(['first', 'second']),
  result: z.enum(GAME_RESULTS),
  note: z
    .string()
    .trim()
    .max(NOTE_MAX)
    .nullable()
    .transform((n) => n || null),
});
export type GameInput = z.infer<typeof gameInputSchema>;

/** Liest eine Zeile aus der Datenbank; ein kaputter Eintrag fällt still heraus */
export function parseGame(row: {
  id: string;
  sidePlanId: string | null;
  matchup: string;
  going: string;
  result: string;
  note: string | null;
  playedAt: Date;
}): DeckGame | null {
  if (!isGameResult(row.result)) return null;
  if (row.going !== 'first' && row.going !== 'second') return null;
  return {
    id: row.id,
    sidePlanId: row.sidePlanId,
    matchup: row.matchup,
    going: row.going,
    result: row.result,
    note: row.note,
    playedAt: row.playedAt.toISOString(),
  };
}

export interface Tally {
  win: number;
  loss: number;
  draw: number;
  total: number;
}

/** Only an explicit reference to a currently existing plan belongs to its record. */
export function belongsTo(game: DeckGame, plan: SidePlan, planIds: Set<string>): boolean {
  return game.sidePlanId === plan.id && planIds.has(plan.id);
}

/** Preserve historical entries but remove unavailable plan references from the read view. */
export function gamesForPlans(games: DeckGame[], plans: SidePlan[]): DeckGame[] {
  const ids = new Set(plans.map((p) => p.id));
  return games.map((g) =>
    g.sidePlanId && !ids.has(g.sidePlanId) ? { ...g, sidePlanId: null } : g
  );
}

/** Bilanz eines Plans: rohe Zahlen, nie eine Quote (Deckbau-Plan 7) */
export function tally(games: DeckGame[], plan: SidePlan, planIds: Set<string>): Tally {
  const t: Tally = { win: 0, loss: 0, draw: 0, total: 0 };
  for (const g of games) {
    if (!belongsTo(g, plan, planIds)) continue;
    t[g.result] += 1;
    t.total += 1;
  }
  return t;
}

/** Bilanz eines ganzen Decks aus gezählten Ergebnissen; unbekannte Ergebnisse zählen nicht */
export function record(counts: { result: string; count: number }[]): Tally {
  const t: Tally = { win: 0, loss: 0, draw: 0, total: 0 };
  for (const { result, count } of counts) {
    if (!isGameResult(result)) continue;
    t[result] += count;
    t.total += count;
  }
  return t;
}

/** Matchups, die am Deck schon vorkommen, als Vorschläge beim Eintragen */
export function knownMatchups(plans: SidePlan[], games: DeckGame[]): string[] {
  const seen = new Map<string, string>();
  for (const name of [...plans.map((p) => p.matchup), ...games.map((g) => g.matchup)]) {
    const key = name.trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, name.trim());
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
