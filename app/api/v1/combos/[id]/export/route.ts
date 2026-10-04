import { ApiError, ok, route } from '@/server/api/http';
import { portableCombo } from '@/server/services/combo-portable.service';

type P = { id: string };

/**
 * GET /api/v1/combos/:id/export: die ganze Combo als portable JSON-Datei.
 * Anders als GET /combos/:id ist das kein Lesemodell, sondern alles zum Wiederherstellen.
 */
export const GET = route<P>(async ({ userId, params }) => {
  const file = await portableCombo(userId, params.id);
  if (!file) throw new ApiError('NOT_FOUND', 'Combo nicht gefunden');
  return ok(file);
});
