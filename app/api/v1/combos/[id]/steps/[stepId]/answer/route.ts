import { body, ok, route } from '@/server/api/http';
import { answerSchema, answerStep, comboContext } from '@/server/api/combo-api';

/**
 * POST /api/v1/combos/:id/steps/:stepId/answer: offene Frage beantworten (Abwurf, Suche,
 * Beschwörung, Fusion). picks sind instanceIds aus den Kandidaten der Frage.
 */
export const POST = route<{ id: string; stepId: string }>(async ({ request, userId, params }) => {
  const input = answerSchema.parse(await body(request));
  return ok(await answerStep(await comboContext(userId, params.id), params.stepId, input));
});
