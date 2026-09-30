/**
 * Deck-Abgleich (UX-Plan 7.4): Welche Karten einer Combo sind nicht mehr oder seltener im Deck?
 * Gezählt wird Main und Extra Deck; Side-Deck-Karten gelten im Spiel nicht.
 */

export interface MissingCard {
  cardId: string;
  need: number;
  have: number;
}

export function missingFromDeck(
  combo: { startHand: string[]; cardIds: string[] },
  deck: Map<string, number>
): MissingCard[] {
  const need = new Map<string, number>();
  for (const id of combo.startHand) need.set(id, (need.get(id) ?? 0) + 1);
  for (const id of combo.cardIds) if (!need.has(id)) need.set(id, 1);
  return [...need]
    .map(([cardId, n]) => ({ cardId, need: n, have: deck.get(cardId) ?? 0 }))
    .filter((m) => m.have < m.need);
}

/** Kopien je Karte in Main und Extra Deck */
export function deckCounts(
  cards: { cardId: string; quantity: number; deckSection?: string; section?: string }[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of cards) {
    if ((c.deckSection ?? c.section) === 'SIDE') continue;
    map.set(c.cardId, (map.get(c.cardId) ?? 0) + c.quantity);
  }
  return map;
}
