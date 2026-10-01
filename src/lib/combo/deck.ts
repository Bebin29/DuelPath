import type { StartState } from '@/lib/combo/state';
import { newInstanceId } from '@/lib/combo/tree';

export interface DeckEntry {
  cardId: string;
  quantity: number;
  section: 'MAIN' | 'EXTRA';
}

/**
 * Übernimmt ein Deck in den Startzustand: Main Deck in DECK, Extra Deck in EXTRA, je Kopie eine Instanz.
 * Eigene Karten, die schon außerhalb von Deck und Extra Deck liegen (Starthand, Feld), werden abgezogen,
 * damit keine Kopie doppelt existiert. Gegnerkarten bleiben unverändert.
 */
export function startStateFromDeck(start: StartState, entries: DeckEntry[]): StartState {
  const kept = start.cards.filter(
    (c) => c.owner !== 'self' || (c.zone !== 'DECK' && c.zone !== 'EXTRA')
  );
  const alreadyOut = new Map<string, number>();
  for (const c of kept) {
    if (c.owner === 'self') alreadyOut.set(c.cardId, (alreadyOut.get(c.cardId) ?? 0) + 1);
  }

  const fromDeck: StartState['cards'] = [];
  for (const entry of entries) {
    const used = alreadyOut.get(entry.cardId) ?? 0;
    const copies = Math.max(0, entry.quantity - used);
    alreadyOut.set(entry.cardId, Math.max(0, used - entry.quantity));
    for (let i = 0; i < copies; i++) {
      fromDeck.push({
        instanceId: newInstanceId(entry.cardId),
        cardId: entry.cardId,
        owner: 'self',
        zone: entry.section === 'EXTRA' ? 'EXTRA' : 'DECK',
      });
    }
  }
  return { cards: [...kept, ...fromDeck] };
}

/** Verschiebt eine Kopie der Karte im Startzustand vom eigenen Deck auf die Hand */
export function drawFromDeck(start: StartState, cardId: string): StartState {
  const index = start.cards.findIndex(
    (c) => c.owner === 'self' && c.zone === 'DECK' && c.cardId === cardId
  );
  if (index < 0) return start;
  return {
    cards: start.cards.map((c, i) => (i === index ? { ...c, zone: 'HAND' as const } : c)),
  };
}
