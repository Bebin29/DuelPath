import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Knöpfe nach UI-Plan 8.1 (Stil D): Tinte als Hauptaktion, Linie, Text, Geist, Gefahr.
 * `secondary` und `outline` bleiben als Namen für vorhandene Aufrufe erhalten.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-[background-color,color,box-shadow,scale] duration-(--motion-fast) active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:outline-opponent",
  {
    variants: {
      variant: {
        default: 'bg-primary font-semibold text-on-primary hover:bg-primary/90',
        line: 'border border-line bg-transparent text-ink hover:bg-surface-3',
        outline: 'border border-line bg-transparent text-ink hover:bg-surface-3',
        secondary: 'bg-surface-3 text-ink hover:bg-surface-3/70',
        ghost: 'text-text-muted hover:bg-surface-3 hover:text-ink',
        text: 'h-auto px-0 text-ink hover:underline hover:underline-offset-4',
        link: 'h-auto px-0 text-ink underline-offset-4 hover:underline',
        destructive:
          'bg-destructive font-semibold text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        // Auf Touch-Geräten wachsen die Knöpfe auf mindestens 40 px (UI-Sweep-Plan 4.3)
        default: 'h-8 px-3.5 pointer-coarse:h-10',
        sm: 'h-7 gap-1.5 px-2.5 text-xs pointer-coarse:h-10 pointer-coarse:px-3',
        lg: 'h-10 px-5',
        icon: 'size-8 pointer-coarse:size-10',
        'icon-sm': 'size-7 pointer-coarse:size-10',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
