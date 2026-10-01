/**
 * Design-Umschaltung (UI-Plan 4.1): Klasse am <html>, Standard dunkel.
 * Die Wahl liegt in einem Cookie, damit der Server sie beim ersten Rendern kennt
 * und nichts aufblitzt. Später wandert sie in die Nutzereinstellungen (UX-Plan 16).
 */
export type Theme = 'dark' | 'light';

export const THEME_COOKIE = 'duelpath-theme';
export const DEFAULT_THEME: Theme = 'dark';

export function parseTheme(value: string | undefined | null): Theme {
  return value === 'light' || value === 'dark' ? value : DEFAULT_THEME;
}

/** Setzt Klasse und Cookie im Browser */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(theme);
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`;
}
