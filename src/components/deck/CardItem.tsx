"use client";

import type { Card } from "@prisma/client";
import { Button } from "@/components/components/ui/button";
import { Plus } from "lucide-react";
import Image from "next/image";

interface CardItemProps {
  card: Card;
  onAdd?: (cardId: string) => void;
  showAddButton?: boolean;
}

/**
 * Einzelne Karte in der Suchergebnis-Liste
 */
export function CardItem({ card, onAdd, showAddButton = true }: CardItemProps) {
  return (
    <div className="group relative rounded-lg border bg-card p-3 hover:shadow-md transition-shadow">
      <div className="flex gap-3">
        {/* Kartenbild */}
        {card.imageSmall && (
          <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded border">
            <Image
              src={card.imageSmall}
              alt={card.name}
              fill
              className="object-cover"
              sizes="56px"
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
              <> • {card.atk}/{card.def}</>
            )}
          </p>
          {card.archetype && (
            <p className="text-xs text-muted-foreground mt-1">
              {card.archetype}
            </p>
          )}
        </div>

        {/* Add Button */}
        {showAddButton && onAdd && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAdd(card.id)}
            className="flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

