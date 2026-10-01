'use client';

import { cn } from '@/lib/utils';

/**
 * Hinweis mit Ablaufzeit (UI-Plan 7.2.4, Angebot): Ein feiner Balken zeigt die Restzeit.
 * Überfahren oder Fokus hält die Zeit an (WCAG 2.2.1), am Ende ruft er onExpire.
 */
export function TimedNotice({
  duration,
  onExpire,
  className,
  children,
}: {
  duration: number;
  onExpire: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'group relative flex items-center gap-1 overflow-hidden rounded-md border border-line bg-surface-2 py-1 pl-3 pr-1',
        className
      )}
    >
      {children}
      <span
        aria-hidden
        onAnimationEnd={onExpire}
        style={
          {
            animationDuration: `${duration}ms`,
            '--notice-duration': `${duration}ms`,
          } as React.CSSProperties
        }
        className="notice-timer absolute inset-x-0 bottom-0 h-px origin-left animate-[notice-countdown_linear_forwards] bg-line-strong group-focus-within:[animation-play-state:paused] group-hover:[animation-play-state:paused]"
      />
    </div>
  );
}
