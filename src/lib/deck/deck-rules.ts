/**
 * Deckregeln als Hinweise (UX-Plan 4.6: die App verbietet nichts, sie sagt es):
 * Größen der Bereiche, höchstens drei Kopien und die TCG-Banlist.
 */

export type Section = 'MAIN' | 'EXTRA' | 'SIDE';

export interface RuleEntry {
  cardId: string;
  quantity: number;
  section: Section;
}

export interface RuleCard {
  name: string;
  type: string;
  banTcg: string | null;
}

export type DeckIssue =
  | { kind: 'mainSize'; count: number }
  | { kind: 'extraSize'; count: number }
  | { kind: 'sideSize'; count: number }
  | { kind: 'copies'; name: string; count: number }
  | { kind: 'banlist'; name: string; count: number; limit: number }
  | { kind: 'wrongSection'; name: string; section: Section };

const EXTRA_TYPE = /Fusion|Synchro|XYZ|Link/;
const LIMIT: Record<string, number> = { Forbidden: 0, Limited: 1, 'Semi-Limited': 2 };

export const sectionCount = (entries: RuleEntry[], section: Section) =>
  entries.filter((e) => e.section === section).reduce((n, e) => n + e.quantity, 0);

/** Wohin eine Karte beim Hinzufügen gehört */
export const sectionFor = (type: string): Section => (EXTRA_TYPE.test(type) ? 'EXTRA' : 'MAIN');

export function deckIssues(entries: RuleEntry[], cards: Map<string, RuleCard>): DeckIssue[] {
  const issues: DeckIssue[] = [];
  const main = sectionCount(entries, 'MAIN');
  const extra = sectionCount(entries, 'EXTRA');
  const side = sectionCount(entries, 'SIDE');
  if (main < 40 || main > 60) issues.push({ kind: 'mainSize', count: main });
  if (extra > 15) issues.push({ kind: 'extraSize', count: extra });
  if (side > 15) issues.push({ kind: 'sideSize', count: side });

  const total = new Map<string, number>();
  for (const e of entries) total.set(e.cardId, (total.get(e.cardId) ?? 0) + e.quantity);
  for (const [cardId, count] of total) {
    const card = cards.get(cardId);
    if (!card) continue;
    const limit = LIMIT[card.banTcg ?? ''] ?? 3;
    if (count > limit && limit < 3) issues.push({ kind: 'banlist', name: card.name, count, limit });
    else if (count > 3) issues.push({ kind: 'copies', name: card.name, count });
  }
  for (const e of entries) {
    const card = cards.get(e.cardId);
    if (!card || e.section === 'SIDE') continue;
    if (sectionFor(card.type) !== e.section)
      issues.push({ kind: 'wrongSection', name: card.name, section: e.section });
  }
  return issues;
}
