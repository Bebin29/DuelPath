import { body, ok, route } from '@/server/api/http';
import {
  comboContext,
  deleteStep,
  patchStep,
  patchStepSchema,
  stepDetail,
} from '@/server/api/combo-api';

type P = { id: string; stepId: string };

/** GET /api/v1/combos/:id/steps/:stepId: Schritt mit Pfad, offenen Fragen, Triggern und Board */
export const GET = route<P>(async ({ userId, params }) =>
  ok(stepDetail(await comboContext(userId, params.id), params.stepId))
);

/** PATCH /api/v1/combos/:id/steps/:stepId: Notiz, Branch-Name, zur Hauptline machen */
export const PATCH = route<P>(async ({ request, userId, params }) => {
  const input = patchStepSchema.parse(await body(request));
  return ok(await patchStep(await comboContext(userId, params.id), params.stepId, input));
});

/** DELETE /api/v1/combos/:id/steps/:stepId?revision=: Schritt samt allem danach */
export const DELETE = route<P>(async ({ request, userId, params }) => {
  const revision = request.nextUrl.searchParams.get('revision');
  const ctx = await comboContext(userId, params.id);
  return ok(await deleteStep(ctx, params.stepId, revision ? Number(revision) : undefined));
});
