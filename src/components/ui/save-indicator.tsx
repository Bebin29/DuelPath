'use client';

import { CloudOff, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';
import { EASE } from '@/lib/motion';

/** conflict: seit dem Laden hat jemand anderes gespeichert, etwa ein Agent über die API */
export type SaveStatus = 'saved' | 'saving' | 'error' | 'conflict';

/**
 * Speicherstand (UI-Plan 7.1, Motion-Szene „Mikro“, Speichern): „speichert …“ schimmert,
 * danach zeichnet sich der Haken; ein Fehler schüttelt kurz und bietet „Erneut versuchen“.
 */
export function SaveIndicator({
  status,
  onRetry,
  className,
}: {
  status: SaveStatus;
  onRetry?: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn('flex items-center justify-end gap-1.5 font-mono text-2xs', className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        {status === 'conflict' ? (
          <motion.button
            key="conflict"
            type="button"
            onClick={() => window.location.reload()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-warning hover:underline"
          >
            <RefreshCw className="size-3" />
            {t('combo.conflict')}
          </motion.button>
        ) : status === 'error' ? (
          <motion.button
            key="error"
            type="button"
            onClick={onRetry}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, x: [0, -5, 5, -3, 3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'linear' }}
            className="flex items-center gap-1.5 text-opponent hover:underline"
          >
            <CloudOff className="size-3" />
            {t('combo.saveError')}
          </motion.button>
        ) : (
          <motion.span
            key={status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: EASE.out }}
            className="flex items-center gap-1.5 text-text-subtle"
          >
            {status === 'saved' && (
              <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                <motion.path
                  d="M2 6.5 4.8 9 10 3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.32, ease: EASE.smooth }}
                />
              </svg>
            )}
            <span className={cn(status === 'saving' && 'animate-shimmer')}>
              {t(status === 'saving' ? 'combo.saving' : 'combo.saved')}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
