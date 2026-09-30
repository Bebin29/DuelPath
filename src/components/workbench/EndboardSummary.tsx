'use client';

import { Columns3, Flag } from 'lucide-react';
import { motion } from 'motion/react';
import { CountTo } from '@/components/motion/CountTo';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CardView } from '@/components/cards/CardView';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import type { EndboardCard, EndboardSummary as Summary } from '@/lib/combo/endboard';

export interface Weakness {
  step: number;
  staples: string[];
}

/** Rotstift-Kreis um eine Karte, die als Unterbrechung zählt (Motion-Szene „Endboard“) */
function PenCircle({ delay }: { delay: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 60 80"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -inset-1.5 overflow-visible"
    >
      <motion.path
        d="M31 3 C49 2 58 18 57 40 C56 63 45 78 29 77 C12 76 3 61 3 39 C3 18 14 5 33 4"
        fill="none"
        stroke="var(--opponent)"
        strokeWidth={1.6}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay, ease: [0.6, 0, 0.3, 1] }}
      />
    </svg>
  );
}

/**
 * Endboard-Zusammenfassung (UX-Plan 6.9, UI-Plan 7.4.5): große Zahl der Unterbrechungen,
 * die Karten mit Korrektur pro Karte, Ressourcen, Kosten, HOPTs und Schwachstellen.
 */
export function EndboardSummary({
  summary,
  cards,
  hopts,
  weaknesses,
  onCount,
  onCompare,
  showTitle = true,
}: {
  summary: Summary;
  cards: Map<string, ComboCard>;
  hopts: number;
  weaknesses: Weakness[];
  onCount: (instanceId: string, count: number) => void;
  onCompare?: () => void;
  /** Am END-Knoten steht „Endboard“ schon im Kopf des Inspectors */
  showTitle?: boolean;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const all = [...summary.field, ...summary.hand];
  let circled = 0;

  const card = (entry: EndboardCard, i: number) => {
    const data = cards.get(entry.placed.cardId);
    const name = displayName(data, cardLanguage);
    const counts = entry.count > 0;
    const delay = counts ? 0.35 + circled++ * 0.25 : 0;
    // Klick zählt weiter: 0, 1, 2, dann wieder 0
    const next = (entry.count + 1) % 3;
    return (
      <li key={entry.placed.instanceId} className="flex flex-col items-center gap-1">
        {/* Karten geben: Bogen, Drehung, Umdrehen im Flug (Szene „Endboard“) */}
        <motion.div
          className="relative [perspective:600px]"
          initial={{ opacity: 0, x: -30, y: -36, rotate: -10, rotateY: 90 }}
          animate={{ opacity: 1, x: 0, y: 0, rotate: 0, rotateY: 0 }}
          transition={{ type: 'spring', bounce: 0.25, visualDuration: 0.6, delay: i * 0.08 }}
        >
          <CardView
            image={data?.imageSmall}
            label={name}
            size="sm"
            faceDown={entry.placed.position === 'SET' ? 'self' : undefined}
          />
          {counts && <PenCircle key={entry.count} delay={delay} />}
        </motion.div>
        <button
          type="button"
          onClick={() => onCount(entry.placed.instanceId, next)}
          aria-label={t('endboard.countFor', { name, count: entry.count })}
          title={t('endboard.countHint')}
          className={cn(
            'rounded-sm px-1 font-mono text-[10.5px]',
            counts ? 'text-opponent' : 'text-text-subtle',
            entry.count !== entry.detected && 'underline decoration-dotted underline-offset-2'
          )}
        >
          {counts ? `✓ ${entry.count}` : '–'}
        </button>
      </li>
    );
  };

  const facts: [string, string | number][] = [
    [t('endboard.hand'), summary.hand.length],
    [t('endboard.gyEffects'), summary.gyEffects],
    [
      t('endboard.normalSummon'),
      summary.normalSummonLeft ? t('endboard.left') : t('endboard.used'),
    ],
    [t('endboard.startHand'), t('endboard.cardCombo', { count: summary.startHandUsed })],
    [t('endboard.hopts'), hopts],
    [t('endboard.lp'), summary.lp],
  ];

  return (
    <section aria-label={t('workbench.endboard')} className="flex flex-col gap-4">
      <header className="flex items-center gap-2">
        {showTitle && (
          <>
            <Flag className="size-4 text-text-subtle" />
            <h2 className="font-display text-2xl leading-tight">{t('workbench.endboard')}</h2>
          </>
        )}
        <span className="flex-1" />
        {onCompare && (
          <Button variant="text" size="sm" onClick={onCompare}>
            <Columns3 />
            {t('stress.compare')}
          </Button>
        )}
      </header>

      <div className="flex items-end gap-3">
        <CountTo
          to={summary.interruptions}
          delay={0.35}
          duration={Math.max(0.3, summary.interruptions * 0.25)}
          className="font-display text-[56px] leading-[0.85] tabular-nums"
        />
        <span className="pb-1 text-text-muted">
          {t('endboard.interruptions', { count: summary.interruptions })}
        </span>
      </div>

      {all.length > 0 && (
        <ul aria-label={t('endboard.cards')} className="flex flex-wrap gap-x-2.5 gap-y-3">
          {all.map(card)}
        </ul>
      )}

      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-t border-line pt-3 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-text-muted">{label}</dt>
            <dd className="text-right font-mono text-xs leading-5">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-line pt-3">
        <h3 className="mb-1.5 font-display text-base">{t('endboard.weaknesses')}</h3>
        {weaknesses.length === 0 ? (
          <p className="text-xs text-text-subtle">{t('endboard.noWeaknesses')}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-xs">
            {weaknesses.map((w) => (
              <li key={w.step} className="flex gap-2">
                <span className="shrink-0 whitespace-nowrap font-mono text-text-subtle">
                  {t('workbench.step', { n: w.step })}
                </span>
                <span className="text-opponent">{w.staples.join(' · ')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
