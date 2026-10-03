/**
 * Banlist mit Stichdatum (UX-Plan 4.6: die App verbietet nichts, sie sagt es).
 *
 * Es gibt zwei Listen. Die aktuelle steht an den Karten selbst (`banTcg`) und
 * kommt aus dem Import; die nächste Liste ist von Hand gepflegt und enthält nur
 * die Abweichungen davon. "Unlimited" gibt eine Karte also wieder frei.
 */

export const BAN_STATUS = ['Forbidden', 'Limited', 'Semi-Limited', 'Unlimited'] as const;
export type BanStatus = (typeof BAN_STATUS)[number];

export type BanlistKey = 'current' | 'next';

export interface BanlistView {
  key: BanlistKey;
  name: string;
  /** Stand der Liste als ISO-Datum, „2026-10-01“ */
  effectiveOn: string | null;
  /** Zeitpunkt des erfolgreichen Datenimports, kein Banlist-Gültigkeitsdatum */
  importedAt?: string | null;
  /** cardId → Status; bei „next“ die Abweichungen von der aktuellen Liste */
  changes: Record<string, BanStatus>;
}

export interface Banlists {
  /** null, solange noch kein Import gelaufen ist */
  current: BanlistView | null;
  next: BanlistView | null;
}

export const isBanStatus = (value: string): value is BanStatus =>
  (BAN_STATUS as readonly string[]).includes(value);

/**
 * Stand einer Karte auf der gewählten Liste. `banTcg` ist die aktuelle Liste,
 * `changes` überschreibt sie; null heißt unbeschränkt.
 */
export function banStatusOn(
  cardId: string,
  banTcg: string | null,
  list?: BanlistView | null
): string | null {
  const change = list?.changes[cardId];
  if (!change) return banTcg;
  return change === 'Unlimited' ? null : change;
}

/**
 * Karten mit dem Stand der gewählten Liste, für den Deck-Check. Die übergebene
 * Map bleibt unberührt, damit die Anzeige weiter die aktuelle Liste zeigt.
 */
export function applyBanlist<T extends { banTcg: string | null }>(
  cards: Map<string, T>,
  list?: BanlistView | null
): Map<string, T> {
  if (!list || Object.keys(list.changes).length === 0) return cards;
  const next = new Map(cards);
  for (const [cardId, card] of cards) {
    const banTcg = banStatusOn(cardId, card.banTcg, list);
    if (banTcg !== card.banTcg) next.set(cardId, { ...card, banTcg });
  }
  return next;
}

/** Dates are stored at UTC midnight so server timezone changes cannot shift them. */
export const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10);

export function fromIsoDate(value: string): Date | null {
  const iso = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || toIsoDate(date) !== iso ? null : date;
}
