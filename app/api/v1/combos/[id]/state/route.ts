import { ok, route } from '@/server/api/http';
import {
  actionsView,
  comboContext,
  resolveAfter,
  stateAt,
  stateView,
} from '@/server/api/combo-api';

/**
 * GET /api/v1/combos/:id/state?step=&actions=1: Board nach einem Schritt (Standard: Ende der
 * Hauptline, „start“ für die Starthand). Mit actions=1 stehen bei jeder eigenen Karte außerhalb
 * des Decks die möglichen Aktionen als fertige Absichten, mit actions=all auch im Deck.
 */
export const GET = route<{ id: string }>(async ({ request, userId, params }) => {
  const ctx = await comboContext(userId, params.id);
  const step = request.nextUrl.searchParams.get('step') ?? undefined;
  const at = resolveAfter(ctx, step)?.id ?? null;
  const state = stateAt(ctx, at);
  const view = stateView(ctx, state, at);
  const mode = request.nextUrl.searchParams.get('actions');
  if (mode !== '1' && mode !== 'all') return ok(view);
  const actions = Object.values(state.cards)
    .filter((c) => c.owner === 'self' || c.controller === 'self')
    .filter((c) => mode === 'all' || c.zone !== 'DECK')
    .map((c) => ({ instanceId: c.instanceId, actions: actionsView(ctx, state, c.instanceId) }))
    .filter((c) => c.actions.length > 0);
  return ok({
    ...view,
    actions: Object.fromEntries(actions.map((a) => [a.instanceId, a.actions])),
  });
});
