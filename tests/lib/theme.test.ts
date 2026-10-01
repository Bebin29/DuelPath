import { describe, expect, it } from 'vitest';
import { applyTheme, parseTheme, THEME_COOKIE } from '@/lib/theme';

describe('parseTheme', () => {
  it('nimmt nur bekannte Werte an und fällt sonst auf dunkel zurück', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('pink')).toBe('dark');
    expect(parseTheme(undefined)).toBe('dark');
  });
});

describe('applyTheme', () => {
  it('setzt genau eine Design-Klasse am <html> und schreibt das Cookie', () => {
    document.documentElement.className = 'dark font-x';
    applyTheme('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('font-x')).toBe(true);
    expect(document.cookie).toContain(`${THEME_COOKIE}=light`);
  });
});
