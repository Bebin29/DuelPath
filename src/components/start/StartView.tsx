'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { AmSpieltisch } from '@/components/illustrations/AmSpieltisch';
import { relativeTime } from '@/lib/utils/relative-time';
import type { LibraryCard, LibraryEntry } from '@/lib/combo/library';
import { NewComboButton } from '@/components/library/NewComboButton';
import { StartHandStrip } from '@/components/library/StartHandStrip';

/**
 * Start (UI-Plan 7.5.1): links Illustration und Headline als seltene Fläche,
 * rechts weiter bearbeiten und zuletzt bearbeitet. Ohne Combos die ersten Schritte (UX-Plan 11).
 */
export function StartView({
  combos,
  cards,
  decks,
}: {
  combos: LibraryEntry[];
  cards: Record<string, LibraryCard>;
  decks: { id: string; name: string }[];
}) {
  const { t, i18n } = useTranslation();
  const [latest, ...recent] = combos;
  const when = (iso: string) =>
    t('start.edited', { time: relativeTime(new Date(iso), new Date(), i18n.language) });

  return (
    <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
      <section className="flex flex-col items-center">
        <AmSpieltisch title={t('start.illustration')} className="h-auto w-full max-w-[408px]" />
        <p className="mt-4 text-text-muted">{t('start.pre')}</p>
        <h1 className="mt-1 flex flex-wrap items-end justify-center gap-x-3 font-display text-[52px] leading-[1.05]">
          <span>{t('start.headline')}</span>
          <span className="relative italic text-opponent">
            {t('start.headlineWord')}
            <svg
              aria-hidden
              viewBox="0 0 140 14"
              fill="none"
              className="absolute -bottom-2 left-0 h-3 w-full overflow-visible"
              preserveAspectRatio="none"
            >
              <path
                d="M 3 8 C 34 3 80 2 137 5 M 14 12 C 50 9 92 9 128 10"
                stroke="var(--opponent)"
                strokeWidth={2.2}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </span>
        </h1>
      </section>

      <section className="flex flex-col gap-7">
        {latest ? (
          <>
            <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface-1 p-6">
              <span className="font-mono text-2xs text-text-subtle">{t('start.resume')}</span>
              <div className="flex items-start gap-4">
                <StartHandStrip cardIds={latest.stats.startHand} cards={cards} size="sm" max={3} />
                <div className="min-w-0">
                  <h2 className="font-display text-3xl leading-none">{latest.title}</h2>
                  <p className="mt-2 text-text-muted">
                    {latest.deckName ?? t('start.noDeck')} · {when(latest.updatedAt)}
                  </p>
                  <p className="mt-1 font-mono text-xs text-text-subtle">
                    {t('start.progress', {
                      steps: latest.stats.steps,
                      endboard: latest.stats.endboard ?? '–',
                    })}
                  </p>
                </div>
              </div>
              <div>
                <Button asChild>
                  <Link href={`/combos/${latest.id}`}>{t('start.open')}</Link>
                </Button>
              </div>
            </div>

            <div>
              <div className="flex items-end pb-2">
                <h2 className="flex-1 font-display text-2xl">
                  {recent.length > 0 && t('start.recent')}
                </h2>
                <NewComboButton decks={decks} variant="line" />
              </div>
              <ul>
                {recent.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/combos/${c.id}`}
                      className="flex h-15 items-center gap-5 border-b border-line px-1 transition-colors duration-(--motion-fast) hover:bg-surface-1"
                    >
                      <StartHandStrip cardIds={c.stats.startHand} cards={cards} max={3} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-lg leading-tight">
                          {c.title}
                        </span>
                        <span className="text-xs text-text-muted">
                          {c.deckName ?? t('start.noDeck')} ·{' '}
                          {t('start.lines', { count: c.stats.lines })}
                        </span>
                      </span>
                      <span
                        className="font-display text-xl leading-none"
                        title={t('library.col.endboard')}
                      >
                        {c.stats.endboard ?? ''}
                      </span>
                      <span className="w-24 text-right font-mono text-xs text-text-muted">
                        {when(c.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface-1 p-6">
            <div>
              <h2 className="font-display text-3xl leading-none">{t('start.firstSteps')}</h2>
              <p className="mt-2 text-text-muted">{t('start.firstStepsText')}</p>
            </div>
            <ol className="flex flex-col">
              {[
                ['1', t('start.stepImport'), '/decks'],
                ['2', t('start.stepHand'), '/combos'],
                ['3', t('start.stepPlay'), '/combos'],
              ].map(([n, label, href]) => (
                <li key={n}>
                  <Link
                    href={href}
                    className="flex h-11 items-center gap-4 border-b border-line hover:bg-surface-3/40"
                  >
                    <span className="w-4 font-mono text-sm text-text-subtle">{n}</span>
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </div>
  );
}
