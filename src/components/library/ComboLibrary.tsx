'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  MoreHorizontal,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';
import { relativeTime } from '@/lib/utils/relative-time';
import { Button } from '@/components/ui/button';
import { TimedNotice } from '@/components/ui/timed-notice';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  applyFilter,
  COMBO_STATUSES,
  EMPTY_FILTER,
  filterQuery,
  isFiltered,
  SUGGESTED_TAGS,
  type LibraryCard,
  type LibraryEntry,
  type LibraryFilter,
  type SortKey,
} from '@/lib/combo/library';
import { deleteCombo, duplicateCombo } from '@/server/actions/combo.actions';
import { NewComboButton } from './NewComboButton';
import { StartHandStrip } from './StartHandStrip';
import { StatusChip } from './StatusChip';

const UNDO_MS = 6000;
const COLUMNS = 'grid-cols-[132px_minmax(0,1fr)_160px_64px_80px_112px_120px_40px]';

/** Suchfeld im Stil D, für Titel- und Starterkarten-Suche */
function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <label
      className={cn(
        'flex h-8 items-center gap-2 rounded-md border border-line bg-surface-1 px-2.5 focus-within:border-line-strong',
        className
      )}
    >
      <Search className="size-3.5 shrink-0 text-text-subtle" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-subtle"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={placeholder}
          className="text-text-subtle hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      )}
    </label>
  );
}

/** Umschaltbarer Filter-Chip für Tags und Status */
function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'h-7 rounded-md border px-2.5 text-xs transition-colors duration-(--motion-fast)',
        on
          ? 'border-ink bg-ink text-on-primary'
          : 'border-line text-text-muted hover:border-line-strong'
      )}
    >
      {children}
    </button>
  );
}

/**
 * Bibliothek (UX-Plan 7.2, UI-Plan 7.5.2): Liste statt Kacheln, weil Spieler vergleichen.
 * Filter und Sortierung stehen in der Adresse; Löschen lässt sich einige Sekunden zurücknehmen.
 */
