import Link from 'next/link';
import { cn } from '@/lib/utils';

/**
 * Ganze Seite für 404 und Fehler in Stil D (UI-Sweep-Plan, Phase 1): Wortmarke, Kennung in Mono,
 * Überschrift, ein Satz und der Weg zurück. Ohne App-Kopfzeile, damit sie auch ohne Anmeldung trägt.
 */
export function StatusPage({
  code,
  title,
  text,
  actions,
  appName,
  children,
  className,
}: {
  code?: string;
  title: string;
  text?: string;
  actions?: React.ReactNode;
  appName: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <main className={cn('flex min-h-dvh flex-col px-4 py-6 sm:px-8', className)}>
      <Link href="/" className="font-display text-2xl leading-none text-ink">
        {appName}
      </Link>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-3 py-16">
        {code && <p className="font-mono text-xs text-opponent">{code}</p>}
        <h1 className="font-display text-[40px] leading-none sm:text-[52px]">{title}</h1>
        {text && <p className="text-text-muted">{text}</p>}
        {children}
        {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </main>
  );
}
