'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CloudOff,
  Crosshair,
  Loader2,
  Redo2,
  Search,
  TriangleAlert,
  Undo2,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Segmented } from '@/components/ui/segmented';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusChip } from '@/components/library/StatusChip';
import { usePalette } from '@/components/command/CommandPalette';
import { COMBO_STATUSES, SUGGESTED_TAGS, type ComboStatus } from '@/lib/combo/library';

export type WorkbenchMode = 'board' | 'tree';
export type SaveStatus = 'saved' | 'saving' | 'error';

/** Kopfzeile der Workbench (UI-Plan 7.1): ersetzt dort die App-Kopfzeile */
export function WorkbenchHeader({
  title,
  onTitle,
  deckId,
  decks,
  onDeck,
  mode,
  onMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  warnings,
  onWarnings,
  status,
  onRetry,
  stress,
  chokePoints,
  onStress,
  pairs,
  onPairs,
  comboStatus,
  onComboStatus,
  tags,
  onTags,
}: {
  title: string;
  onTitle: (title: string) => void;
  deckId: string | null;
  decks: { id: string; name: string }[];
  onDeck: (deckId: string | null) => void;
  mode: WorkbenchMode;
  onMode: (mode: WorkbenchMode) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  warnings: number;
  onWarnings: () => void;
  status: SaveStatus;
  onRetry: () => void;
  /** Stresstest an: Choke-Point-Chips in der Line-Liste (UX-Plan 6.8) */
  stress: boolean;
  chokePoints: number;
  onStress: () => void;
  /** Paare im Stresstest (UX-Plan 6.8), nur auf Knopfdruck */
  pairs: boolean;
  onPairs: () => void;
  comboStatus: ComboStatus;
  onComboStatus: (status: ComboStatus) => void;
  tags: string[];
  onTags: (tags: string[]) => void;
}) {
  const { t } = useTranslation();
  const palette = usePalette();
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface-1 px-4">
      <Button asChild variant="ghost" size="icon-sm" aria-label={t('combo.back')}>
        <Link href="/combos">
          <ArrowLeft />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => palette.open()}
        aria-label={`${t('palette.open')} (${t('help.key.ctrl')}+K)`}
        title={`${t('palette.open')} (${t('help.key.ctrl')}+K)`}
      >
        <Search />
      </Button>
      <input
        value={title}
        onChange={(e) => onTitle(e.target.value)}
        aria-label={t('combo.titlePlaceholder')}
        className="min-w-0 max-w-80 rounded-md bg-transparent px-1 font-display text-xl leading-none text-ink outline-none hover:bg-surface-3/50 focus-visible:bg-surface-3/50"
      />
      <MetaMenu status={comboStatus} onStatus={onComboStatus} tags={tags} onTags={onTags} />
      <select
        value={deckId ?? ''}
        onChange={(e) => onDeck(e.target.value || null)}
        aria-label={t('combo.deck.label')}
        className="rounded-md bg-transparent px-1 text-xs text-text-muted outline-none hover:bg-surface-3/50"
      >
        <option value="">{t('combo.deck.none')}</option>
        {decks.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      <span className="flex-1" />
      <Segmented<WorkbenchMode>
        label={t('workbench.mode')}
        value={mode}
        onChange={onMode}
        options={[
          { value: 'board', label: t('workbench.board') },
          { value: 'tree', label: t('workbench.tree') },
        ]}
      />
      <Kbd>V</Kbd>
      <span className="flex-1" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={`${t('workbench.undo')} (Strg+Z)`}
        title={`${t('workbench.undo')} (Strg+Z)`}
      >
        <Undo2 />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label={`${t('workbench.redo')} (Strg+Umschalt+Z)`}
        title={`${t('workbench.redo')} (Strg+Umschalt+Z)`}
      >
        <Redo2 />
      </Button>
      <span className="h-5 w-px bg-line" />
      <Button
        variant="line"
        size="sm"
        onClick={onStress}
        aria-pressed={stress}
        className={cn(stress && 'border-opponent text-opponent')}
      >
        <Crosshair className={cn(stress && 'text-opponent')} />
        {stress ? t('stress.chokePoints', { count: chokePoints }) : t('stress.run')}
        <Kbd>T</Kbd>
      </Button>
      {stress && (
        <Button
          variant="line"
          size="sm"
          onClick={onPairs}
          aria-pressed={pairs}
          title={t('stress.pairsHint')}
          className={cn(pairs && 'border-opponent text-opponent')}
        >
          {t('stress.pairs')}
        </Button>
      )}
      <button
        type="button"
        onClick={onWarnings}
        disabled={warnings === 0}
        aria-label={
          warnings ? t('workbench.warnings', { count: warnings }) : t('workbench.noWarnings')
        }
        className={cn(
          'flex items-center gap-1 rounded-md px-1.5 py-1 font-mono text-xs',
          warnings ? 'text-warning hover:bg-warning-tint' : 'text-text-subtle'
        )}
      >
        <TriangleAlert className="size-3.5" />
        {warnings}
      </button>
      <span
        role="status"
        aria-live="polite"
        className="flex min-w-28 items-center justify-end gap-1.5 font-mono text-[11px]"
      >
        {status === 'saved' && (
          <>
            <Check className="size-3 text-text-subtle" />
            <span className="text-text-subtle">{t('combo.saved')}</span>
          </>
        )}
        {status === 'saving' && (
          <>
            <Loader2 className="size-3 animate-spin text-text-subtle" />
            <span className="text-text-subtle">{t('combo.saving')}</span>
          </>
        )}
        {status === 'error' && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 text-opponent hover:underline"
          >
            <CloudOff className="size-3" />
            {t('combo.saveError')}
          </button>
        )}
      </span>
    </header>
  );
}

