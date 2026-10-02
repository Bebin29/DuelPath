import { prisma } from '@/lib/prisma/client';
import type { StartState } from '@/lib/combo/state';
import { toComboCard } from '@/lib/combo/cards';
import { comboStats } from '@/lib/combo/summary';
import { deckCounts, missingFromDeck } from '@/lib/deck/deck-check';
import { parseStatus, type LibraryCard, type LibraryEntry } from '@/lib/combo/library';
import { cardIdsOf, nodeFromRow } from './combo-store.service';

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
    nodes: c.nodes.map(nodeFromRow),
  }));
  const ids = new Set<string>();
  for (const p of parsed) for (const id of cardIdsOf(p.startState, p.nodes)) ids.add(id);
  const rows = await prisma.card.findMany({
    where: { id: { in: [...ids] } },
    select: {
      id: true,
      name: true,
      nameDe: true,
      type: true,
      race: true,
      imageSmall: true,
      effects: true,
      effectsOverride: true,
      linkMarkers: true,
    },
  });
  const full = new Map(rows.map((r) => [r.id, toComboCard(r)]));
  const cards = Object.fromEntries(
    rows.map((r) => [r.id, { name: r.name, nameDe: r.nameDe, imageSmall: r.imageSmall }])
  );

  return {
    cards,
    entries: parsed.map(({ combo, startState, nodes }) => {
      const stats = comboStats(startState, nodes, full);
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
