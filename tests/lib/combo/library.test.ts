import { describe, expect, it } from 'vitest';
import {
  applyFilter,
  EMPTY_FILTER,
  filterQuery,
  parseFilter,
  type LibraryEntry,
} from '@/lib/combo/library';

const entry = (id: string, extra: Partial<LibraryEntry> = {}): LibraryEntry => ({
  id,
  title: id,
  deckId: 'd1',
  deckName: 'Branded',
  updatedAt: '2026-09-30T10:00:00.000Z',
  tags: [],
  status: 'DRAFT',
  stats: { startHand: [], lines: 1, branches: 0, steps: 3, endboard: 1, cardIds: [] },
  ...extra,
});
const cards = {
  ALU: { name: 'Aluber the Jester of Despia', nameDe: 'Aluber, der Hofnarr', imageSmall: null },
  CBTG: { name: 'Called by the Grave', nameDe: null, imageSmall: null },
};
const entries = [
  entry('Aluber 1-Card', {
    tags: ['1-Card'],
    status: 'TESTED',
    stats: {
      startHand: ['ALU'],
      lines: 3,
      branches: 2,
      steps: 5,
      endboard: 3,
      cardIds: ['ALU', 'CBTG'],
    },
  }),
  entry('Albaz', { deckId: 'd2', deckName: 'Albaz', updatedAt: '2026-09-29T10:00:00.000Z' }),
];

describe('Bibliothek', () => {
  it('liest Filter aus der Adresse und schreibt sie zurück', () => {
    const f = parseFilter({
      tag: ['1-Card', 'Grind'],
      status: 'TESTED',
      sort: 'lines',
      dir: 'asc',
    });
    expect(f).toMatchObject({
      tags: ['1-Card', 'Grind'],
      status: 'TESTED',
      sort: 'lines',
      desc: false,
    });
    expect(filterQuery(f)).toBe('?tag=1-Card&tag=Grind&status=TESTED&sort=lines&dir=asc');
    expect(parseFilter({ status: 'KAPUTT', sort: 'x' })).toEqual(EMPTY_FILTER);
    expect(filterQuery(EMPTY_FILTER)).toBe('');
  });

  it('findet Combos über Kartennamen, Starterkarte, Tags und Status', () => {
    const ids = (f: Partial<typeof EMPTY_FILTER>) =>
      applyFilter(entries, { ...EMPTY_FILTER, ...f }, cards).map((e) => e.id);
    expect(ids({ q: 'called' })).toEqual(['Aluber 1-Card']);
    expect(ids({ starter: 'hofnarr' })).toEqual(['Aluber 1-Card']);
    expect(ids({ tags: ['1-Card'], status: 'TESTED' })).toEqual(['Aluber 1-Card']);
    expect(ids({ deck: 'd2' })).toEqual(['Albaz']);
  });

  it('sortiert nach Spalten in beide Richtungen', () => {
    const ids = (sort: typeof EMPTY_FILTER.sort, desc: boolean) =>
      applyFilter(entries, { ...EMPTY_FILTER, sort, desc }, cards).map((e) => e.id);
    expect(ids('updated', true)).toEqual(['Aluber 1-Card', 'Albaz']);
    expect(ids('title', false)).toEqual(['Albaz', 'Aluber 1-Card']);
    expect(ids('endboard', true)).toEqual(['Aluber 1-Card', 'Albaz']);
  });
});
