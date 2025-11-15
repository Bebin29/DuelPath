"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "@/lib/i18n/hooks";
import { Button } from "@/components/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/components/ui/card";
import { Plus, Minus, Trash2, ArrowRight } from "lucide-react";
import type { DeckCard } from "@prisma/client";
import type { Card as CardType } from "@prisma/client";
import type { DeckSection } from "@/lib/validations/deck.schema";
import Image from "next/image";
import { CardDetailDialog } from "./CardDetailDialog";

interface DeckCardWithCard extends DeckCard {
  card: CardType;
}

interface DeckListSectionProps {
  title: string;
  section: DeckSection;
  cards: DeckCardWithCard[];
  onIncreaseQuantity: (cardId: string, section: DeckSection) => void;
  onDecreaseQuantity: (cardId: string, section: DeckSection) => void;
  onRemove: (cardId: string, section: DeckSection) => void;
  onMove?: (cardId: string, fromSection: DeckSection, toSection: DeckSection) => void;
  showMoveButtons?: boolean;
}

/**
 * Deck-Sektion (Main/Extra/Side) mit Kartenliste
 */
function SortableDeckCardItem({
  deckCard,
  section,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemove,
  onMove,
  showMoveButtons,
  onCardClick,
}: {
  deckCard: DeckCardWithCard;
  section: DeckSection;
  onIncreaseQuantity: (cardId: string, section: DeckSection) => void;
  onDecreaseQuantity: (cardId: string, section: DeckSection) => void;
  onRemove: (cardId: string, section: DeckSection) => void;
  onMove?: (cardId: string, fromSection: DeckSection, toSection: DeckSection) => void;
  showMoveButtons: boolean;
  onCardClick: (card: CardType) => void;
}) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${deckCard.cardId}-${section}`,
    data: {
      type: "deckCard",
      cardId: deckCard.cardId,
      section,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 p-2 rounded border bg-card hover:bg-accent/50 transition-colors cursor-grab active:cursor-grabbing"
      onClick={() => onCardClick(deckCard.card)}
    >
      {/* Kartenbild */}
      {deckCard.card.imageSmall && (
        <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded border">
          <Image
            src={deckCard.card.imageSmall}
            alt={deckCard.card.name}
            fill
            className="object-cover"
            sizes="44px"
          />
        </div>
      )}

      {/* Karteninfo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">
            {deckCard.quantity}x
          </span>
          <span className="text-sm truncate">{deckCard.card.name}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {deckCard.card.type}
        </p>
      </div>

      {/* Aktionen */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onDecreaseQuantity(deckCard.cardId, section);
          }}
          disabled={deckCard.quantity <= 1}
          className="h-7 w-7 p-0"
        >
          <Minus className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onIncreaseQuantity(deckCard.cardId, section);
          }}
          disabled={deckCard.quantity >= 3}
          className="h-7 w-7 p-0"
        >
          <Plus className="h-3 w-3" />
        </Button>
        {showMoveButtons && onMove && (
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              // Move to next section (Main -> Extra -> Side -> Main)
              const sections: DeckSection[] = ["MAIN", "EXTRA", "SIDE"];
              const currentIndex = sections.indexOf(section);
              const nextSection = sections[(currentIndex + 1) % sections.length];
              onMove(deckCard.cardId, section, nextSection);
            }}
            className="h-7 w-7 p-0"
            title={t("deck.moveToMain")}
          >
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(deckCard.cardId, section);
          }}
          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export function DeckListSection({
  title,
  section,
  cards,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemove,
  onMove,
  showMoveButtons = false,
}: DeckListSectionProps) {
  const { t } = useTranslation();
  const totalCards = cards.reduce((sum, dc) => sum + dc.quantity, 0);
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: section,
    data: {
      type: "deckSection",
      section,
    },
  });

  function handleCardClick(card: CardType) {
    setSelectedCard(card);
    setDialogOpen(true);
  }

  return (
    <>
      <Card ref={setNodeRef} className={isOver ? "ring-2 ring-primary" : ""}>
      <CardHeader>
        <CardTitle className="text-lg">
          {title} ({totalCards})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {cards.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Keine Karten
          </p>
        ) : (
          <SortableContext
            items={cards.map((dc) => `${dc.cardId}-${section}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {cards.map((deckCard) => (
                <SortableDeckCardItem
                  key={`${deckCard.cardId}-${section}`}
                  deckCard={deckCard}
                  section={section}
                  onIncreaseQuantity={onIncreaseQuantity}
                  onDecreaseQuantity={onDecreaseQuantity}
                  onRemove={onRemove}
                  onMove={onMove}
                  showMoveButtons={showMoveButtons}
                  onCardClick={handleCardClick}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </CardContent>
    </Card>

    <CardDetailDialog
      card={selectedCard}
      open={dialogOpen}
      onOpenChange={setDialogOpen}
    />
    </>
  );
}


