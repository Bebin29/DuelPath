import { body, ok, route } from '@/server/api/http';
import {
  comboContext,
  playStep,
  stepRequestSchema,
  stepResult,
  stepView,
} from '@/server/api/combo-api';

type P = { id: string };

/** GET /api/v1/combos/:id/steps: alle Schritte des Baums (flach, mit parentId und rank) */
export const GET = route<P>(async ({ userId, params }) => {
  const ctx = await comboContext(userId, params.id);
  return ok(ctx.combo.nodes.map((n) => stepView(ctx, n)));
});

/**
 * POST /api/v1/combos/:id/steps: nächsten Schritt spielen, per Befehl („ns aluber“, „act ash 2“,
 * „o ash“, „res“, „end“) oder als Absicht. Antwortet mit neuen Schritten, offenen Fragen,
 * Triggern und dem Board danach.
 */
export const POST = route<P>(async ({ request, userId, params }) => {
  const input = stepRequestSchema.parse(await body(request));
  const result = await playStep(await comboContext(userId, params.id), input);
  if (result.existing)
    return ok({ ...stepResult(result.ctx, [result.existing], []), existing: true });
  return ok(
    {
      ...stepResult(result.ctx, result.created, result.prompts),
      ...(result.alternatives.length && { alternatives: result.alternatives }),
    },
    201
  );
});
