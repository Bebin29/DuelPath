'use client';

import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Seitenleiste in Stil D (UI-Sweep-Plan, Phase 1): auf dem Handy von unten über die volle Breite,
 * ab `sm` rechts am Rand. Für Kartenansicht, Kartensuche im Deck und Filter der Bibliothek.
 */
const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> & {
    /** Breite ab `sm`; auf dem Handy immer volle Breite */
    width?: string;
    /** false: der Inhalt bringt einen eigenen Schließen-Knopf mit */
    closeLabel?: string | false;
  }
>(({ className, children, width = 'sm:w-[480px]', closeLabel, ...props }, ref) => {
  const { t } = useTranslation();
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
      <SheetPrimitive.Content
        ref={ref}
        className={cn(
          'fixed z-50 flex flex-col bg-surface-1 shadow-[0_0_60px_rgb(0_0_0/0.5)] outline-none data-[state=open]:animate-in',
          // Handy: Blatt von unten mit Griffleiste und Safe-Area
          'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl border-t border-line pb-[env(safe-area-inset-bottom)] data-[state=open]:slide-in-from-bottom',
          // ab sm: Leiste rechts über die volle Höhe
          'sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:max-h-none sm:max-w-full sm:rounded-none sm:border-l sm:border-t-0 sm:pb-0 sm:data-[state=open]:slide-in-from-right sm:data-[state=open]:slide-in-from-bottom-0',
          width,
          className
        )}
        {...props}
      >
        <div
          aria-hidden
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden"
        />
        {children}
        {closeLabel !== false && (
          <SheetPrimitive.Close
            aria-label={closeLabel ?? t('workbench.close')}
            className="absolute right-3 top-3 grid size-8 place-items-center rounded-md text-text-muted hover:bg-surface-3 hover:text-ink pointer-coarse:size-10"
          >
            <X className="size-4" />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
});
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn('font-display text-2xl leading-tight', className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle };
