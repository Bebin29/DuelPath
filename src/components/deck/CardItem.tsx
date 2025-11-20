'use client';

import { useState, memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '@prisma/client';
import { Button } from '@/components/components/ui/button';
import { Plus } from 'lucide-react';
import Image from 'next/image';
import { CardDetailDialog } from './CardDetailDialog';
import { useCardPrefetch } from '@/lib/hooks/use-card-prefetch';

interface CardItemProps {
  card: Card;
  onAdd?: (cardId: string) => void;
  showAddButton?: boolean;
}

/**
 * Einzelne Karte in der Suchergebnis-Liste
 */
function CardItemComponent({ card, onAdd, showAddButton = true }: CardItemProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { prefetchCard, cancelPrefetch } = useCardPrefetch({ delay: 200 });

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.id,
    data: {
      type: 'card',
      card,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className="group relative rounded-lg border bg-card p-3 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
        onClick={() => setDialogOpen(true)}
        onMouseEnter={() => prefetchCard(card.id)}
        onMouseLeave={() => cancelPrefetch(card.id)}
      >
        <div className="flex gap-3">
          {/* Kartenbild */}
          {card.imageSmall && (
            <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded border">
              <Image
                src={card.imageSmall}
                alt={card.name}
                fill
                className="object-cover"
                sizes="56px"
                loading="lazy"
              />
            </div>
          )}

          {/* Karteninfo */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{card.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {card.type}
              {card.attribute && ` • ${card.attribute}`}
              {card.level && ` • Lv.${card.level}`}
              {card.atk !== null && card.def !== null && (
                <>
                  {' '}
                  • {card.atk}/{card.def}
                </>
              )}
            </p>
            {card.archetype && (
              <p className="text-xs text-muted-foreground mt-1">{card.archetype}</p>
            )}
          </div>

          {/* Add Button */}
          {showAddButton && onAdd && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onAdd(card.id);
              }}
              className="flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <CardDetailDialog
        card={card}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAddToDeck={onAdd}
      />
    </>
  );
}

// Memoized Component für Performance
export const CardItem = memo(CardItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.card.id === nextProps.card.id &&
    prevProps.showAddButton === nextProps.showAddButton &&
    prevProps.onAdd === nextProps.onAdd
  );
});
