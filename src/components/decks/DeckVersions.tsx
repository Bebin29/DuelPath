'use client';

import { useState } from 'react';
import { ChevronDown, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { displayName } from '@/lib/combo/cards';
import type { DeckDiff } from '@/lib/deck/side-plan';
import type { DeckViewCard, DeckVersionView } from '@/server/actions/deck-view.actions';

/** Womit die Kennzahlen verglichen werden: Stand beim Öffnen, ein Zwischenstand oder eine Version */
export type BaselineKey = 'open' | 'now' | string;

const DIFF_SHOWN = 8;

/**
 * Vergleichsstand und Versionen (Deckbau-Plan 3.5): Version sichern, mit einer Version
 * vergleichen, sie zurückholen (Strg+Z nimmt das zurück) oder löschen. Darunter die Änderungen
 * gegenüber dem Vergleich als Liste.
 */
export function DeckVersions({
  versions,
  baseline,
  diff,
  cards,
  onCompare,
  onSave,
  onRestore,
  onDelete,
}: {
  versions: DeckVersionView[];
  baseline: BaselineKey;
  diff: DeckDiff[];
  cards: Map<string, DeckViewCard>;
  onCompare: (key: BaselineKey) => void;
  onSave: (name: string) => Promise<boolean>;
  onRestore: (version: DeckVersionView) => void;
  onDelete: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const cardLanguage = useCardLanguage();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [all, setAll] = useState(false);
  const date = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso)
    );
  const label = (key: BaselineKey) =>
    key === 'open'
      ? t('decks.versions.open')
      : key === 'now'
        ? t('decks.versions.now')
        : (versions.find((v) => v.id === key)?.name ?? t('decks.versions.open'));

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    if (await onSave(name)) setName('');
    setBusy(false);
  };
  const shown = all ? diff : diff.slice(0, DIFF_SHOWN);

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xs text-text-subtle">{t('decks.versions.compareWith')}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="line" size="sm">
              {label(baseline)}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup value={baseline} onValueChange={onCompare}>
              <DropdownMenuRadioItem value="open">{t('decks.versions.open')}</DropdownMenuRadioItem>

              {versions.length > 0 && <DropdownMenuSeparator />}
              {versions.map((v) => (
                <DropdownMenuRadioItem key={v.id} value={v.id}>
                  {v.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onCompare('now')}>
              {t('decks.versions.setNow')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {diff.length === 0 ? (
        <p className="text-xs text-text-subtle">{t('decks.versions.same')}</p>
      ) : (
        <ul className="flex flex-col gap-0.5" aria-label={t('decks.versions.diff')}>
          {shown.map((d) => (
            <li key={`${d.section}:${d.cardId}`} className="flex items-baseline gap-2">
              <span
                className={cn(
                  'w-6 shrink-0 text-right font-mono text-xs tabular-nums',
                  d.delta > 0 ? 'text-self' : 'text-opponent'
                )}
              >
                {d.delta > 0 ? `+${d.delta}` : `−${-d.delta}`}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {displayName(cards.get(d.cardId), cardLanguage)}
              </span>
              {d.section !== 'MAIN' && (
                <span className="font-mono text-2xs text-text-subtle">
                  {t(`decks.section.${d.section}`)}
                </span>
              )}
            </li>
          ))}
          {diff.length > DIFF_SHOWN && (
            <li>
              <button type="button" onClick={() => setAll((a) => !a)} className="text-xs underline">
                {all ? t('decks.less') : t('decks.moreIssues', { count: diff.length - DIFF_SHOWN })}
              </button>
            </li>
          )}
        </ul>
      )}

      <form
        className="flex gap-2 border-t border-line pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder={t('decks.versions.namePlaceholder')}
          aria-label={t('decks.versions.name')}
          className="h-7 min-w-0 flex-1 rounded-md border border-line bg-transparent px-2 text-sm outline-none focus-visible:border-line-strong"
        />
        <Button type="submit" variant="line" size="sm" disabled={busy || !name.trim()}>
          <Save />
          {t('decks.versions.save')}
        </Button>
      </form>

      {versions.length > 0 && (
        <ul className="flex flex-col" aria-label={t('decks.versions.title')}>
          {versions.map((v) => (
            <li key={v.id} className="flex min-h-9 items-center gap-1 border-b border-line">
              <button
                type="button"
                onClick={() => onCompare(v.id)}
                className={cn(
                  'flex min-w-0 flex-1 flex-col text-left hover:underline',
                  baseline === v.id && 'text-ink'
                )}
                aria-label={t('decks.versions.compare', { name: v.name })}
              >
                <span className="truncate">{v.name}</span>
                <span className="font-mono text-2xs text-text-subtle">{date(v.createdAt)}</span>
              </button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('decks.versions.restore', { name: v.name })}
                onClick={() => onRestore(v)}
              >
                <RotateCcw />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('decks.versions.delete', { name: v.name })}
                onClick={() => onDelete(v.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
