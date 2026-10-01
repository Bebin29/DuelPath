import { prisma } from '@/lib/prisma/client';
import { body, ok, route } from '@/server/api/http';
import { createDeckFromRequest, createDeckSchema, deckView } from '@/server/api/deck-api';

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

/**
 * POST /api/v1/decks: Deck anlegen, aus YDK-Inhalt oder aus Kartenlisten mit Name, Spitzname
 * oder Passcode. Extra-Deck-Karten im Main Deck wandern ins Extra Deck.
 */
export const POST = route(async ({ request, userId }) => {
  const input = createDeckSchema.parse(await body(request));
  const { id, matched } = await createDeckFromRequest(userId, input);
  return ok({ ...(await deckView(userId, id)), ...(matched.length && { matched }) }, 201);
});
