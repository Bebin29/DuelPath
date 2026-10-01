import { prisma } from '@/lib/prisma/client';
import { parseStatus } from '@/lib/combo/library';
import { body, ok, route } from '@/server/api/http';
import {
  comboContext,
  comboView,
  createFromRequest,
  createRequestSchema,
} from '@/server/api/combo-api';

/** GET /api/v1/combos: eigene Combos, neueste zuerst */
export const GET = route(async ({ userId }) => {
  const combos = await prisma.combo.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      deckId: true,
      tags: true,
      status: true,
      revision: true,
      updatedAt: true,
      _count: { select: { nodes: true } },
    },
  });
  return ok(
    combos.map(({ _count, ...c }) => ({ ...c, status: parseStatus(c.status), steps: _count.nodes }))
  );
});

/** POST /api/v1/combos: neue Combo, Starthand aus dem Deck, Gegnerboard für Going Second */
export const POST = route(async ({ request, userId }) => {
  const input = createRequestSchema.parse(await body(request));
  const { id } = await createFromRequest(userId, input);
  return ok(comboView(await comboContext(userId, id)), 201);
});
