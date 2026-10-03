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
  effectiveOn: string;
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

/** Nur das Datum, ohne Uhrzeit und ohne Zeitzonen-Verschiebung */
export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

/** ISO-Datum als lokale Mitternacht; ungültige Eingaben geben null */
export function fromIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null;
  return date;
}
