'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Plus, Upload } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { relativeTime } from '@/lib/utils/relative-time';
import { usePendingDelete } from '@/lib/hooks/use-pending-delete';
import { parseYDKFile } from '@/lib/utils/deck.utils';
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
import { createDeck, deleteDeck, importYdkToDeck } from '@/server/actions/deck.actions';
import type { DeckSummary } from '@/server/actions/deck-view.actions';

/**
 * Decks (UX-Plan 11, UI-Plan 7.5.4): YDK-Import ist der Hauptknopf, weil fast jeder seine Liste
 * schon in EDOPro oder YGOPRODeck hat. Löschen lässt sich einige Sekunden zurücknehmen.
 */
export function DeckOverview({ decks }: { decks: DeckSummary[] }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<DeckSummary | null>(null);

  usePendingDelete('deck', pending?.id ?? null, (id) => void deleteDeck(id));

  const create = async (name: string) => {
    const result = await createDeck({ name, format: 'TCG' });
    return result.deck?.id ?? null;
  };
  const importFile = async (file: File) => {
    setBusy(true);
    const id = await create(file.name.replace(/\.ydk$/i, '') || t('decks.untitled'));
    if (id) {
      await importYdkToDeck(id, parseYDKFile(await file.text()));
      router.push(`/decks/${id}`);
    } else setBusy(false);
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
    <Button onClick={() => fileRef.current?.click()} disabled={busy}>
      <Upload />
      {t('decks.importYdk')}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <input
        ref={fileRef}
        type="file"
        accept=".ydk,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
          e.target.value = '';
        }}
      />
      <header className="flex items-end gap-3">
        <div className="flex-1">
          <h1 className="font-display text-[40px] leading-none">{t('decks.title')}</h1>
          <p className="mt-2 text-text-muted">{t('decks.count', { count: decks.length })}</p>
        </div>
        <Button variant="line" onClick={createEmpty} disabled={busy}>
          <Plus />
          {t('decks.new')}
        </Button>
        {importButton}
      </header>

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
              className="relative flex h-20 items-center gap-5 border-b [contain-intrinsic-size:auto_80px] [content-visibility:auto] border-line px-2 transition-colors duration-(--motion-fast) hover:bg-surface-1"
            >
              <span className="flex -space-x-5">
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
                  className="block truncate font-display text-2xl leading-tight after:absolute after:inset-0 hover:underline"
                >
                  {d.name}
                </Link>
                <p className="font-mono text-xs text-text-muted">
                  {t('decks.section.MAIN')} {d.main} · {t('decks.section.EXTRA')} {d.extra} ·{' '}
                  {t('decks.section.SIDE')} {d.side}
                </p>
              </div>
              <span className="font-mono text-xs text-text-muted">
                {t('decks.combosCount', { count: d.combos })}
              </span>
              <span
                className="w-28 text-right font-mono text-xs text-text-muted"
                suppressHydrationWarning
              >
                {relativeTime(new Date(d.updatedAt), new Date(), i18n.language)}
              </span>
              <div className="relative z-10">
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
