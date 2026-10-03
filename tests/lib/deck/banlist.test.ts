import { describe, expect, it } from 'vitest';
import {
  applyBanlist,
  banStatusOn,
  fromIsoDate,
  isBanStatus,
  toIsoDate,
  type BanlistView,
} from '@/lib/deck/banlist';
import { deckIssues, type RuleCard, type RuleEntry } from '@/lib/deck/deck-rules';

const list = (changes: BanlistView['changes']): BanlistView => ({
  key: 'next',
  name: 'Nächste Liste',
  effectiveOn: '2026-11-01',
  changes,
});

const card = (name: string, banTcg: string | null = null): RuleCard => ({
  name,
  type: 'Effect Monster',
  banTcg,
});

describe('banStatusOn', () => {
  it('nimmt den Stand der Karte, solange die Liste nichts dazu sagt', () => {
    expect(banStatusOn('1', 'Limited', list({}))).toBe('Limited');
    expect(banStatusOn('1', null, null)).toBeNull();
  });

  it('überschreibt den Stand der Karte', () => {
    expect(banStatusOn('1', 'Limited', list({ '1': 'Forbidden' }))).toBe('Forbidden');
    expect(banStatusOn('1', null, list({ '1': 'Semi-Limited' }))).toBe('Semi-Limited');
  });

  it('gibt eine Karte mit Unlimited wieder frei', () => {
    expect(banStatusOn('1', 'Forbidden', list({ '1': 'Unlimited' }))).toBeNull();
  });
});

describe('applyBanlist', () => {
  it('lässt die übergebene Map unberührt', () => {
    const cards = new Map([['1', card('Maxx C', 'Forbidden')]]);
    const next = applyBanlist(cards, list({ '1': 'Limited' }));
    expect(cards.get('1')?.banTcg).toBe('Forbidden');
    expect(next.get('1')?.banTcg).toBe('Limited');
  });

  it('gibt dieselbe Map zurück, wenn es nichts zu ändern gibt', () => {
    const cards = new Map([['1', card('Maxx C', 'Forbidden')]]);
    expect(applyBanlist(cards, list({}))).toBe(cards);
    expect(applyBanlist(cards, null)).toBe(cards);
  });
});

describe('Deck-Check gegen die nächste Liste', () => {
  const entries: RuleEntry[] = [
    { cardId: '1', quantity: 2, section: 'MAIN' },
    { cardId: '1', quantity: 1, section: 'SIDE' },
  ];
  const cards = new Map([['1', card('Pot of Prosperity', null)]]);

  it('meldet nichts, solange die Karte unbeschränkt ist', () => {
    expect(deckIssues(entries, cards).filter((i) => i.kind === 'banlist')).toEqual([]);
  });

  it('meldet drei Kopien über Main und Side, wenn die nächste Liste limitiert', () => {
    const checked = applyBanlist(cards, list({ '1': 'Limited' }));
    expect(deckIssues(entries, checked).filter((i) => i.kind === 'banlist')).toEqual([
      { kind: 'banlist', name: 'Pot of Prosperity', count: 3, limit: 1 },
    ]);
  });
});

describe('Stichdatum', () => {
  it('schreibt das Datum ohne Zeitzonen-Versatz', () => {
    expect(toIsoDate(new Date(2026, 9, 1))).toBe('2026-10-01');
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('liest ein ISO-Datum als lokale Mitternacht', () => {
    const date = fromIsoDate('2026-10-01')!;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(9);
    expect(date.getDate()).toBe(1);
  });

  it('weist unmögliche Datumsangaben zurück', () => {
    expect(fromIsoDate('2026-02-30')).toBeNull();
    expect(fromIsoDate('01.10.2026')).toBeNull();
    expect(fromIsoDate('')).toBeNull();
  });

  it('erkennt gültige Stände', () => {
    expect(isBanStatus('Semi-Limited')).toBe(true);
    expect(isBanStatus('Banned')).toBe(false);
  });
});
