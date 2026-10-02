import { body, ok, route } from '@/server/api/http';
import { patchRoles, rolesPatchSchema } from '@/server/api/deck-api';

/** PATCH /api/v1/decks/:id/roles: Rollen setzen, Karten per Name, Spitzname oder Passcode */
export const PATCH = route<{ id: string }>(async ({ request, userId, params }) =>
  ok(await patchRoles(userId, params.id, rolesPatchSchema.parse(await body(request))))
);
