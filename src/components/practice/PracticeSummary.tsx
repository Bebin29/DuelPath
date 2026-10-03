'use client';

import Link from 'next/link';
import { ExternalLink, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { CardView } from '@/components/cards/CardView';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import { formatDuration, totals, type PracticeAttempt } from '@/lib/deck/practice';
import { VerdictChip } from './VerdictChip';

/**
 * Auswertung eines Laufs (Lücke L2, Erfolgsbedingung): eine Zeile je Hand mit dem erreichten Ende,
 * dem besten bekannten und der Zeit. Die Hände unter dem besten bekannten Ende stehen oben zuerst
 * in der Zahl und sind in der Liste markiert.
 */
export function PracticeSummary({
  deckId,
  deckName,
  attempts,
  cards,
  onAgain,
}: {
  deckId: string;
  deckName: string;
  attempts: PracticeAttempt[];
  cards: Map<string, ComboCard>;
  onAgain: () => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const sum = totals(attempts);

  const facts: [string, string][] = [
    [t('practice.totals.short'), String(sum.short)],
    [t('practice.totals.equal'), String(sum.equal)],
    [t('practice.totals.ahead'), String(sum.ahead)],
    [t('practice.totals.time'), formatDuration(sum.ms)],
    [t('practice.totals.perHand'), formatDuration(sum.perHand)],
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto flex h-dvh w-full max-w-5xl flex-col gap-6 overflow-auto p-8"
      aria-label={t('practice.summaryTitle')}
    >
      <header className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-3xl">{t('practice.summaryTitle')}</h1>
        <span className="font-mono text-xs text-text-muted">{deckName}</span>
      </header>

      <p className="font-display text-2xl">
        {t('practice.summaryLead', { short: sum.short, played: sum.played })}
      </p>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 border-y border-line py-3 text-sm sm:grid-cols-5">
        {facts.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="font-mono text-2xs uppercase tracking-wide text-text-subtle">{label}</dt>
            <dd className="font-display text-2xl tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <ul className="flex flex-col">
        {attempts.map((a) => (
          <li
            key={a.number}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line py-3"
          >
            <span className="w-6 shrink-0 font-mono text-xs text-text-subtle">{a.number}</span>
            <ul aria-label={t('decks.hand')} className="flex shrink-0 gap-1">
              {a.hand.hand.map((id, i) => (
                <li key={`${id}-${i}`}>
                  <CardView
                    image={cards.get(id)?.imageSmall}
                    label={displayName(cards.get(id), cardLanguage)}
                    size="xs"
                  />
                </li>
              ))}
            </ul>
            <span className="shrink-0 font-mono text-sm tabular-nums">
              {t('practice.score', { reached: a.reached.interruptions, best: a.score.best })}
            </span>
            <VerdictChip verdict={a.score.verdict} className="shrink-0" />
            <span className="shrink-0 font-mono text-xs tabular-nums text-text-muted">
              {formatDuration(a.ms)}
            </span>
            <Link
              href={`/combos/${a.target.comboId}`}
              target="_blank"
              className="inline-flex min-w-0 flex-1 items-center gap-1 truncate text-sm text-text-muted hover:underline"
            >
              <span className="truncate">{a.target.title}</span>
              <ExternalLink className="size-3 shrink-0 text-text-subtle" />
            </Link>
          </li>
        ))}
      </ul>

      <footer className="mt-auto flex items-center gap-3 pt-4">
        <Button onClick={onAgain}>
          <RotateCcw />
          {t('practice.again')}
        </Button>
        <Button asChild variant="line">
          <Link href={`/decks/${deckId}?tab=hand`}>{t('practice.backToDeck')}</Link>
        </Button>
      </footer>
    </motion.section>
  );
}