/** Status und Tags der Combo (UX-Plan 7.2); der Status-Chip ist zugleich der Auslöser */
function MetaMenu({
  status,
  onStatus,
  tags,
  onTags,
}: {
  status: ComboStatus;
  onStatus: (status: ComboStatus) => void;
  tags: string[];
  onTags: (tags: string[]) => void;
}) {
  const { t } = useTranslation();
  const all = [...new Set([...SUGGESTED_TAGS, ...tags])];
  const toggle = (tag: string) =>
    onTags(tags.includes(tag) ? tags.filter((x) => x !== tag) : [...tags, tag]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('library.meta')}
          className="flex items-center gap-1.5 rounded-md px-1 py-0.5 hover:bg-surface-3/50"
        >
          <StatusChip status={status} />
          {tags.length > 0 && (
            <span className="max-w-40 truncate font-mono text-2xs text-text-subtle">
              {tags.join(' · ')}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>{t('library.col.status')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={status}
          onValueChange={(value) => onStatus(value as ComboStatus)}
        >
          {COMBO_STATUSES.map((s) => (
            <DropdownMenuRadioItem key={s} value={s}>
              {t(`library.status.${s}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>{t('library.tags')}</DropdownMenuLabel>
        {all.map((tag) => (
          <DropdownMenuCheckboxItem
            key={tag}
            checked={tags.includes(tag)}
            onCheckedChange={() => toggle(tag)}
            onSelect={(e) => e.preventDefault()}
          >
            {tag}
          </DropdownMenuCheckboxItem>
        ))}
        <input
          placeholder={t('library.newTag')}
          aria-label={t('library.newTag')}
          maxLength={30}
          onKeyDown={(e) => {
            // Tippen gehört dem Feld, nicht der Typeahead-Suche des Menüs
            e.stopPropagation();
            const value = e.currentTarget.value.trim();
            if (e.key === 'Enter' && value) {
              if (!tags.includes(value)) onTags([...tags, value]);
              e.currentTarget.value = '';
            }
          }}
          className="mx-1 mt-1 h-7 w-[calc(100%-8px)] rounded-md border border-line bg-transparent px-2 text-sm outline-none placeholder:text-text-subtle focus:border-line-strong"
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
