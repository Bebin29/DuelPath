import { describe, expect, it } from 'vitest';
import { deckIssues, sectionFor, type RuleEntry } from '@/lib/deck/deck-rules';

const cards = new Map([
  ['A', { name: 'Aluber', type: 'Effect Monster', banTcg: null }],
  ['L', { name: 'Limited', type: 'Spell Card', banTcg: 'Limited' }],
  ['F', { name: 'Albion', type: 'Fusion Monster', banTcg: null }],
]);

describe('deckIssues', () => {
  it('meldet Größe, Banlist, Kopien und falsche Bereiche', () => {
    const entries: RuleEntry[] = [
      { cardId: 'A', quantity: 3, section: 'MAIN' },
      { cardId: 'A', quantity: 1, section: 'SIDE' },
      { cardId: 'L', quantity: 2, section: 'MAIN' },
      { cardId: 'F', quantity: 1, section: 'MAIN' },
    ];
    expect(deckIssues(entries, cards)).toEqual([
      { kind: 'mainSize', count: 6 },
      { kind: 'copies', name: 'Aluber', count: 4 },
      { kind: 'banlist', name: 'Limited', count: 2, limit: 1 },
      { kind: 'wrongSection', name: 'Albion', section: 'MAIN' },
    ]);
  });

  it('weist auf OCG-Karten und Vorab-Releases hin, je Karte einmal', () => {
    const release = new Map([
      ['O', { name: 'Doll Hammer', type: 'Spell Card', banTcg: null, tcgDate: null }],
      [
        'P',
        {
          name: 'Great Gallant Bandit',
          type: 'Effect Monster',
          banTcg: null,
          tcgDate: '2026-10-08T00:00:00.000Z',
        },
      ],
      [
        'T',
        { name: 'Ash', type: 'Effect Monster', banTcg: null, tcgDate: '2017-05-04T00:00:00.000Z' },
      ],
    ]);
    const entries: RuleEntry[] = [
      { cardId: 'O', quantity: 2, section: 'MAIN' },
      { cardId: 'O', quantity: 1, section: 'SIDE' },
      { cardId: 'P', quantity: 3, section: 'SIDE' },
      { cardId: 'T', quantity: 3, section: 'MAIN' },
    ];
    const issues = deckIssues(entries, release, new Date('2026-10-02')).filter(
      (i) => i.kind === 'ocgOnly' || i.kind === 'preRelease'
    );
    expect(issues).toEqual([
      { kind: 'ocgOnly', name: 'Doll Hammer' },
      { kind: 'preRelease', name: 'Great Gallant Bandit', date: '2026-10-08' },
    ]);
    // Nach dem Release kein Hinweis mehr
    expect(
      deckIssues(entries, release, new Date('2026-10-09')).some((i) => i.kind === 'preRelease')
    ).toBe(false);
  });

  it('ordnet Extra-Deck-Monster dem Extra Deck zu', () => {
    expect(sectionFor('Link Monster')).toBe('EXTRA');
    expect(sectionFor('Spell Card')).toBe('MAIN');
  });
});

describe('toYdk', () => {
  it('schreibt Kopien je Bereich und lässt Karten ohne Passcode weg', async () => {
    const { toYdk } = await import('@/lib/deck/ydk');
    const ydk = toYdk(
      [
        { cardId: 'A', quantity: 2, section: 'MAIN' },
        { cardId: 'F', quantity: 1, section: 'EXTRA' },
        { cardId: 'X', quantity: 1, section: 'SIDE' },
      ],
      (id) => ({ A: '111', F: '222' })[id]
    );
    expect(ydk).toBe('#created by DuelPath\n#main\n111\n111\n#extra\n222\n!side\n');
  });
});
