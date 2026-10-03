'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';
import type { PracticeVerdict } from '@/lib/deck/practice';

const TONE: Record<PracticeVerdict, string> = {
  short: 'border-opponent/50 bg-opponent-tint text-opponent',
  equal: 'border-line text-text-muted',
  ahead: 'border-warning/50 bg-warning-tint text-warning',
};

/** Wie die Hand ausging: unter dem besten bekannten Ende, gleichauf oder darüber */
export function VerdictChip({
  verdict,
  className,
}: {
  verdict: PracticeVerdict;
  className?: string;
}) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full border px-2.5 font-mono text-2xs uppercase tracking-wide',
        TONE[verdict],
        className
      )}
    >
      {t(`practice.verdict.${verdict}`)}
    </span>
  );
}
