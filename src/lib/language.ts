/**
 * Oberflächensprache. Wie das Design liegt die Wahl in einem Cookie, damit der Server sie beim
 * ersten Rendern kennt: kein deutsches Aufblitzen vor dem Englischen, `lang` am <html> stimmt.
 * Die Kartensprache ist davon getrennt (Nutzereinstellungen, UX-Plan 8).
 */
export type Language = 'de' | 'en';

export const LANGUAGE_COOKIE = 'duelpath-language';
export const DEFAULT_LANGUAGE: Language = 'de';

export function parseLanguage(value: string | undefined | null): Language {
  return value === 'en' || value === 'de' ? value : DEFAULT_LANGUAGE;
}

/** Setzt `lang` und Cookie im Browser */
export function applyLanguage(language: Language): void {
  document.documentElement.lang = language;
  document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/; max-age=31536000; samesite=lax`;
}
