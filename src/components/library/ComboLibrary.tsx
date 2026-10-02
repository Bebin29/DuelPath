'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';
import { relativeTime } from '@/lib/utils/relative-time';
import { usePendingDelete } from '@/lib/hooks/use-pending-delete';
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
import { PageHeader } from '@/components/ui/page-header';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ComboListItem } from './ComboListItem';

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
        'flex h-8 items-center gap-2 rounded-md border border-line bg-surface-1 px-2.5 focus-within:border-line-strong pointer-coarse:h-10',
        className
      )}
    >
      <Search className="size-3.5 shrink-0 text-text-subtle" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="min-w-0 flex-1 self-stretch bg-transparent text-sm outline-none placeholder:text-text-subtle pointer-coarse:text-base"
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
        'h-7 rounded-md border px-2.5 text-xs transition-colors duration-(--motion-fast) pointer-coarse:h-10 pointer-coarse:px-3',
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

  // Ein vorgemerktes Löschen läuft auch beim Verlassen der Seite oder Schließen des Tabs
  usePendingDelete('combo', pending?.id ?? null, (id) => void deleteCombo(id));
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

  const activeCount =
    (filter.starter ? 1 : 0) + (filter.deck ? 1 : 0) + (filter.status ? 1 : 0) + filter.tags.length;
  const starterAndDeck = (
    <>
      <SearchField
        value={filter.starter}
        onChange={(starter) => set({ starter })}
        placeholder={t('library.starter')}
        className="w-full sm:w-52"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="line" size="sm" className="h-8 justify-between">
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
    </>
  );
  // Status und Tags als zwei beschriftete Gruppen (UI-Sweep-Plan 3.3)
  const chipGroups = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6">
      <div
        role="group"
        aria-label={t('library.statusGroup')}
        className="flex flex-wrap items-center gap-1.5"
      >
        <span className="mr-1 font-mono text-2xs text-text-subtle">{t('library.statusGroup')}</span>
        {COMBO_STATUSES.map((s) => (
          <Chip
            key={s}
            on={filter.status === s}
            onClick={() => set({ status: filter.status === s ? null : s })}
          >
            {t(`library.status.${s}`)}
          </Chip>
        ))}
      </div>
      <div
        role="group"
        aria-label={t('library.tags')}
        className="flex flex-wrap items-center gap-1.5"
      >
        <span className="mr-1 font-mono text-2xs text-text-subtle">{t('library.tags')}</span>
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
    </div>
  );
  const resetButton = isFiltered(filter) && (
    <Button
      variant="text"
      size="sm"
      onClick={() => set({ ...EMPTY_FILTER, sort: filter.sort, desc: filter.desc })}
    >
      {t('library.reset')}
    </Button>
  );
  const menuFor = (e: LibraryEntry) => (
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
        <DropdownMenuItem onSelect={() => duplicate(e)}>{t('library.duplicate')}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => remove(e)} className="text-opponent">
          {t('combo.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('combo.title')}
        meta={t('library.count', { count: entries.length })}
        actions={<NewComboButton decks={decks} />}
      />

      <section aria-label={t('library.filters')} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchField
            value={filter.q}
            onChange={(q) => set({ q })}
            placeholder={t('library.search')}
            className="min-w-0 flex-1 sm:w-80 sm:flex-none"
          />
          <div className="hidden flex-wrap items-center gap-2 sm:flex">{starterAndDeck}</div>
          {/* Handy: weitere Filter im Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="line" className="sm:hidden">
                <SlidersHorizontal />
                {t('library.filters')}
                {activeCount > 0 && (
                  <span className="font-mono text-2xs text-text-subtle">{activeCount}</span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent aria-describedby={undefined} className="gap-5 p-5 pt-3">
              <SheetTitle>{t('library.filters')}</SheetTitle>
              <div className="flex flex-col gap-2">{starterAndDeck}</div>
              {chipGroups}
              {resetButton}
            </SheetContent>
          </Sheet>
          <div className="hidden sm:block">{resetButton}</div>
        </div>
        <div className="hidden sm:block">{chipGroups}</div>
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
        <>
          {/* Unter xl reicht die Breite nicht für alle Spalten: Liste statt Tabelle */}
          <ul
            aria-label={t('combo.title')}
            className="flex flex-col border-t border-line xl:hidden"
          >
            {visible.map((e) => (
              <ComboListItem key={e.id} combo={e} cards={cards} menu={menuFor(e)} />
            ))}
          </ul>
          <div role="table" aria-label={t('combo.title')} className="hidden flex-col xl:flex">
            <div
              role="row"
              className={cn(
                'grid h-9 items-center gap-4 border-b border-line px-2 text-xs',
                COLUMNS
              )}
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
                  'group relative grid h-15 items-center gap-4 border-b [contain-intrinsic-size:auto_60px] [content-visibility:auto] border-line px-2 transition-colors duration-(--motion-fast) hover:bg-surface-1',
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
                <div
                  role="cell"
                  className="font-mono text-xs text-text-muted"
                  suppressHydrationWarning
                >
                  {when(e.updatedAt)}
                </div>
                <div role="cell" className="relative z-10">
                  {menuFor(e)}
                </div>
              </div>
            ))}
          </div>
        </>
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
