import { ok, route } from '@/server/api/http';
import { deckView } from '@/server/api/deck-api';

/** GET /api/v1/decks/:id: Deckliste nach Main, Extra und Side, mit Regelhinweisen */
export const GET = route<{ id: string }>(async ({ userId, params }) =>
  ok(await deckView(userId, params.id))
);
