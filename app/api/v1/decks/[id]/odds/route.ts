import { ok, route } from '@/server/api/http';
import { deckOdds } from '@/server/api/deck-api';

/**
 * GET /api/v1/decks/:id/odds?going=first|second&matchup=: Kennzahlen, Abdeckung und Grenznutzen,
 * mit Matchup für das Main Deck nach dem Side-Plan
 */
export const GET = route<{ id: string }>(async ({ request, userId, params }) => {
  const q = request.nextUrl.searchParams;
  const going = q.get('going');
  return ok(
    await deckOdds(userId, params.id, {
      ...((going === 'first' || going === 'second') && { going }),
      ...(q.get('matchup') && { matchup: q.get('matchup')! }),
    })
  );
});
