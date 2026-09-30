'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { EASE } from '@/lib/motion';
import { CountTo } from '@/components/motion/CountTo';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CardView } from '@/components/cards/CardView';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import type { EndboardSummary } from '@/lib/combo/endboard';

export interface CompareColumn {
  leafId: string;
  title: string;
  summary: EndboardSummary;
  /** Karten der Hauptline, die hier fehlen (Kartennamen als Passcode) */
  missing: string[];
}

/**
 * Vergleich der Endboards (UX-Plan 6.9, UI-Plan 7.4.5): bis zu vier Spalten, Hauptline links.
 * Fehlendes ist gestrichelt und blass, die stärkste Spalte trägt einen goldenen Rand.
 */
export function CompareView({
  columns,
  cards,
  onOpen,
  onClose,
}: {
  columns: CompareColumn[];
  cards: Map<string, ComboCard>;
  onOpen: (leafId: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const best = Math.max(...columns.map((c) => c.summary.interruptions));
  const main = columns[0]?.summary;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.section
      aria-label={t('stress.compare')}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-40 flex flex-col gap-4 overflow-auto bg-bg/95 p-6 backdrop-blur-[2px]"
    >
      <header className="flex items-center">
        <h2 className="flex-1 font-display text-3xl">{t('stress.compare')}</h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('workbench.close')}>
          <X />
        </Button>
      </header>
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
      >
        {columns.map((col, i) => {
          const s = col.summary;
          const field = s.field.map((c) => c.placed);
          return (
            <motion.button
              key={col.leafId}
              type="button"
              onClick={() => onOpen(col.leafId)}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', bounce: 0.15, visualDuration: 0.4, delay: i * 0.12 }}
              className={cn(
                'flex flex-col gap-3 rounded-lg border bg-surface-1 p-4 text-left transition-colors duration-(--motion-fast) hover:bg-surface-2',
                s.interruptions === best && best > 0
                  ? 'border-warning shadow-[0_0_0_1px_var(--warning)]'
                  : 'border-line'
              )}
            >
              <p className="truncate font-mono text-2xs uppercase tracking-wide text-text-subtle">
                {col.title}
              </p>
              <dl className="grid grid-cols-[1fr_auto] items-baseline gap-y-0.5 text-sm">
                <dt className="text-text-muted">{t('endboard.interruptionsLabel')}</dt>
                {/* Werte fallen vom Stand der Hauptline auf den des Branches */}
                <dd className="font-display text-3xl leading-none">
                  <CountTo
                    from={main?.interruptions ?? s.interruptions}
                    to={s.interruptions}
                    delay={0.2 + i * 0.12}
                    duration={0.4}
                    className="tabular-nums"
                  />
                </dd>
                <dt className="text-text-muted">{t('endboard.hand')}</dt>
                <dd className="font-mono text-xs">
                  <CountTo
                    from={main?.hand.length ?? s.hand.length}
                    to={s.hand.length}
                    delay={0.2 + i * 0.12}
                    duration={0.3}
                  />
                </dd>
              </dl>
              <ul className="flex min-h-12 flex-wrap gap-1">
                {field.map((c) => {
                  const card = cards.get(c.cardId);
                  return (
                    <li key={c.instanceId}>
                      <CardView
                        image={card?.imageSmall}
                        label={displayName(card, cardLanguage)}
                        size="xs"
                        faceDown={c.position === 'SET' ? 'self' : undefined}
                      />
                    </li>
                  );
                })}
                {col.missing.map((cardId, k) => {
                  const card = cards.get(cardId);
                  return (
                    <motion.li
                      key={`missing-${cardId}-${k}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.4 }}
                      transition={{ delay: 0.45 + i * 0.12 + k * 0.05 }}
                      className="relative rounded-sm"
                    >
                      <svg
                        aria-hidden
                        viewBox="0 0 34 49"
                        className="pointer-events-none absolute -inset-0.5 z-10 overflow-visible"
                      >
                        <motion.rect
                          x="0.5"
                          y="0.5"
                          width="33"
                          height="48"
                          rx="3"
                          fill="none"
                          stroke="var(--text-subtle)"
                          strokeDasharray="3 3"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, ease: EASE.smooth, delay: 0.45 + i * 0.12 }}
                        />
                      </svg>
                      <CardView
                        image={card?.imageSmall}
                        label={`${displayName(card, cardLanguage)} (${t('stress.missingLabel')})`}
                        size="xs"
                      />
                    </motion.li>
                  );
                })}
              </ul>
              {col.missing.length > 0 && (
                <p className="font-mono text-2xs text-opponent">
                  {t('stress.missing', { count: col.missing.length })}
                </p>
              )}
              <p className="mt-auto font-mono text-2xs text-text-subtle">
                {t('endboard.startHand')}: {s.startHandUsed}
              </p>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}
