'use client';

import { X } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useSettings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';

/**
 * Hinweis im Kontext, der nur einmal erscheint (UX-Plan 11). Schließen merkt ihn am Nutzer;
 * in den Einstellungen lassen sich alle Hinweise zurücksetzen.
 */
export function OneTimeHint({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { settings, update } = useSettings();
  if (settings.seenHints.includes(id)) return null;
  return (
    <motion.div
      role="note"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'z-30 flex max-w-72 items-start gap-2 rounded-md border border-line-strong bg-surface-2 p-3 text-sm shadow-[0_12px_30px_rgb(0_0_0/0.45)]',
        className
      )}
    >
      <p className="flex-1 font-hand text-[15px] leading-snug text-opponent">{children}</p>
      <button
        type="button"
        onClick={() => update({ seenHints: [...settings.seenHints, id] })}
        aria-label={t('hints.dismiss')}
        className="text-text-subtle hover:text-ink"
      >
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}
