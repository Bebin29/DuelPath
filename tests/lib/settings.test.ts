import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings, settingsPatchSchema } from '@/lib/settings';

describe('parseSettings', () => {
  it('ergänzt fehlende Werte mit den Standards (dunkel, Karten englisch)', () => {
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(null)).toEqual({
      theme: 'dark',
      cardLanguage: 'en',
      staples: null,
      breakers: null,
      autoplaySpeed: 1,
      nicknames: [],
      seenHints: [],
    });
    expect(parseSettings({ cardLanguage: 'de' })).toEqual({
      theme: 'dark',
      cardLanguage: 'de',
      staples: null,
      breakers: null,
      autoplaySpeed: 1,
      nicknames: [],
      seenHints: [],
    });
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

  it('nimmt eine eigene Breaker-Liste und null für die Standardliste', () => {
    expect(settingsPatchSchema.safeParse({ breakers: ['Evenly Matched'] }).success).toBe(true);
    expect(settingsPatchSchema.safeParse({ breakers: null }).success).toBe(true);
    expect(settingsPatchSchema.safeParse({ breakers: [''] }).success).toBe(false);
  });
});

describe('nicknameMap', () => {
  it('fasst eigene Spitznamen klein geschrieben zusammen', async () => {
    const { nicknameMap } = await import('@/lib/settings');
    expect(
      nicknameMap([
        { alias: 'Grave', card: 'Called by the Grave' },
        { alias: 'grave', card: 'Crossout Designator' },
      ])
    ).toEqual({ grave: ['Called by the Grave', 'Crossout Designator'] });
  });
});
