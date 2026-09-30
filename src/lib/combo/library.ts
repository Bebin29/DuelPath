import type { ComboStats } from '@/lib/combo/summary';

/**
 * Bibliothek (UX-Plan 7.2, UI-Plan 7.5.2): Filter stehen in der Adresse, damit ein Link
 * genau diese Ansicht öffnet. Gefiltert wird im Browser, die Kennzahlen kommen vom Server.
 */

export const COMBO_STATUSES = ['DRAFT', 'TESTED', 'TOURNAMENT'] as const;
export type ComboStatus = (typeof COMBO_STATUSES)[number];

export const SUGGESTED_TAGS = ['1-Card', '2-Card', 'Going First', 'Going Second', 'Grind'];

export const SORT_KEYS = ['updated', 'title', 'deck', 'lines', 'endboard'] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export interface LibraryCard {
  name: string;
  nameDe: string | null;
  imageSmall: string | null;
}

export interface LibraryEntry {
  id: string;
  title: string;
  deckId: string | null;
  deckName: string | null;
  updatedAt: string;
  tags: string[];
  status: ComboStatus;
  stats: ComboStats;
}

export interface LibraryFilter {
  deck: string | null;
  /** Suche in Titel und allen Kartennamen der Combo („Wo benutze ich Called?“) */
  q: string;
  /** Starterkarte: Name einer Karte der Starthand */
  starter: string;
  tags: string[];
  status: ComboStatus | null;
  sort: SortKey;
  desc: boolean;
}

export const EMPTY_FILTER: LibraryFilter = {
  deck: null,
  q: '',
  starter: '',
  tags: [],
  status: null,
  sort: 'updated',
  desc: true,
};

export const parseStatus = (value: unknown): ComboStatus =>
  COMBO_STATUSES.includes(value as ComboStatus) ? (value as ComboStatus) : 'DRAFT';

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseFilter(params: Params): LibraryFilter {
  const sort = one(params.sort);
  const status = one(params.status);
  const tags = params.tag;
  return {
    deck: one(params.deck) || null,
    q: one(params.q) ?? '',
    starter: one(params.starter) ?? '',
    tags: (Array.isArray(tags) ? tags : tags ? [tags] : []).filter(Boolean),
    status: COMBO_STATUSES.includes(status as ComboStatus) ? (status as ComboStatus) : null,
    sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : 'updated',
    desc: one(params.dir) !== 'asc',
  };
}

export function filterQuery(filter: LibraryFilter): string {
  const p = new URLSearchParams();
  if (filter.deck) p.set('deck', filter.deck);
  if (filter.q) p.set('q', filter.q);
  if (filter.starter) p.set('starter', filter.starter);
  for (const tag of filter.tags) p.append('tag', tag);
  if (filter.status) p.set('status', filter.status);
  if (filter.sort !== 'updated') p.set('sort', filter.sort);
  if (!filter.desc) p.set('dir', 'asc');
  const query = p.toString();
  return query ? `?${query}` : '';
}

export const isFiltered = (f: LibraryFilter) =>
  Boolean(f.deck || f.q || f.starter || f.tags.length || f.status);

export function applyFilter(
  entries: LibraryEntry[],
  filter: LibraryFilter,
  cards: Record<string, LibraryCard>
): LibraryEntry[] {
  const names = (id: string) => {
    const c = cards[id];
    return c ? [c.name, c.nameDe ?? ''].join(' ').toLowerCase() : '';
  };
  const q = filter.q.trim().toLowerCase();
  const starter = filter.starter.trim().toLowerCase();
  const hits = entries.filter(
    (e) =>
      (!filter.deck || e.deckId === filter.deck) &&
      (!filter.status || e.status === filter.status) &&
      filter.tags.every((t) => e.tags.includes(t)) &&
      (!starter || e.stats.startHand.some((id) => names(id).includes(starter))) &&
      (!q ||
        e.title.toLowerCase().includes(q) ||
        e.stats.cardIds.some((id) => names(id).includes(q)))
  );

  const value = (e: LibraryEntry): string | number => {
    switch (filter.sort) {
      case 'title':
        return e.title.toLowerCase();
      case 'deck':
        return (e.deckName ?? '').toLowerCase();
      case 'lines':
        return e.stats.lines;
      case 'endboard':
        return e.stats.endboard ?? -1;
      default:
        return e.updatedAt;
    }
  };
  const dir = filter.desc ? -1 : 1;
  return [...hits].sort((a, b) => {
    const [x, y] = [value(a), value(b)];
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });
}
