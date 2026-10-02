import { Ban, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Größen nach UI-Plan 5.1, Seitenverhältnis 59 : 86 */
export const CARD_SIZES = {
  /** Artwork-Ausschnitt für Choke-Point-Chips */
  dot: 16,
  art: 24,
  xs: 32,
  sm: 44,
  board: 56,
  lg: 120,
  xl: 240,
} as const;
export type CardSize = keyof typeof CARD_SIZES;

export interface CardViewProps {
  /** Bild der Karte, meist imageSmall; bei xl wird das volle Bild genutzt */
  image?: string | null;
  /** Zugänglicher Name, zum Beispiel „Aluber the Jester of Despia, Monsterzone 3, Angriff“ */
  label: string;
  size?: CardSize;
  selected?: boolean;
  /** Seit dem letzten Schritt neu in der Zone, Farbe nach Besitzer */
  isNew?: 'self' | 'opponent';
  negated?: boolean;
  warning?: boolean;
  /** Gesetzt: eigene Karten bleiben erkennbar, gegnerische zeigen die Rückseite */
  faceDown?: 'self' | 'opponent';
  defense?: boolean;
  dimmed?: boolean;
  /** Plakette oben links, zum Beispiel „CL2“ */
  chainLink?: number;
  /** Anzahl Xyz-Materialien, unten links */
  materials?: number;
  /** Link-Pfeile als kleine Dreiecke am Rand, ab Größe „board“ */
  linkMarkers?: string[] | null;
  className?: string;
  /** Breite aus dem Raster statt aus der Größe; die Größe bestimmt nur Plaketten und Bild */
  fluid?: boolean;
}

const fullImage = (src: string) => src.replace('_small.jpg', '.jpg');

/** Position und Richtung der Link-Pfeile, als CSS-Dreiecke in der Selbst-Farbe */
const LINK_ARROW: Record<string, string> = {
  Top: 'left-1/2 -top-1.5 -translate-x-1/2 border-x-[5px] border-b-[6px] border-b-primary',
  Bottom: 'left-1/2 -bottom-1.5 -translate-x-1/2 border-x-[5px] border-t-[6px] border-t-primary',
  Left: 'top-1/2 -left-1.5 -translate-y-1/2 border-y-[5px] border-r-[6px] border-r-primary',
  Right: 'top-1/2 -right-1.5 -translate-y-1/2 border-y-[5px] border-l-[6px] border-l-primary',
  'Top-Left': '-left-1 -top-1 border-l-[7px] border-t-[7px] border-l-primary border-t-primary',
  'Top-Right': '-right-1 -top-1 border-r-[7px] border-t-[7px] border-r-primary border-t-primary',
  'Bottom-Left':
    '-bottom-1 -left-1 border-b-[7px] border-l-[7px] border-b-primary border-l-primary',
  'Bottom-Right':
    '-bottom-1 -right-1 border-b-[7px] border-r-[7px] border-b-primary border-r-primary',
};

/**
 * Karte in allen Größen und Zuständen (UI-Plan 5). Plaketten in festen Ecken und
 * erst ab Größe „board“; darunter trägt die Karte nur Bild und Rahmen.
 */
export function CardView({
  image,
  label,
  size = 'board',
  selected,
  isNew,
  negated,
  warning,
  faceDown,
  defense,
  dimmed,
  chainLink,
  materials,
  linkMarkers,
  className,
  fluid,
}: CardViewProps) {
  const width = CARD_SIZES[size];
  const square = size === 'art' || size === 'dot';
  const height = square ? width : Math.round(width * (86 / 59));
  const plaques = width >= CARD_SIZES.board;
  const showBack = faceDown === 'opponent' || !image;
  const src = image ? (size === 'xl' ? fullImage(image) : image) : null;

  return (
    <div
      role="img"
      aria-label={label}
      data-size={size}
      className={cn(
        'relative shrink-0 select-none rounded-sm transition-[box-shadow,opacity,filter] duration-(--motion-base)',
        square && 'overflow-hidden',
        defense && 'rotate-90',
        dimmed && 'opacity-40',
        negated && 'saturate-[0.35]',
        selected && 'outline-[1.5px] outline-offset-2 outline-primary outline',
        warning && !selected && 'shadow-[0_0_0_1px_var(--warning)]',
        // Aufleuchten nach dem Schritt (UI-Plan 4.7, 600 ms), danach bleibt ein feiner Ring
        isNew === 'self' && 'card-flash card-flash-self shadow-[0_0_0_1.5px_var(--self)]',
        isNew === 'opponent' &&
          'card-flash card-flash-opponent shadow-[0_0_0_1.5px_var(--opponent)]',
        className
      )}
      style={fluid ? { width: '100%', aspectRatio: square ? '1' : '59 / 86' } : { width, height }}
    >
      {showBack ? (
        <div
          aria-hidden
          className="absolute inset-0 rounded-sm border border-line-strong/60 bg-surface-3"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, color-mix(in oklab, var(--ink) 9%, transparent) 0 1px, transparent 1px 5px)',
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- lokaler Bild-Cache, kein next/image-Optimierer nötig
        <img
          src={src ?? undefined}
          alt=""
          draggable={false}
          loading={size === 'board' || size === 'xl' ? 'eager' : 'lazy'}
          className={cn(
            'absolute inset-0 h-full w-full rounded-sm bg-surface-2 object-cover',
            square && 'scale-[1.25] object-[50%_30%]',
            faceDown === 'self' && 'brightness-[0.55]'
          )}
        />
      )}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-sm shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
      />

      {plaques && chainLink !== undefined && (
        <span className="absolute -left-1.5 -top-1.5 rounded-sm bg-chain-tint px-1 font-mono text-[9.5px] font-semibold text-chain">
          CL{chainLink}
        </span>
      )}
      {plaques && (negated || warning) && (
        <span className="absolute -right-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-bg">
          {negated ? (
            <Ban className="size-3 text-opponent" />
          ) : (
            <TriangleAlert className="size-3 text-warning" />
          )}
        </span>
      )}
      {plaques &&
        linkMarkers?.map((m) => (
          <span
            key={m}
            aria-hidden
            className={cn('absolute size-0 border-transparent', LINK_ARROW[m])}
          />
        ))}
      {plaques && materials !== undefined && materials > 0 && (
        <span className="absolute -bottom-1.5 -left-1.5 rounded-sm bg-bg px-1 font-mono text-[9.5px] text-ink">
          {materials}
        </span>
      )}
      {plaques && isNew && (
        <span
          aria-hidden
          className={cn(
            'absolute left-1 top-1 size-1.5 rounded-full',
            isNew === 'self' ? 'bg-self' : 'bg-opponent'
          )}
        />
      )}
    </div>
  );
}
