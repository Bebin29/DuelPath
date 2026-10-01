import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Tastenkürzel neben einer Aktion (UI-Plan 3): leise, damit man es nebenbei lernt.
 * `keycap` zeigt eine echte Taste, etwa in der Tastaturhilfe. Auf Touch-Geräten ohne Tastatur
 * bleibt es verborgen.
 */
function Kbd({
  className,
  keycap = false,
  ...props
}: React.ComponentProps<'kbd'> & { keycap?: boolean }) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'font-mono text-2xs font-normal text-text-subtle pointer-coarse:hidden',
        keycap &&
          'inline-block rounded-md border border-b-[3px] border-line-strong bg-surface-2 px-1.5 pt-0.5 text-ink',
        '[[data-slot=button].bg-primary_&]:text-on-primary/55',
        className
      )}
      {...props}
    />
  );
}

export { Kbd };
