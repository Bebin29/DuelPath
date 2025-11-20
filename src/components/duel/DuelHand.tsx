'use client';

import React from 'react';
import { DuelCard } from './DuelCard';
import { DuelActionMenu } from './DuelActionMenu';
import { useResponsiveLayout } from '@/lib/hooks/use-responsive-layout';
import { useDraggable } from '@dnd-kit/core';
import type { DuelCardInstance } from '@/types/duel.types';
import type { DragDropItem } from '@/lib/hooks/use-duel-drag-drop';

interface DuelHandProps {
  hand: DuelCardInstance[];
  onCardClick?: (cardInstanceId: string) => void; // Optional, wird durch ActionMenu ersetzt
}

/**
 * Draggable Card Komponente für die Hand
 */
function DraggableCard({
  cardInstance,
  children,
}: {
  cardInstance: DuelCardInstance;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: cardInstance.instanceId,
    data: {
      type: 'card',
      data: {
        cardInstance,
        zoneType: 'hand',
      },
    } as DragDropItem,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1000 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

/**
 * Hand-Karten Komponente
 * Zeigt die Handkarten des Spielers an
 */
export const DuelHand = React.memo(function DuelHand({ hand }: DuelHandProps) {
  const { adaptiveSizes, fontSize, isMobile } = useResponsiveLayout();

  return (
    <div>
      <h4 className={`font-medium mb-2 text-muted-foreground text-${fontSize}`}>
        Hand ({hand.length})
      </h4>
      <div className="flex overflow-x-auto pb-4" style={{ gap: `${adaptiveSizes.handGap}px` }}>
        {hand.map((card) => (
          <DuelActionMenu key={card.instanceId} cardInstanceId={card.instanceId}>
            <DraggableCard cardInstance={card}>
              <div
                className={`flex-shrink-0 transition-transform ${
                  isMobile ? '' : 'hover:scale-105'
                }`}
                style={{
                  // Auf mobilen Geräten kleinere Karten verwenden
                  transform: isMobile ? 'scale(0.9)' : undefined,
                }}
              >
                <DuelCard cardInstance={card} size="medium" readonly={false} />
              </div>
            </DraggableCard>
          </DuelActionMenu>
        ))}
      </div>
    </div>
  );
});
