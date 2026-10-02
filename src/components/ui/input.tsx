import * as React from 'react';

import { cn } from '@/lib/utils';

/** Eingabefeld in Stil D: Linie auf Fläche, kräftigere Linie im Fokus, 40 px auf Touch-Geräten */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-line bg-surface-1 px-3 text-sm text-ink outline-none transition-colors duration-(--motion-fast) placeholder:text-text-subtle pointer-coarse:h-10 pointer-coarse:text-base',
        'hover:border-line-strong focus-visible:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/40',
        'disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-opponent',
        'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        className
      )}
      {...props}
    />
  );
}

export { Input };
