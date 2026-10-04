'use client';

import { useCallback } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useSettings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Handschrift } from '@/components/motion/Handschrift';

/** Gesehene Hinweise lesen und merken, etwa wenn die passende Handlung den Hinweis erledigt */
export function useHints() {
  const { settings, update } = useSettings();
  const seen = useCallback((id: string) => settings.seenHints.includes(id), [settings.seenHints]);
  const markSeen = useCallback(
    (id: string) => {
      if (!settings.seenHints.includes(id)) update({ seenHints: [...settings.seenHints, id] });
    },
    [settings.seenHints, update]
  );
  return { seen, markSeen };
}

const ARROW: Record<'left' | 'up', string> = {
  // Kleines Dreieck in der Rahmenfarbe, das auf das erklärte Element zeigt
  left: 'before:absolute before:-left-[7px] before:top-4 before:border-y-[6px] before:border-r-[7px] before:border-y-transparent before:border-r-line-strong',
  up: 'before:absolute before:-top-[7px] before:right-6 before:border-x-[6px] before:border-b-[7px] before:border-x-transparent before:border-b-line-strong',
};

/**
 * Hinweis im Kontext, der nur einmal erscheint (UX-Plan 11). Schließen merkt ihn am Nutzer;
 * in den Einstellungen lassen sich alle Hinweise zurücksetzen. `arrow` zeigt zum Element,
 * das der Hinweis erklärt (UI-Sweep-Plan, Phase 3).
 */
export function OneTimeHint({
  id,
  arrow,
  className,
  children,
}: {
  id: string;
  arrow?: 'left' | 'up';
  className?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { seen, markSeen } = useHints();
  if (seen(id)) return null;
  return (
    // Eigenes AnimatePresence: Die Workbench liegt in einem mit initial={false}, das sonst auch
    // das Erscheinen und Aufschreiben dieses Hinweises beim Laden verschluckt
    <AnimatePresence>
      <motion.div
        role="note"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          'relative z-30 flex max-w-72 items-start gap-2 rounded-md border border-line-strong bg-surface-2 p-3 text-sm shadow-[0_12px_30px_rgb(0_0_0/0.45)]',
          arrow && ARROW[arrow],
          className
        )}
      >
        {/* Der Rotstift schreibt, sobald der Rahmen steht */}
        <Handschrift delay={0.15} className="flex-1 text-[15px] leading-snug">
          {children}
        </Handschrift>
        <button
          type="button"
          onClick={() => markSeen(id)}
          aria-label={t('hints.dismiss')}
          className="text-text-subtle hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
