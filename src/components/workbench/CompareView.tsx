'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { motion } from 'motion/react';
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
                <dd className="font-display text-3xl leading-none">{s.interruptions}</dd>
                <dt className="text-text-muted">{t('endboard.hand')}</dt>
                <dd className="font-mono text-xs">{s.hand.length}</dd>
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
                    <li
                      key={`missing-${cardId}-${k}`}
                      className="rounded-sm opacity-40 outline-dashed outline-1 outline-offset-1 outline-text-subtle"
                    >
                      <CardView
                        image={card?.imageSmall}
                        label={`${displayName(card, cardLanguage)} (${t('stress.missingLabel')})`}
                        size="xs"
                      />
                    </li>
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
