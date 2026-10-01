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
  /** Staples für Leiste und Stresstest in dieser Reihenfolge; null = Standardliste (UX-Plan 6.8) */
  staples: string[] | null;
  /** Tempo beim Abspielen einer Line (UX-Plan 6.10): Schritte pro Sekunde */
  autoplaySpeed: AutoplaySpeed;
  /** Eigene Spitznamen für Suche und Befehle (UX-Plan 8), ergänzen die gepflegte Liste */
  nicknames: Nickname[];
  /** Einmalige Hinweise, die der Nutzer schon gesehen hat (UX-Plan 11) */
  seenHints: string[];
}

export interface Nickname {
  alias: string;
  /** Exakter englischer Kartenname */
  card: string;
}

/** Eigene Spitznamen als Nachschlagetabelle, Schlüssel klein geschrieben */
export function nicknameMap(list: Nickname[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const n of list) {
    const key = n.alias.trim().toLowerCase();
    if (key) map[key] = [...(map[key] ?? []), n.card];
  }
  return map;
}

export const AUTOPLAY_SPEEDS = [0.5, 1, 2] as const;
export type AutoplaySpeed = (typeof AUTOPLAY_SPEEDS)[number];
/** „0,5×“ auf Deutsch, „0.5×“ auf Englisch */
export const speedLabel = (speed: AutoplaySpeed, locale: string) =>
  `${new Intl.NumberFormat(locale).format(speed)}×`;

export const DEFAULT_SETTINGS: UserSettings = {
  theme: DEFAULT_THEME,
  cardLanguage: 'en',
  staples: null,
  autoplaySpeed: 1,
  nicknames: [],
  seenHints: [],
};

export const settingsPatchSchema = z
  .object({
    theme: z.enum(['dark', 'light']).optional(),
    cardLanguage: z.enum(['en', 'de']).optional(),
    staples: z.array(z.string().max(100)).max(60).nullable().optional(),
    autoplaySpeed: z.union([z.literal(0.5), z.literal(1), z.literal(2)]).optional(),
    nicknames: z
      .array(
        z.object({ alias: z.string().trim().min(1).max(30), card: z.string().min(1).max(200) })
      )
      .max(200)
      .optional(),
    seenHints: z.array(z.string().max(40)).max(40).optional(),
  })
  .strict();

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

/** Liest gespeicherte Einstellungen tolerant: Unbekanntes fällt weg, Fehlendes nimmt den Standard */
export function parseSettings(raw: unknown): UserSettings {
  const parsed = settingsPatchSchema.strip().safeParse(raw ?? {});
  return { ...DEFAULT_SETTINGS, ...(parsed.success ? parsed.data : {}) };
}
