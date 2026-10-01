import { ok, route } from '@/server/api/http';
import { comboContext, stressView } from '@/server/api/combo-api';

/** GET /api/v1/combos/:id/stress?step=&pairs=1: Stresstest der Line mit den eigenen Staples */
export const GET = route<{ id: string }>(async ({ request, userId, params }) => {
  const ctx = await comboContext(userId, params.id);
  const q = request.nextUrl.searchParams;
  return ok(stressView(ctx, q.get('step'), q.get('pairs') === '1'));
});
