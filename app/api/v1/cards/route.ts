import { CardSearchService } from '@/server/services/card-search.service';
import { ApiError, ok, route } from '@/server/api/http';
import { userNicknames } from '@/server/api/combo-api';

/** GET /api/v1/cards?q=&limit=: Kartensuche mit Spitznamen, liefert Passcodes für Befehle */
export const GET = route(async ({ request, userId }) => {
  const params = request.nextUrl.searchParams;
  const q = params.get('q')?.trim();
  if (!q) throw new ApiError('INVALID', 'Parameter q fehlt');
  const limit = Math.min(50, Math.max(1, Number(params.get('limit')) || 10));
  const search = new CardSearchService(await userNicknames(userId));
  const result = await search.searchCards({ name: q }, 1, limit);
  return ok(
    result.cards.map((c) => ({
      id: c.id,
      passcode: c.passcode,
      name: c.name,
      nameDe: c.nameDe,
      type: c.type,
      race: c.race,
      attribute: c.attribute,
      level: c.level,
      atk: c.atk,
      def: c.def,
      archetype: c.archetype,
      banTcg: c.banTcg,
      desc: c.desc,
    }))
  );
});
