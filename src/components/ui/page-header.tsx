import { cn } from '@/lib/utils';

/** Schrift der Seitentitel; auch für Titel, die als Eingabefeld editierbar sind */
export const PAGE_TITLE = 'font-display text-[32px] leading-none sm:text-[40px]';

/**
 * Kopf der Verwaltungsseiten (UI-Sweep-Plan, Phase 1): optional Zurück, Titel mit Kennzahlen,
 * Aktionen. Der Titel schrumpft nie auf null; wird es eng, rutschen die Aktionen in die nächste
 * Zeile.
 */
export function PageHeader({
  title,
  eyebrow,
  meta,
  back,
  actions,
  align = 'end',
  className,
  children,
}: {
  /** Text wird zur h1; eigene Elemente (etwa ein Eingabefeld) bringen ihre Rolle selbst mit */
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  meta?: React.ReactNode;
  back?: React.ReactNode;
  actions?: React.ReactNode;
  align?: 'start' | 'end';
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header
      className={cn(
        'flex flex-wrap gap-x-4 gap-y-3',
        align === 'end' ? 'items-end' : 'items-start',
        className
      )}
    >
      {back && <div className="mt-1.5 shrink-0 self-start">{back}</div>}
      <div className="min-w-0 flex-1 basis-56">
        {eyebrow && <div className="font-mono text-2xs text-text-subtle">{eyebrow}</div>}
        {typeof title === 'string' ? <h1 className={PAGE_TITLE}>{title}</h1> : title}
        {meta && <div className="mt-2 text-text-muted">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      {children}
    </header>
  );
}
