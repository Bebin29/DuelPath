'use client';

import React, { useMemo } from 'react';
import { Card } from '@/components/components/ui/card';
import { DuelCard } from './DuelCard';
import { useResponsiveLayout } from '@/lib/hooks/use-responsive-layout';
import { useDroppable } from '@dnd-kit/core';
import type { DuelCardInstance, PlayerId } from '@/types/duel.types';

interface DuelFieldProps {
  player: PlayerId;
  monsterZone: (DuelCardInstance | null)[];
  spellTrapZone: (DuelCardInstance | null)[];
  graveyard: DuelCardInstance[];
  deck: DuelCardInstance[];
  extraDeck: DuelCardInstance[];
  fieldSpell?: DuelCardInstance | null;
  readonly?: boolean;
}

/**
 * Droppable Zone für Drag & Drop
 */
function DroppableZone({
  id,
  children,
  isOccupied = false,
  className = '',
}: {
  id: string;
  children: React.ReactNode;
  isOccupied?: boolean;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${
        isOver
          ? isOccupied
            ? 'ring-2 ring-red-500 bg-red-500/10'
            : 'ring-2 ring-green-500 bg-green-500/10'
          : ''
      } transition-all duration-200`}
    >
      {children}
    </div>
  );
}

/**
 * Duell-Feld Komponente
 * Zeigt Monster-Zone, Spell/Trap-Zone, Friedhof, Decks, Field-Spell
 */
export const DuelField = React.memo(function DuelField({
  player,
  monsterZone,
  spellTrapZone,
  graveyard,
  deck,
  extraDeck,
  fieldSpell,
  readonly = false,
}: DuelFieldProps) {
  const { adaptiveSizes, fontSize } = useResponsiveLayout();

  return (
    <div className="space-y-4">
      {/* Monster-Zone */}
      <div>
        <h4 className={`font-medium mb-2 text-muted-foreground text-${fontSize}`}>Monster Zone</h4>
        <div className="flex justify-center" style={{ gap: `${adaptiveSizes.fieldGap}px` }}>
          {monsterZone.map((card, index) => (
            <DroppableZone
              key={`monster-${index}`}
              id={`monster-zone-${index}`}
              isOccupied={card !== null}
            >
              <Card
                className="flex items-center justify-center border-dashed"
                style={{
                  width: `${adaptiveSizes.cardWidth}px`,
                  height: `${adaptiveSizes.cardHeight}px`,
                }}
              >
                {card ? (
                  <DuelCard cardInstance={card} size="small" readonly={readonly} />
                ) : (
                  <div className={`text-muted-foreground text-${fontSize}`}>Empty</div>
                )}
              </Card>
            </DroppableZone>
          ))}
        </div>
      </div>

      {/* Spell/Trap-Zone */}
      <div>
        <h4 className={`font-medium mb-2 text-muted-foreground text-${fontSize}`}>
          Spell & Trap Zone
        </h4>
        <div className="flex justify-center" style={{ gap: `${adaptiveSizes.fieldGap}px` }}>
          {spellTrapZone.map((card, index) => (
            <DroppableZone
              key={`spell-${index}`}
              id={`spell-trap-zone-${index}`}
              isOccupied={card !== null}
            >
              <Card
                className="flex items-center justify-center border-dashed"
                style={{
                  width: `${adaptiveSizes.cardWidth}px`,
                  height: `${adaptiveSizes.cardHeight}px`,
                }}
              >
                {card ? (
                  <DuelCard cardInstance={card} size="small" readonly={readonly} />
                ) : (
                  <div className={`text-muted-foreground text-${fontSize}`}>Empty</div>
                )}
              </Card>
            </DroppableZone>
          ))}
        </div>
      </div>

      {/* Field Spell Zone */}
      <div className="flex justify-center">
        <Card
          className="flex items-center justify-center border-dashed"
          style={{
            width: `${adaptiveSizes.cardWidth}px`,
            height: `${adaptiveSizes.cardHeight}px`,
          }}
        >
          <div className={`text-muted-foreground text-${fontSize}`}>Field</div>
        </Card>
      </div>

      {/* Deck, Extra Deck, Graveyard */}
      <div className="flex justify-center" style={{ gap: `${adaptiveSizes.fieldGap * 2}px` }}>
        {/* Deck */}
        <div className="text-center">
          <h4 className={`font-medium mb-2 text-muted-foreground text-${fontSize}`}>
            Deck ({deck.length})
          </h4>
          <Card
            className="flex items-center justify-center bg-blue-50 dark:bg-blue-950"
            style={{
              width: `${adaptiveSizes.cardWidth}px`,
              height: `${adaptiveSizes.cardHeight}px`,
            }}
          >
            <div className={`text-muted-foreground text-${fontSize}`}>
              {deck.length > 0 ? 'Cards' : 'Empty'}
            </div>
          </Card>
        </div>

        {/* Extra Deck */}
        <div className="text-center">
          <h4 className={`font-medium mb-2 text-muted-foreground text-${fontSize}`}>
            Extra ({extraDeck.length})
          </h4>
          <Card
            className="flex items-center justify-center bg-purple-50 dark:bg-purple-950"
            style={{
              width: `${adaptiveSizes.cardWidth}px`,
              height: `${adaptiveSizes.cardHeight}px`,
            }}
          >
            <div className={`text-muted-foreground text-${fontSize}`}>
              {extraDeck.length > 0 ? 'Cards' : 'Empty'}
            </div>
          </Card>
        </div>

        {/* Graveyard */}
        <div className="text-center">
          <h4 className={`font-medium mb-2 text-muted-foreground text-${fontSize}`}>
            GY ({graveyard.length})
          </h4>
          <Card
            className="flex items-center justify-center bg-red-50 dark:bg-red-950"
            style={{
              width: `${adaptiveSizes.cardWidth}px`,
              height: `${adaptiveSizes.cardHeight}px`,
            }}
          >
            <div className={`text-muted-foreground text-${fontSize}`}>
              {graveyard.length > 0 ? 'Cards' : 'Empty'}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
});
