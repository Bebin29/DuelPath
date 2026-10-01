import { ok, route } from '@/server/api/http';
import { comboContext, endboardView } from '@/server/api/combo-api';

/** GET /api/v1/combos/:id/endboard?step=: Endboard am Ende der Line durch den Schritt */
export const GET = route<{ id: string }>(async ({ request, userId, params }) => {
  const ctx = await comboContext(userId, params.id);
  return ok(endboardView(ctx, request.nextUrl.searchParams.get('step')));
});
