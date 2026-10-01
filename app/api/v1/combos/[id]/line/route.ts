import { ok, route } from '@/server/api/http';
import { comboContext, lineView } from '@/server/api/combo-api';

/** GET /api/v1/combos/:id/line?step=: Line durch einen Schritt (Standard: Hauptline) */
export const GET = route<{ id: string }>(async ({ request, userId, params }) => {
  const ctx = await comboContext(userId, params.id);
  return ok(lineView(ctx, request.nextUrl.searchParams.get('step')));
});
