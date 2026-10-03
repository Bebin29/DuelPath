'use client';

import Link from 'next/link';
import { ArrowRight, ExternalLink, Flag, Timer } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { CardView } from '@/components/cards/CardView';
import { CountTo } from '@/components/motion/CountTo';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import { formatDuration, type PracticeAttempt } from '@/lib/deck/practice';
import { VerdictChip } from './VerdictChip';

/** Karten als Reihe kleiner Bilder; fehlende Karten stehen blass und gestrichelt */
function CardRow({
  ids,
  cards,
  label,
  faded,
}: {
  ids: string[];
  cards: Map<string, ComboCard>;
  label: string;
  faded?: boolean;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  if (ids.length === 0)
    return <p className="text-xs text-text-subtle">{t('practice.emptyBoard')}</p>;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-1.5">
      {ids.map((id, i) => (
        <li
          key={`${id}-${i}`}
          className={
            faded ? 'rounded-sm opacity-45 outline-1 outline-dashed outline-text-subtle' : ''
          }
        >
          <CardView
            image={cards.get(id)?.imageSmall}
            label={displayName(cards.get(id), cardLanguage)}
            size="sm"
          />
        </li>
      ))}
    </ul>
  );
}

/**
 * Auswertung einer Übungshand (Lücke L2): das eigene Ende neben dem besten bekannten, dazu die
 * Karten, die fehlen, und die gebrauchte Zeit. Erst hier werden die passenden Lines gezeigt.
 */
export function PracticeResult({
  attempt,
  cards,
  last,
  onNext,
  onQuit,
}: {
  attempt: PracticeAttempt;
  cards: Map<string, ComboCard>;
  /** Letzte Hand des Laufs: weiter geht es zur Auswertung */
  last: boolean;
  onNext: () => void;
  onQuit: () => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const { score, target, reached } = attempt;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto flex h-dvh w-full max-w-5xl flex-col gap-6 overflow-auto p-8"
      aria-label={t('practice.resultTitle')}
    >
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl">{t('practice.resultTitle')}</h1>
        <VerdictChip verdict={score.verdict} />
        <span className="flex-1" />
        <p className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-text-muted">
          <Timer className="size-3.5" />
          {formatDuration(attempt.ms)}
        </p>
      </header>

      <p className="text-sm text-text-muted">{t('practice.comparisonHint')}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface-1 p-5">
          <h2 className="font-mono text-2xs uppercase tracking-wide text-text-subtle">
            {t('practice.yourBoard')}
          </h2>
          <p className="flex items-end gap-2">
            <CountTo
              to={reached.interruptions}
              duration={0.4}
              className="font-display text-[56px] leading-[0.85] tabular-nums"
            />
            <span className="pb-1 text-text-muted">
              {t('endboard.interruptions', { count: reached.interruptions })}
            </span>
          </p>
          <CardRow ids={reached.field} cards={cards} label={t('practice.yourBoard')} />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface-1 p-5">
          <h2 className="font-mono text-2xs uppercase tracking-wide text-text-subtle">
            {t('practice.bestKnown')}
          </h2>
          <p className="flex items-end gap-2">
            <span className="font-display text-[56px] leading-[0.85] tabular-nums">
              {score.best}
            </span>
            <span className="pb-1 text-text-muted">
              {t('endboard.interruptions', { count: score.best })}
            </span>
          </p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Link
              href={`/combos/${target.comboId}${target.leafId ? `?step=${target.leafId}` : ''}`}
              target="_blank"
              className="inline-flex items-center gap-1 font-display text-lg hover:underline"
            >
              {target.title}
              <ExternalLink className="size-3.5 text-text-subtle" />
            </Link>
            <span className="font-mono text-2xs text-text-subtle">
              {t('practice.stepCount', { count: target.steps })}
            </span>
          </p>
          <CardRow ids={target.field} cards={cards} label={t('practice.bestKnown')} />
        </section>
      </div>

      {score.missing.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-xl text-opponent">
            {t('practice.missing', { count: score.missing.length })}
          </h2>
          <CardRow ids={score.missing} cards={cards} label={t('practice.missingLabel')} faded />
        </section>
      )}

      {attempt.hand.targets.length > 1 && (
        <section className="flex flex-col gap-1.5">
          <h2 className="font-display text-xl">{t('practice.alsoMatching')}</h2>
          <ul className="flex flex-col border-t border-line">
            {attempt.hand.targets
              .filter((x) => x.comboId !== target.comboId || x.leafId !== target.leafId)
              .map((x) => (
                <li
                  key={`${x.comboId}:${x.leafId ?? ''}`}
                  className="flex min-h-10 flex-wrap items-center gap-x-3 border-b border-line py-1.5"
                >
                  <Link
                    href={`/combos/${x.comboId}${x.leafId ? `?step=${x.leafId}` : ''}`}
                    target="_blank"
                    className="min-w-0 flex-1 truncate font-display text-base hover:underline"
                  >
                    {x.title}
                  </Link>
                  <span className="font-mono text-2xs text-text-subtle">
                    {x.startHand.map((id) => displayName(cards.get(id), cardLanguage)).join(' + ')}
                  </span>
                  <span className="font-mono text-xs text-text-muted">
                    {t('library.endboardCount', { count: x.interruptions })}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <footer className="mt-auto flex items-center gap-3 pt-4">
        <Button onClick={onNext}>
          {last ? <Flag /> : <ArrowRight />}
          {last ? t('practice.toSummary') : t('practice.nextHand')}
        </Button>
        <Button variant="line" onClick={onQuit}>
          {t('practice.quit')}
        </Button>
      </footer>
    </motion.section>
  );
}
