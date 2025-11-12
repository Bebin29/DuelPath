"use client";

import { useTranslation } from "@/lib/i18n/hooks";
import { Button } from "@/components/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/components/ui/card";
import { Plus, Minus, Trash2, ArrowRight } from "lucide-react";
import type { DeckCard } from "@prisma/client";
import type { Card as CardType } from "@prisma/client";
import type { DeckSection } from "@/lib/validations/deck.schema";
import Image from "next/image";

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

  return (
    <Card>
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
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {cards.map((deckCard) => (
              <div
                key={`${deckCard.cardId}-${section}`}
                className="flex items-center gap-3 p-2 rounded border bg-card hover:bg-accent/50 transition-colors"
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
                    onClick={() => onDecreaseQuantity(deckCard.cardId, section)}
                    disabled={deckCard.quantity <= 1}
                    className="h-7 w-7 p-0"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onIncreaseQuantity(deckCard.cardId, section)}
                    disabled={deckCard.quantity >= 3}
                    className="h-7 w-7 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  {showMoveButtons && onMove && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
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
                    onClick={() => onRemove(deckCard.cardId, section)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

