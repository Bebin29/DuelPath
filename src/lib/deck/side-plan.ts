import { z } from 'zod';
import type { Going } from './roles';

/**
 * Side-Plan (Deckbau-Plan 3.6): je Matchup und Zugfolge, welche Karten aus dem Side Deck rein und
 * welche aus dem Main Deck raus gehen. Gespeichert am Deck, Karten als Passcode → Anzahl.
 */

export interface SidePlan {
  id: string;
  matchup: string;
  going: Going;
  in: Record<string, number>;
  out: Record<string, number>;
}

const counts = z.record(z.string().min(1).max(64), z.number().int().min(1).max(3));
export const sidePlansSchema = z
  .array(
    z.object({
      id: z.string().min(1).max(64),
      matchup: z.string().trim().max(60),
      going: z.enum(['first', 'second']),
      in: counts,
      out: counts,
    })
  )
  .max(40);

/** Liest gespeicherte Pläne; ein kaputter Eintrag bricht nicht die ganze Seite */
export function parseSidePlans(value: unknown): SidePlan[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((p) => {
    const parsed = sidePlansSchema.element.safeParse(p);
    return parsed.success ? [parsed.data] : [];
  });
}

interface Entry {
  cardId: string;
  quantity: number;
  section: 'MAIN' | 'EXTRA' | 'SIDE';
}

const total = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

export type SideIssue =
  | { kind: 'unbalanced'; in: number; out: number }
  | { kind: 'notInSide'; cardId: string }
  | { kind: 'notInMain'; cardId: string };

/**
 * Main Deck nach dem Siden. Rein geht höchstens, was im Side Deck liegt, raus höchstens, was im
 * Main Deck liegt; alles darüber steht in den Hinweisen statt still verrechnet zu werden.
 */
export function applySidePlan(entries: Entry[], plan: SidePlan) {
  const main = new Map<string, number>();
  const side = new Map<string, number>();
  for (const e of entries) {
    const target = e.section === 'MAIN' ? main : e.section === 'SIDE' ? side : null;
    target?.set(e.cardId, (target.get(e.cardId) ?? 0) + e.quantity);
  }
  const issues: SideIssue[] = [];
  const after = new Map(main);
  for (const [id, n] of Object.entries(plan.out)) {
    if ((main.get(id) ?? 0) < n) issues.push({ kind: 'notInMain', cardId: id });
    const left = Math.max(0, (after.get(id) ?? 0) - n);
    if (left) after.set(id, left);
    else after.delete(id);
  }
  for (const [id, n] of Object.entries(plan.in)) {
    if ((side.get(id) ?? 0) < n) issues.push({ kind: 'notInSide', cardId: id });
    after.set(id, (after.get(id) ?? 0) + Math.min(n, side.get(id) ?? 0));
  }
  const inCount = total(plan.in);
  const outCount = total(plan.out);
  if (inCount !== outCount) issues.unshift({ kind: 'unbalanced', in: inCount, out: outCount });
  return { main: after, issues };
}

/** Anzahl in einem Plan ändern, 0 entfernt die Karte */
export function adjustPlan(
  plan: SidePlan,
  key: 'in' | 'out',
  cardId: string,
  delta: number,
  max: number
): SidePlan {
  const n = Math.max(0, Math.min(max, (plan[key][cardId] ?? 0) + delta));
  const next = { ...plan[key] };
  if (n) next[cardId] = n;
  else delete next[cardId];
  return { ...plan, [key]: next };
}

export interface DeckDiff {
  cardId: string;
  section: Entry['section'];
  delta: number;
}

/** Was sich zwischen zwei Ständen geändert hat, je Bereich und Karte, Zugänge zuerst */
export function diffEntries(before: Entry[], after: Entry[]): DeckDiff[] {
  const key = (e: Entry) => `${e.section}:${e.cardId}`;
  const map = new Map<string, DeckDiff>();
  for (const e of before)
    map.set(key(e), { cardId: e.cardId, section: e.section, delta: -e.quantity });
  for (const e of after) {
    const d = map.get(key(e)) ?? { cardId: e.cardId, section: e.section, delta: 0 };
    map.set(key(e), { ...d, delta: d.delta + e.quantity });
  }
  return [...map.values()].filter((d) => d.delta !== 0).sort((a, b) => b.delta - a.delta);
}
