import { prisma } from '@/lib/prisma/client';
import type { CardData, StartState } from '@/lib/combo/state';
import { comboStats } from '@/lib/combo/summary';
import { expandDeck } from '@/lib/deck/hand-tester';
import { bestKnownEnd, type PracticeSetup, type PracticeTarget } from '@/lib/deck/practice';
import { cardIdsOf, loadCards, loadDeckEntries, nodeFromRow } from './combo-store.service';

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
    title: c.title,
    startState: c.startState as unknown as StartState,
    nodes: c.nodes.map(nodeFromRow),
  }));

  // Karten der Combos, die nicht im Deck stecken (Spielmarken, inzwischen entfernte Karten)
  const known = new Set(loaded.cards.map((c) => c.id));
  const extra = new Set<string>();
  for (const combo of combos)
    for (const id of cardIdsOf(combo.startState, combo.nodes)) if (!known.has(id)) extra.add(id);
  const cards = [...loaded.cards, ...(extra.size ? await loadCards(extra) : [])];
  const byId = new Map<string, CardData>(cards.map((c) => [c.id, c]));

  const targets: PracticeTarget[] = [];
  for (const combo of combos) {
    const end = bestKnownEnd(combo.startState, combo.nodes, byId);
    if (!end) continue;
    const stats = comboStats(combo.startState, combo.nodes, byId);
    if (stats.required.length === 0) continue;
    targets.push({
      comboId: combo.id,
      title: combo.title,
      startHand: stats.required,
      interruptions: end.interruptions,
      field: end.field,
      steps: end.steps,
    });
  }

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
