import { cardsForCombo, loadCardRows } from './combo-cards.service';
import { prisma } from '@/lib/prisma/client';
import type { CardData, StartState } from '@/lib/combo/state';
import { expandDeck } from '@/lib/deck/hand-tester';
import { practiceTargets, type PracticeSetup } from '@/lib/deck/practice';
import { cardIdsOf, loadDeckEntries, nodesWithImportChecks } from './combo-store.service';

/**
 * Übungsmodus (Lücke L2): Deck und gespeicherte Lines eines Decks so geladen, dass der Browser
 * Hände ziehen, die Line selbst spielen und das Ergebnis vergleichen kann.
 */

export async function loadPracticeSetup(
  userId: string,
  deckId: string
): Promise<PracticeSetup | null> {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    select: { userId: true, name: true },
  });
  if (!deck || deck.userId !== userId) return null;
  const loaded = await loadDeckEntries(userId, deckId);
  if (!loaded) return null;

  const rows = await prisma.combo.findMany({
    where: { userId, deckId },
    orderBy: { updatedAt: 'desc' },
    include: { nodes: { orderBy: [{ rank: 'asc' }, { createdAt: 'asc' }] } },
  });
  const combos = rows.map((c) => ({
    id: c.id,
    importedCards: c.importedCards,
    title: c.title,
    startState: c.startState as unknown as StartState,
    nodes: nodesWithImportChecks(c.nodes, c.importChecks),
  }));

  // Karten der Combos, die nicht im Deck stecken (Spielmarken, inzwischen entfernte Karten)
  const known = new Set(loaded.cards.map((c) => c.id));
  const extra = new Set<string>();
  for (const combo of combos)
    for (const id of cardIdsOf(combo.startState, combo.nodes)) if (!known.has(id)) extra.add(id);
  const cardRows = extra.size
    ? await loadCardRows(
        extra,
        combos.map((c) => c.importedCards)
      )
    : [];
  const comboCards = combos.map((c) => [
    ...loaded.cards,
    ...cardsForCombo(extra, c.importedCards, cardRows),
  ]);
  const cards = [
    ...new Map([...loaded.cards, ...comboCards.flat()].map((c) => [c.id, c])).values(),
  ];
  const targets = combos.flatMap((combo, i) =>
    practiceTargets(
      combo,
      new Map<string, CardData>(comboCards[i].map((c) => [c.id, c])),
      loaded.entries
    )
  );

  return {
    deckId,
    deckName: deck.name,
    pool: expandDeck(
      loaded.entries
        .filter((e) => e.section === 'MAIN')
        .map((e) => ({ cardId: e.cardId, quantity: e.quantity }))
    ),
    entries: loaded.entries,
    cards,
    targets,
  };
}
