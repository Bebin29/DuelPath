'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { SPRING } from '@/lib/motion';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Kbd } from '@/components/ui/kbd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import type { GameState } from '@/lib/combo/state';
import { cardActions, type CardAction } from '@/lib/combo/card-actions';

export interface MenuAnchor {
  instanceId: string;
  x: number;
  y: number;
}

/**
 * Aktionsmenü an der Karte (UX-Plan 6.3, UI-Plan 7.4.1): oben die Effekte mit OPT-Stand,
 * darunter Beschwören, Setzen und Bewegen. Jede Zeile nennt ihr Kürzel, das auch ohne Menü wirkt.
 */
export function CardMenu({
  anchor,
  state,
  cards,
  onRun,
  onClose,
  onOpenCard,
}: {
  anchor: MenuAnchor | null;
  state: GameState;
  cards: Map<string, ComboCard>;
  onRun: (action: CardAction) => void;
  onClose: () => void;
  onOpenCard?: (cardId: string) => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const [highlight, setHighlight] = useState<string | null>(null);
  const placed = anchor ? state.cards[anchor.instanceId] : undefined;
  const { effects, other } = anchor
    ? cardActions(state, cards, anchor.instanceId)
    : { effects: [], other: [] };

  return (
    <DropdownMenu open={Boolean(placed)} onOpenChange={(open) => !open && onClose()}>
      <DropdownMenuTrigger asChild>
        <span
          aria-hidden
          className="pointer-events-none fixed size-0"
          style={{ left: anchor?.x ?? 0, top: anchor?.y ?? 0 }}
        />
      </DropdownMenuTrigger>
      {/* Menü wächst aus der Kartenkante (Szene „Aktionsmenü“), Hervorhebung gleitet mit */}
      <DropdownMenuContent
        align="start"
        side="right"
        className="w-80 duration-200 data-[state=closed]:zoom-out-50 data-[state=open]:zoom-in-50"
      >
        {placed && (
          <DropdownMenuLabel className="font-display text-base text-ink">
            {displayName(cards.get(placed.cardId), cardLanguage)}
          </DropdownMenuLabel>
        )}
        {effects.map((action) => (
          <DropdownMenuItem
            key={action.id}
            onSelect={() => onRun(action)}
            onFocus={() => setHighlight(action.id)}
            className="relative isolate h-auto flex-col items-stretch gap-0.5 py-1.5 data-[highlighted]:bg-transparent data-[highlighted]:shadow-none"
          >
            <Highlight on={highlight === action.id} />
            <span className="flex items-center gap-2">
              <span>{t('workbench.actions.effect', { n: action.key })}</span>
              {action.opt && (
                <span
                  className={cn(
                    'font-mono text-[10px]',
                    action.free ? 'text-text-subtle' : 'text-warning'
                  )}
                >
                  {action.opt}{' '}
                  {action.free ? t('workbench.actions.hoptFree') : t('workbench.actions.hoptUsed')}
                </span>
              )}
              <span className="flex-1" />
              {action.key && <Kbd>{action.key}</Kbd>}
            </span>
            <span lang="en" className="line-clamp-2 text-xs leading-snug text-text-muted">
              {action.effectText}
            </span>
          </DropdownMenuItem>
        ))}
        {effects.length > 0 && other.length > 0 && <DropdownMenuSeparator />}
        {placed && onOpenCard && (
          <DropdownMenuItem onSelect={() => onOpenCard(placed.cardId)}>
            <span className="flex-1">{t('cardSheet.view')}</span>
          </DropdownMenuItem>
        )}
        {placed && onOpenCard && <DropdownMenuSeparator />}
        {other.map((action) => (
          <DropdownMenuItem
            key={action.id}
            onSelect={() => onRun(action)}
            onFocus={() => setHighlight(action.id)}
            className="relative isolate data-[highlighted]:bg-transparent data-[highlighted]:shadow-none"
          >
            <Highlight on={highlight === action.id} />
            <span className="flex-1">{t(`workbench.actions.${action.label}`)}</span>
            {action.key && <Kbd>{action.key}</Kbd>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Gleitende Hervorhebung hinter dem gewählten Eintrag */
function Highlight({ on }: { on: boolean }) {
  if (!on) return null;
  return (
    <motion.span
      layoutId="card-menu-highlight"
      transition={SPRING.snappy}
      className="absolute inset-0 -z-10 rounded-md bg-ink/9 shadow-[inset_2px_0_0_var(--ink)]"
    />
  );
}
