'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';
import type { ComboStatus } from '@/lib/combo/library';

const TONE: Record<ComboStatus, string> = {
  DRAFT: 'border-line text-text-subtle',
  TESTED: 'border-self/50 text-self',
  TOURNAMENT: 'border-warning/60 text-warning',
};

/** Status einer Combo (UX-Plan 7.2): Entwurf, getestet, turnierfest */
export function StatusChip({ status, className }: { status: ComboStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center whitespace-nowrap rounded-sm border px-1.5 font-mono text-2xs',
        TONE[status],
        className
      )}
    >
      {t(`library.status.${status}`)}
    </span>
  );
}
