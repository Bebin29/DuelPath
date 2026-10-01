import { prisma } from '@/lib/prisma/client';
import { ApiError, ok, route } from '@/server/api/http';

/** GET /api/v1/decks/:id: Deckliste nach Main, Extra und Side */
export const GET = route<{ id: string }>(async ({ userId, params }) => {
  const deck = await prisma.deck.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      format: true,
      userId: true,
      deckCards: {
        orderBy: { card: { name: 'asc' } },
        select: {
          quantity: true,
          deckSection: true,
          card: { select: { id: true, passcode: true, name: true, nameDe: true, type: true } },
        },
      },
    },
  });
  if (!deck || deck.userId !== userId) throw new ApiError('NOT_FOUND', 'Deck nicht gefunden');
  const section = (s: string) =>
    deck.deckCards
      .filter((c) => c.deckSection === s)
      .map((c) => ({ ...c.card, quantity: c.quantity }));
  return ok({
    id: deck.id,
    name: deck.name,
    format: deck.format,
    main: section('MAIN'),
    extra: section('EXTRA'),
    side: section('SIDE'),
  });
});
