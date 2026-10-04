import { PORTABLE_MAX_BYTES } from '@/lib/combo/portable';
import { ApiError, body, ok, route } from '@/server/api/http';
import { comboFromPortable } from '@/server/services/combo-portable.service';

const MESSAGE = {
  format: 'Das ist keine DuelPath-Combo-Datei (format muss "duelpath.combo" sein)',
  version: 'Unbekannte Version, diese Fassung liest nur Version 1',
  invalid: 'Die Datei ist beschädigt',
} as const;

/**
 * POST /api/v1/combos/import: Datei aus GET /combos/:id/export einlesen.
 * Legt immer eine **neue** Combo an. Karten, die der Bestand nicht kennt, stehen in `missing`;
 * der Rest wird importiert.
 */
export const POST = route(async ({ request, userId }) => {
  const result = await comboFromPortable(userId, await body(request, PORTABLE_MAX_BYTES));
  if (result.error) {
    const { code } = result.error;
    const detail =
      code === 'version'
        ? `: ${result.error.version}`
        : code === 'invalid'
          ? `: ${result.error.detail}`
          : '';
    throw new ApiError('INVALID', `${MESSAGE[code]}${detail}`);
  }
  return ok(result.data, 201);
});
