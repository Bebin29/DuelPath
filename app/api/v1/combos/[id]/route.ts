import { prisma } from '@/lib/prisma/client';
import { ApiError, body, ok, route } from '@/server/api/http';
import { comboContext, comboView, patchCombo, patchComboSchema } from '@/server/api/combo-api';

type P = { id: string };

/** GET /api/v1/combos/:id: Kopf, Starthand, Hauptline und alle Line-Enden */
export const GET = route<P>(async ({ userId, params }) =>
  ok(comboView(await comboContext(userId, params.id)))
);

/** PATCH /api/v1/combos/:id: Titel, Tags, Status, Deck */
export const PATCH = route<P>(async ({ request, userId, params }) => {
  const input = patchComboSchema.parse(await body(request));
  const ctx = await patchCombo(await comboContext(userId, params.id), input);
  return ok(comboView(ctx));
});

/** DELETE /api/v1/combos/:id */
export const DELETE = route<P>(async ({ userId, params }) => {
  const { count } = await prisma.combo.deleteMany({ where: { id: params.id, userId } });
  if (!count) throw new ApiError('NOT_FOUND', 'Combo nicht gefunden');
  return ok({ deleted: params.id });
});
