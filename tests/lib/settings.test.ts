import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings, settingsPatchSchema } from '@/lib/settings';

describe('parseSettings', () => {
  it('ergänzt fehlende Werte mit den Standards (dunkel, Karten englisch)', () => {
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual({ theme: 'dark', cardLanguage: 'en' });
    expect(parseSettings({ cardLanguage: 'de' })).toEqual({ theme: 'dark', cardLanguage: 'de' });
  });

  it('verwirft unbekannte und ungültige Werte statt zu scheitern', () => {
    expect(parseSettings({ theme: 'pink', extra: 1 })).toEqual(DEFAULT_SETTINGS);
  });
});

describe('settingsPatchSchema', () => {
  it('lehnt unbekannte Schlüssel bei Änderungen ab', () => {
    expect(settingsPatchSchema.safeParse({ theme: 'light' }).success).toBe(true);
    expect(settingsPatchSchema.safeParse({ admin: true }).success).toBe(false);
  });
});
