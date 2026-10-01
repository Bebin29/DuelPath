'use client';

import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { CardView, type CardSize } from '@/components/cards/CardView';
import type { LibraryCard } from '@/lib/combo/library';

/** Starthand als Reihe von Artworks, etwa in Bibliothek und Start (UI-Plan 7.5.1 und 7.5.2) */
export function StartHandStrip({
  cardIds,
  cards,
  size = 'art',
  max = 5,
}: {
  cardIds: string[];
  cards: Record<string, LibraryCard>;
  size?: CardSize;
  max?: number;
}) {
  const cardLanguage = useCardLanguage();
  const name = (id: string) => {
    const c = cards[id];
    return (cardLanguage === 'de' && c?.nameDe) || c?.name || '?';
  };
  return (
    <span className="flex items-center gap-1" aria-label={cardIds.map(name).join(', ')}>
      {cardIds.slice(0, max).map((id, i) => (
        <CardView key={`${id}-${i}`} image={cards[id]?.imageSmall} label="" size={size} />
      ))}
      {cardIds.length > max && (
        <span className="font-mono text-2xs text-text-subtle">+{cardIds.length - max}</span>
      )}
    </span>
  );
}
