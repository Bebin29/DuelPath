'use client';

import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { CardView, type CardSize } from '@/components/cards/CardView';
import { CardPreview } from '@/components/cards/CardPreview';
import { displayName } from '@/lib/combo/cards';
import type { DeckViewCard } from '@/server/actions/deck-view.actions';

/**
 * Raster für Kartenkacheln (UI-Sweep-Plan, Phase 2): auf dem Handy feste Spaltenzahl mit
 * fließender Kartenbreite, ab `sm` Kacheln mit 120 px.
 */
export const cardGrid = (phoneColumns: 3 | 4 = 3) =>
  cn(
    'grid gap-3 sm:grid-cols-[repeat(auto-fill,120px)] sm:gap-4',
    phoneColumns === 4 ? 'grid-cols-4' : 'grid-cols-3'
  );

/**
 * Karte im Deckraster (UI-Plan 7.5.4): Artwork mit Anzahl-Plakette, Vorschau beim Überfahren,
 * Schnellaktionen erscheinen beim Überfahren oder Fokus unten auf der Karte, auf Touch-Geräten
 * immer.
 */
export function CardTile({
  card,
  quantity,
  size = 'lg',
  selected,
  dimmed,
  label,
  onClick,
  actions,
  footer,
  fluid,
}: {
  card: DeckViewCard;
  quantity?: number;
  size?: CardSize;
  selected?: boolean;
  dimmed?: boolean;
  /** Zugänglicher Name des Klicks, etwa „Auf die Starthand“ */
  label?: string;
  onClick?: () => void;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** Breite aus dem Raster (siehe cardGrid) */
  fluid?: boolean;
}) {
  const cardLanguage = useCardLanguage();
  const name = displayName(card, cardLanguage);
  return (
    <div className={cn('group relative flex flex-col items-center gap-1', fluid && 'w-full')}>
      <CardPreview card={card}>
        <button
          type="button"
          onClick={onClick}
          aria-label={label ? `${name}: ${label}` : name}
          aria-pressed={selected}
          className={cn(
            'rounded-sm outline-none focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-primary',
            fluid && 'w-full'
          )}
        >
          <CardView
            image={card.imageSmall}
            label={name}
            size={size}
            selected={selected}
            dimmed={dimmed}
            warning={card.banTcg === 'Forbidden'}
            fluid={fluid}
          />
        </button>
      </CardPreview>
      {quantity !== undefined && quantity > 1 && (
        <span className="pointer-events-none absolute right-1 top-1 rounded-sm bg-ink px-1 font-mono text-2xs font-semibold text-on-primary">
          ×{quantity}
        </span>
      )}
      {actions && (
        <div
          className={cn(
            'absolute inset-x-0 bottom-1 flex justify-center gap-0.5 opacity-0 transition-opacity duration-(--motion-fast)',
            'group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100'
          )}
        >
          {actions}
        </div>
      )}
      {footer}
    </div>
  );
}

/** Kleiner runder Knopf für die Aktionen auf einer Kachel */
export function TileAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-6 place-items-center rounded-full border border-line-strong bg-surface-2 text-ink shadow-[0_2px_6px_rgb(0_0_0/0.4)] hover:bg-surface-3 pointer-coarse:size-8 [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}
