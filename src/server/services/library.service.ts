import { prisma } from '@/lib/prisma/client';
import type { StartState } from '@/lib/combo/state';
import { cardsForCombo, loadCardRows } from './combo-cards.service';
import { comboStats } from '@/lib/combo/summary';
import { deckCounts, missingFromDeck } from '@/lib/deck/deck-check';
import { parseStatus, type LibraryCard, type LibraryEntry } from '@/lib/combo/library';
import { cardIdsOf, nodesWithImportChecks } from './combo-store.service';

/**
 * Bibliothek (UX-Plan 7.2): alle Combos eines Nutzers mit Kennzahlen, für die Seite und die API.
 * Karten werden einmal für alle geladen; für die Anzeige reichen Name und Bild, die Effekte braucht
 * nur die Endboard-Zahl.
 */
export async function loadLibrary(
  userId: string,
  deckId?: string
): Promise<{ entries: LibraryEntry[]; cards: Record<string, LibraryCard> }> {
  const combos = await prisma.combo.findMany({
    where: { userId, ...(deckId && { deckId }) },
    orderBy: { updatedAt: 'desc' },
    include: {
      deck: {
        select: {
          name: true,
          deckCards: { select: { cardId: true, quantity: true, deckSection: true } },
        },
      },
      nodes: { orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }] },
    },
  });
  const parsed = combos.map((c) => ({
    combo: c,
    startState: c.startState as unknown as StartState,
    nodes: nodesWithImportChecks(c.nodes, c.importChecks),
  }));
  // Separate maps preserve different combo-local stubs for the same missing passcode.
  const allIds = new Set(parsed.flatMap((p) => [...cardIdsOf(p.startState, p.nodes)]));
  const rows = await loadCardRows(
    allIds,
    parsed.map((p) => p.combo.importedCards)
  );
  const maps = parsed.map(
    (p) =>
      new Map(
        cardsForCombo(cardIdsOf(p.startState, p.nodes), p.combo.importedCards, rows).map((c) => [
          c.id,
          c,
        ])
      )
  );
  const cards: Record<string, LibraryCard> = {};
  for (const map of maps)
    for (const [id, c] of map)
      cards[id] = { name: c.name, nameDe: c.nameDe, imageSmall: c.imageSmall };

  return {
    cards,
    entries: parsed.map(({ combo, startState, nodes }, index) => {
      const stats = comboStats(startState, nodes, maps[index]);
      return {
        id: combo.id,
        title: combo.title,
        deckId: combo.deckId,
        deckName: combo.deck?.name ?? null,
        updatedAt: combo.updatedAt.toISOString(),
        tags: combo.tags,
        status: parseStatus(combo.status),
        stats,
        missing: combo.deck ? missingFromDeck(stats, deckCounts(combo.deck.deckCards)).length : 0,
      };
    }),
  };
}
