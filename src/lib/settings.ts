import { z } from 'zod';
import { DEFAULT_THEME, type Theme } from '@/lib/theme';

/**
 * Nutzereinstellungen (UX-Plan 5 und 16), gespeichert als JSON am Nutzer.
 * Kartensprache ist unabhängig von der Oberflächensprache und standardmäßig Englisch (UX-Plan 8),
 * weil Community, Turniere und PSCT englisch sind.
 */
export type CardLanguage = 'en' | 'de';

export interface UserSettings {
  theme: Theme;
  cardLanguage: CardLanguage;
}

export const DEFAULT_SETTINGS: UserSettings = { theme: DEFAULT_THEME, cardLanguage: 'en' };

export const settingsPatchSchema = z
  .object({
    theme: z.enum(['dark', 'light']).optional(),
    cardLanguage: z.enum(['en', 'de']).optional(),
  })
  .strict();

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

/** Liest gespeicherte Einstellungen tolerant: Unbekanntes fällt weg, Fehlendes nimmt den Standard */
export function parseSettings(raw: unknown): UserSettings {
  const parsed = settingsPatchSchema.strip().safeParse(raw ?? {});
  return { ...DEFAULT_SETTINGS, ...(parsed.success ? parsed.data : {}) };
}