export function ComboLibrary({
  entries,
  cards,
  decks,
  initialFilter,
}: {
  entries: LibraryEntry[];
  cards: Record<string, LibraryCard>;
  decks: { id: string; name: string }[];
  initialFilter: LibraryFilter;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [filter, setFilter] = useState(initialFilter);
  const [pending, setPending] = useState<LibraryEntry | null>(null);

  const set = (patch: Partial<LibraryFilter>) => {
    const next = { ...filter, ...patch };
    setFilter(next);
    router.replace(`${pathname}${filterQuery(next)}`, { scroll: false });
  };

  // Ein vorgemerktes Löschen wird beim Verlassen der Seite ausgeführt
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  useEffect(
    () => () => {
      if (pendingRef.current) void deleteCombo(pendingRef.current.id);
    },
    []
  );
  const commitDelete = async (entry: LibraryEntry) => {
    setPending((p) => (p?.id === entry.id ? null : p));
    await deleteCombo(entry.id);
    router.refresh();
  };
  const remove = (entry: LibraryEntry) => {
    if (pending) void commitDelete(pending);
    setPending(entry);
  };
  const duplicate = async (entry: LibraryEntry) => {
    const result = await duplicateCombo(entry.id, t('library.copyTitle', { title: entry.title }));
    if (result.data) router.refresh();
  };

  const visible = useMemo(
    () => applyFilter(entries, filter, cards).filter((e) => e.id !== pending?.id),
    [entries, filter, cards, pending]
  );
  const allTags = useMemo(
    () => [...new Set([...SUGGESTED_TAGS, ...entries.flatMap((e) => e.tags)])],
    [entries]
  );
  const deckName = decks.find((d) => d.id === filter.deck)?.name;
  const when = (iso: string) => relativeTime(new Date(iso), new Date(), i18n.language);

  const sortBy = (key: SortKey) =>
    set(
      filter.sort === key
        ? { desc: !filter.desc }
        : { sort: key, desc: key !== 'title' && key !== 'deck' }
    );
  const header = (key: SortKey | null, label: string, align = 'text-left') => {
    const active = key && filter.sort === key;
    return (
      <div
        role="columnheader"
        aria-sort={active ? (filter.desc ? 'descending' : 'ascending') : undefined}
        className={align}
      >
        {key ? (
          <button
            type="button"
            onClick={() => sortBy(key)}
            className={cn(
              'inline-flex items-center gap-1 hover:text-ink',
              active ? 'text-ink' : 'text-text-subtle'
            )}
          >
            {label}
            {active &&
              (filter.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
          </button>
        ) : (
          <span className="text-text-subtle">{label}</span>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end gap-4">
        <div className="flex-1">
          <h1 className="font-display text-[40px] leading-none">{t('combo.title')}</h1>
          <p className="mt-2 text-text-muted">{t('library.count', { count: entries.length })}</p>
        </div>
        <NewComboButton decks={decks} />
      </header>

      <section aria-label={t('library.filters')} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            value={filter.q}
            onChange={(q) => set({ q })}
            placeholder={t('library.search')}
            className="w-80"
          />
          <SearchField
            value={filter.starter}
            onChange={(starter) => set({ starter })}
            placeholder={t('library.starter')}
            className="w-52"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="line" size="sm" className="h-8">
                {deckName ?? t('library.allDecks')}
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuRadioGroup
                value={filter.deck ?? ''}
                onValueChange={(deck) => set({ deck: deck || null })}
              >
                <DropdownMenuRadioItem value="">{t('library.allDecks')}</DropdownMenuRadioItem>
                {decks.map((d) => (
                  <DropdownMenuRadioItem key={d.id} value={d.id}>
                    {d.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {isFiltered(filter) && (
            <Button
              variant="text"
              size="sm"
              onClick={() => set({ ...EMPTY_FILTER, sort: filter.sort, desc: filter.desc })}
            >
              {t('library.reset')}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {COMBO_STATUSES.map((s) => (
            <Chip
              key={s}
              on={filter.status === s}
              onClick={() => set({ status: filter.status === s ? null : s })}
            >
              {t(`library.status.${s}`)}
            </Chip>
          ))}
          <span className="mx-1.5 h-4 w-px bg-line" />
          {allTags.map((tag) => (
            <Chip
              key={tag}
              on={filter.tags.includes(tag)}
              onClick={() =>
                set({
                  tags: filter.tags.includes(tag)
                    ? filter.tags.filter((x) => x !== tag)
                    : [...filter.tags, tag],
                })
              }
            >
              {tag}
            </Chip>
          ))}
        </div>
      </section>

      {entries.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-t border-line pt-6">
          <p className="text-text-muted">{t('library.empty')}</p>
          <NewComboButton decks={decks} />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-t border-line pt-6">
          <p className="text-text-muted">{t('library.noHits')}</p>
          <Button variant="line" onClick={() => set(EMPTY_FILTER)}>
            {t('library.reset')}
          </Button>
        </div>
      ) : (
        <div role="table" aria-label={t('combo.title')} className="flex flex-col">
          <div
            role="row"
            className={cn('grid h-9 items-center gap-4 border-b border-line px-2 text-xs', COLUMNS)}
          >
            {header(null, t('library.col.hand'))}
            {header('title', t('library.col.title'))}
            {header('deck', t('library.col.deck'))}
            {header('lines', t('library.col.lines'), 'text-right')}
            {header('endboard', t('library.col.endboard'), 'text-right')}
            {header(null, t('library.col.status'))}
            {header('updated', t('library.col.updated'))}
            <span />
          </div>
          {visible.map((e) => (
            <div
              key={e.id}
              role="row"
              className={cn(
                'group relative grid h-15 items-center gap-4 border-b border-line px-2 transition-colors duration-(--motion-fast) hover:bg-surface-1',
                COLUMNS
              )}
            >
              <div role="cell">
                <StartHandStrip cardIds={e.stats.startHand} cards={cards} />
              </div>
              <div role="cell" className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <Link
                    href={`/combos/${e.id}`}
                    className="truncate font-display text-lg leading-tight after:absolute after:inset-0 hover:underline"
                  >
                    {e.title}
                  </Link>
                  {e.missing > 0 && (
                    <TriangleAlert
                      aria-label={t('library.deckChanged', { count: e.missing })}
                      className="size-3.5 shrink-0 text-warning"
                    >
                      <title>{t('library.deckChanged', { count: e.missing })}</title>
                    </TriangleAlert>
                  )}
                </span>
                {e.tags.length > 0 && (
                  <span className="block truncate font-mono text-2xs text-text-subtle">
                    {e.tags.join(' · ')}
                  </span>
                )}
              </div>
              <div role="cell" className="truncate text-sm text-text-muted">
                {e.deckName ?? t('start.noDeck')}
              </div>
              <div role="cell" className="text-right font-mono text-xs">
                {e.stats.lines}
              </div>
              <div role="cell" className="text-right font-display text-xl leading-none">
                {e.stats.endboard ?? <span className="text-text-subtle">–</span>}
              </div>
              <div role="cell">
                <StatusChip status={e.status} />
              </div>
              <div role="cell" className="font-mono text-xs text-text-muted">
                {when(e.updatedAt)}
              </div>
              <div role="cell" className="relative z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('library.actions', { title: e.title })}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(`/combos/${e.id}`)}>
                      {t('start.open')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => duplicate(e)}>
                      {t('library.duplicate')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => remove(e)} className="text-opponent">
                      {t('combo.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {pending && (
        <TimedNotice
          key={pending.id}
          duration={UNDO_MS}
          onExpire={() => commitDelete(pending)}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 shadow-[0_18px_40px_rgb(0_0_0/0.45)]"
        >
          <span className="mr-2 text-sm">{t('library.deleted', { title: pending.title })}</span>
          <Button variant="text" size="sm" onClick={() => setPending(null)}>
            {t('workbench.undo')}
          </Button>
        </TimedNotice>
      )}
    </div>
  );
}
