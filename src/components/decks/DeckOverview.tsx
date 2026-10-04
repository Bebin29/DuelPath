'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Plus, Upload } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { relativeTime } from '@/lib/utils/relative-time';
import { usePendingDelete } from '@/lib/hooks/use-pending-delete';
import { Button } from '@/components/ui/button';
import { TimedNotice } from '@/components/ui/timed-notice';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CardView } from '@/components/cards/CardView';
import { createDeck, createDeckFromText, deleteDeck } from '@/server/actions/deck.actions';
import { ImportDeckDialog } from './ImportDeckDialog';
import type { DeckSummary } from '@/server/actions/deck-view.actions';
import { PageHeader } from '@/components/ui/page-header';

/**
 * Decks (UX-Plan 11, UI-Plan 7.5.4): Import ist der Hauptknopf, weil fast jeder seine Liste
 * schon in EDOPro, YGOPRODeck oder als ydke-Link hat. Löschen lässt sich einige Sekunden zurücknehmen.
 */
export function DeckOverview({ decks }: { decks: DeckSummary[] }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pending, setPending] = useState<DeckSummary | null>(null);

  usePendingDelete('deck', pending?.id ?? null, (id) => void deleteDeck(id));

  const create = async (name: string) => {
    const result = await createDeck({ name, format: 'TCG' });
    return result.deck?.id ?? null;
  };
  const importText = async (text: string): Promise<string | null> => {
    const result = await createDeckFromText(t('decks.import.newTitle'), text);
    if (!result.data)
      return result.error && result.error !== 'Unauthorized' ? result.error : 'failed';
    // Was fehlte, zeigt die neue Deckseite; sonst ginge eine Karte wortlos verloren
    const { missing } = result.data;
    const query = missing.length
      ? `?${new URLSearchParams({ missing: missing.slice(0, 3).join('\n'), missingCount: String(missing.length) })}`
      : '';
    router.push(`/decks/${result.data.id}${query}`);
    return null;
  };
  const createEmpty = async () => {
    setBusy(true);
    const id = await create(t('decks.untitled'));
    if (id) router.push(`/decks/${id}`);
    else setBusy(false);
  };
  const commitDelete = async (deck: DeckSummary) => {
    setPending((p) => (p?.id === deck.id ? null : p));
    await deleteDeck(deck.id);
    router.refresh();
  };

  const visible = decks.filter((d) => d.id !== pending?.id);
  const importButton = (
    <Button onClick={() => setImportOpen(true)} disabled={busy}>
      <Upload />
      {t('decks.import.button')}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <ImportDeckDialog open={importOpen} onOpenChange={setImportOpen} onImport={importText} />
      <PageHeader
        title={t('decks.title')}
        meta={t('decks.count', { count: decks.length })}
        actions={
          <>
            <Button variant="line" onClick={createEmpty} disabled={busy}>
              <Plus />
              {t('decks.new')}
            </Button>
            {importButton}
          </>
        }
      />

      {visible.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border-t border-line pt-6">
          <p className="max-w-[520px] text-text-muted">{t('decks.emptyText')}</p>
          {importButton}
        </div>
      ) : (
        <ul className="flex flex-col border-t border-line">
          {visible.map((d) => (
            <li
              key={d.id}
              className="relative flex min-h-20 items-center gap-3 border-b [contain-intrinsic-size:auto_80px] [content-visibility:auto] border-line py-3 transition-colors duration-(--motion-fast) hover:bg-surface-1 sm:gap-5 sm:px-2"
            >
              <span className="flex shrink-0 -space-x-5">
                {d.cover.map((img, i) => (
                  <CardView
                    key={i}
                    image={img}
                    label=""
                    size="sm"
                    className="shadow-[0_2px_8px_rgb(0_0_0/0.5)]"
                  />
                ))}
                {d.cover.length === 0 && <span className="w-11" />}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/decks/${d.id}`}
                  className="block truncate font-display text-xl leading-tight after:absolute after:inset-0 hover:underline sm:text-2xl"
                >
                  {d.name}
                </Link>
                <p className="truncate font-mono text-xs text-text-muted">
                  {t('decks.section.MAIN')} {d.main} · {t('decks.section.EXTRA')} {d.extra} ·{' '}
                  {t('decks.section.SIDE')} {d.side}
                </p>
                {/* Auf schmalen Bildschirmen stehen Combos und Datum unter den Kennzahlen */}
                <p
                  className="truncate font-mono text-xs text-text-muted sm:hidden"
                  suppressHydrationWarning
                >
                  {t('decks.combosCount', { count: d.combos })} ·{' '}
                  {relativeTime(new Date(d.updatedAt), new Date(), i18n.language)}
                </p>
              </div>
              <span className="hidden shrink-0 font-mono text-xs text-text-muted sm:inline">
                {t('decks.combosCount', { count: d.combos })}
              </span>
              <span
                className="hidden w-28 shrink-0 text-right font-mono text-xs text-text-muted sm:inline"
                suppressHydrationWarning
              >
                {relativeTime(new Date(d.updatedAt), new Date(), i18n.language)}
              </span>
              <div className="relative z-10 shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('library.actions', { title: d.name })}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => router.push(`/decks/${d.id}`)}>
                      {t('start.open')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push(`/decks/${d.id}?tab=hand`)}>
                      {t('decks.tab.hand')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-opponent"
                      onSelect={() => {
                        if (pending) void commitDelete(pending);
                        setPending(d);
                      }}
                    >
                      {t('combo.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pending && (
        <TimedNotice
          key={pending.id}
          duration={6000}
          onExpire={() => commitDelete(pending)}
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 shadow-[0_18px_40px_rgb(0_0_0/0.45)]"
        >
          <span className="mr-2 text-sm">{t('library.deleted', { title: pending.name })}</span>
          <Button variant="text" size="sm" onClick={() => setPending(null)}>
            {t('workbench.undo')}
          </Button>
        </TimedNotice>
      )}
    </div>
  );
}
