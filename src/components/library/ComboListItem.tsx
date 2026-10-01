'use client';

import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { relativeTime } from '@/lib/utils/relative-time';
import { cn } from '@/lib/utils';
import type { LibraryCard, LibraryEntry } from '@/lib/combo/library';
import { StartHandStrip } from './StartHandStrip';
import { StatusChip } from './StatusChip';

/**
 * Eine Combo als Listenzeile (UI-Sweep-Plan, Phase 2): Starthand, Titel und eine Zeile mit
 * Deck, Lines, Endboard und Bearbeitet. Für Start, Deck-Tab und die Bibliothek unter `xl`.
 * Die ganze Zeile öffnet die Combo; das Menü liegt darüber.
 */
export function ComboListItem({
  combo,
  cards,
  showDeck = true,
  menu,
  children,
  className,
}: {
  combo: LibraryEntry;
  cards: Record<string, LibraryCard>;
  showDeck?: boolean;
  /** Aktionsmenü rechts, etwa Duplizieren und Löschen */
  menu?: React.ReactNode;
  /** Zusätzliche Zeile unter den Kennzahlen, etwa fehlende Karten */
  children?: React.ReactNode;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const facts = [
    showDeck && (combo.deckName ?? t('start.noDeck')),
    t('start.lines', { count: combo.stats.lines }),
    combo.stats.endboard != null && t('library.endboardCount', { count: combo.stats.endboard }),
    relativeTime(new Date(combo.updatedAt), new Date(), i18n.language),
  ].filter(Boolean);

  return (
    <li
      className={cn(
        'group relative flex items-center gap-3 border-b border-line py-3 transition-colors duration-(--motion-fast) hover:bg-surface-1 sm:gap-4 sm:px-1',
        className
      )}
    >
      <StartHandStrip cardIds={combo.stats.startHand} cards={cards} max={3} />
      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <Link
            href={`/combos/${combo.id}`}
            className="line-clamp-2 font-display text-lg leading-tight after:absolute after:inset-0 hover:underline sm:line-clamp-1"
          >
            {combo.title}
          </Link>
          {combo.missing > 0 && (
            <TriangleAlert
              aria-label={t('library.deckChanged', { count: combo.missing })}
              className="size-3.5 shrink-0 text-warning"
            >
              <title>{t('library.deckChanged', { count: combo.missing })}</title>
            </TriangleAlert>
          )}
        </span>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted sm:block sm:truncate">
          <StatusChip status={combo.status} className="sm:hidden" />
          <span>{facts.join(' · ')}</span>
        </p>
        {combo.tags.length > 0 && (
          <p className="truncate font-mono text-2xs text-text-subtle">{combo.tags.join(' · ')}</p>
        )}
        {children}
      </div>
      <StatusChip status={combo.status} className="hidden shrink-0 sm:inline-flex" />
      {menu && <div className="relative z-10 shrink-0">{menu}</div>}
    </li>
  );
}
