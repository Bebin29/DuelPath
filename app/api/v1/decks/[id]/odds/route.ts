import { ok, route } from '@/server/api/http';
import { deckOdds } from '@/server/api/deck-api';

/** GET /api/v1/decks/:id/odds?going=first|second: Kennzahlen, Abdeckung und Grenznutzen */
export const GET = route<{ id: string }>(async ({ request, userId, params }) =>
  ok(
    await deckOdds(
      userId,
      params.id,
      request.nextUrl.searchParams.get('going') === 'second' ? 'second' : 'first'
    )
  )
);
