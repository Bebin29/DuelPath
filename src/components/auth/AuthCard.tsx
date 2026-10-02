import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

/**
 * Rahmen der Anmeldeseiten in Stil D (UI-Sweep-Plan, Phase 1): Überschrift in der Display-Schrift,
 * kurzer Text, Formular, darunter der Wechsel zur anderen Seite.
 */
export function AuthCard({
  title,
  text,
  footer,
  children,
}: {
  title: string;
  text?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line bg-surface-1 p-6 sm:p-8">
      <h1 className="font-display text-[32px] leading-none">{title}</h1>
      {text && <p className="mt-2 text-sm text-text-muted">{text}</p>}
      <div className="mt-6">{children}</div>
      {footer && <p className="mt-6 text-center text-sm text-text-muted">{footer}</p>}
    </section>
  );
}

/** Beschriftetes Eingabefeld der Anmeldeformulare */
export function AuthField({
  label,
  className,
  ...props
}: React.ComponentProps<'input'> & { label: string; id: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={props.id} className="text-sm font-medium">
        {label}
      </label>
      <Input {...props} />
    </div>
  );
}

/** Fehlermeldung über dem Formular */
export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-opponent/40 bg-opponent/10 p-3 text-sm text-opponent"
    >
      {children}
    </p>
  );
}
