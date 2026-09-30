import { describe, expect, it } from 'vitest';
import { matchCards, parseCommand, PREFERRED_ZONES } from '@/lib/combo/command';

describe('parseCommand', () => {
  it('liest Aktion, Karte und Effektnummer', () => {
    expect(parseCommand('ns aluber')).toEqual({ verb: 'ns', query: 'aluber' });
    expect(parseCommand('act ash 2')).toEqual({ verb: 'act', query: 'ash', effect: 2 });
    expect(parseCommand('SS  Albion the Branded')).toEqual({
      verb: 'ss',
      query: 'Albion the Branded',
    });
    expect(parseCommand('res')).toEqual({ verb: 'resolve', query: '' });
    expect(parseCommand('o imperm')).toEqual({ verb: 'staple', query: 'imperm' });
  });

  it('ignoriert alles, was kein Befehl ist', () => {
    expect(parseCommand('aluber')).toBeNull();
    expect(parseCommand('')).toBeNull();
    expect(parseCommand('end now')).toBeNull();
    expect(parseCommand('ns')).toEqual({ verb: 'ns', query: '' });
  });
});

describe('matchCards', () => {
  const cards = [
    { id: 'a1', name: 'Aluber the Jester of Despia', zone: 'DECK' as const },
    { id: 'a2', name: 'Aluber the Jester of Despia', zone: 'HAND' as const },
    { id: 'ash', name: 'Ash Blossom & Joyous Spring', zone: 'HAND' as const },
    {
      id: 'bewd',
      name: 'Blue-Eyes White Dragon',
      nameDe: 'Blauäugiger w. Drache',
      zone: 'HAND' as const,
    },
    { id: 'cbtg', name: 'Called by the Grave', zone: 'HAND' as const },
  ];

  it('bevorzugt Spitznamen, Kürzel und die Zone der Aktion', () => {
    expect(matchCards('alub', cards, PREFERRED_ZONES.ns).map((c) => c.id)).toEqual(['a2', 'a1']);
    expect(matchCards('ash', cards)[0].id).toBe('ash');
    expect(matchCards('bewd', cards)[0].id).toBe('bewd');
    expect(matchCards('drache', cards)[0].id).toBe('bewd');
    expect(matchCards('cbtg', cards)[0].id).toBe('cbtg');
  });

  it('nimmt eigene Spitznamen dazu', () => {
    expect(matchCards('grave', cards, [], { grave: ['Called by the Grave'] })[0].id).toBe('cbtg');
    expect(matchCards('', cards)).toEqual([]);
  });
});
