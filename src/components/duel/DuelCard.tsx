'use client';

import React from 'react';
import { useCardCache } from '@/lib/hooks/use-card-cache';
import { OptimizedImage } from '@/components/common/OptimizedImage';
import { Card } from '@/components/components/ui/card';
import { Badge } from '@/components/components/ui/badge';
import type { DuelCardInstance } from '@/types/duel.types';

interface DuelCardProps {
  cardInstance: DuelCardInstance;
  size?: 'small' | 'medium' | 'large';
  readonly?: boolean;
}

/**
 * Einzelne Karte im Duell
 * Zeigt Kartenbild, Position-Indikator, Face-up/down Status
 */
export const DuelCard = React.memo(function DuelCard({
  cardInstance,
  size = 'medium',
  readonly = false,
}: DuelCardProps) {
  const { getCardData } = useCardCache();
  const cardData = getCardData(cardInstance.cardId);

  const sizeClasses = {
    small: 'w-16 h-24',
    medium: 'w-20 h-28',
    large: 'w-24 h-32',
  };

  const isFaceDown =
    cardInstance.position === 'FACE_DOWN_ATTACK' || cardInstance.position === 'FACE_DOWN_DEFENSE';

  return (
    <Card
      className={`${sizeClasses[size]} relative overflow-hidden ${
        readonly ? 'cursor-default' : 'cursor-pointer hover:shadow-lg transition-shadow'
      }`}
    >
      {cardData ? (
        <>
          {/* Kartenbild */}
          <div className="relative w-full h-full">
            {isFaceDown ? (
              // Face-down: Zeige Kartenrücken
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                <div className="text-white text-xs font-bold transform -rotate-90">YU-GI-OH!</div>
              </div>
            ) : (
              // Face-up: Zeige Kartenbild
              <OptimizedImage
                src={cardData.imageSmall || cardData.imageUrl || ''}
                alt={cardData.name}
                fill
                className="object-cover"
                sizes={`${size === 'small' ? '64px' : size === 'medium' ? '80px' : '96px'}`}
              />
            )}

            {/* Position-Indikator */}
            <div className="absolute top-1 right-1">
              <Badge
                variant="secondary"
                className="text-xs px-1 py-0 h-4 bg-black/70 text-white border-none"
              >
                {cardInstance.position.includes('ATTACK') ? 'ATK' : 'DEF'}
              </Badge>
            </div>

            {/* Attack-Flag */}
            {cardInstance.hasAttackedThisTurn && (
              <div className="absolute bottom-1 right-1">
                <Badge variant="destructive" className="text-xs px-1 py-0 h-4">
                  ⚔️
                </Badge>
              </div>
            )}
          </div>
        </>
      ) : (
        // Loading state
        <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
          <div className="text-xs text-muted-foreground">Loading...</div>
        </div>
      )}
    </Card>
  );
});
