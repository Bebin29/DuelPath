import { prisma } from '@/lib/prisma/client';
import { ok, route } from '@/server/api/http';

/** GET /api/v1/decks: eigene Decks mit Kartenzahl */
export const GET = route(async ({ userId }) => {
  const decks = await prisma.deck.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      format: true,
      updatedAt: true,
      deckCards: { select: { quantity: true, deckSection: true } },
    },
  });
  return ok(
    decks.map(({ deckCards, ...d }) => ({
      ...d,
      counts: Object.fromEntries(
        ['MAIN', 'EXTRA', 'SIDE'].map((s) => [
          s,
          deckCards.filter((c) => c.deckSection === s).reduce((n, c) => n + c.quantity, 0),
        ])
      ),
    }))
  );
});
