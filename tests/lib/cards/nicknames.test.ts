import { describe, expect, it } from 'vitest';
import { initialsOf, looksLikeInitials, nicknameTargets } from '@/lib/cards/nicknames';

describe('initialsOf', () => {
  it('nimmt den ersten Buchstaben jedes Worts', () => {
    expect(initialsOf('Blue-Eyes White Dragon')).toBe('bewd');
    expect(initialsOf('D.D. Crow')).toBe('ddc');
    expect(initialsOf('Called by the Grave')).toBe('cbtg');
    expect(initialsOf("Harpie's Feather Duster")).toBe('hfd');
    expect(initialsOf('Maxx "C"')).toBe('mc');
  });
});

describe('looksLikeInitials', () => {
  it('erkennt kurze Eingaben ohne Leer- und Sonderzeichen', () => {
    expect(looksLikeInitials('mst')).toBe(true);
    expect(looksLikeInitials('bewd')).toBe(true);
    expect(looksLikeInitials('dragon')).toBe(false);
    expect(looksLikeInitials('blue eyes')).toBe(false);
    expect(looksLikeInitials('a')).toBe(false);
  });
});

describe('nicknameTargets', () => {
  it('kennt Spitznamen unabhängig von Groß- und Kleinschreibung', () => {
    expect(nicknameTargets(' Imperm ')).toEqual(['Infinite Impermanence']);
    expect(nicknameTargets('solemn')).toHaveLength(3);
    expect(nicknameTargets('unbekannt')).toEqual([]);
  });
});
