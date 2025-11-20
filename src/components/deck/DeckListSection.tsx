'use client';

import { useState, memo, useMemo, useCallback, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from '@/lib/i18n/hooks';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/components/ui/card';
import { Plus, Minus, Trash2, ArrowRight, Loader2, AlertTriangle, Checkbox } from 'lucide-react';
import { Checkbox as UICheckbox } from '@/components/components/ui/checkbox';
import type { DeckCard } from '@prisma/client';
import type { DeckSection } from '@/lib/validations/deck.schema';
import type { CardForDeck } from '@/lib/hooks/use-deck-history';
import Image from 'next/image';
import { CardDetailDialog } from './CardDetailDialog';
import {
  VIRTUALIZATION_THRESHOLD_DECK_LIST,
  ESTIMATED_DECK_CARD_HEIGHT,
  VIRTUALIZATION_OVERSCAN,
  MAX_CARD_COPIES,
} from '@/lib/constants/deck.constants';
import { Skeleton } from '@/components/components/ui/skeleton';
import { validateCardInDeck } from '@/lib/validations/deck.schema';

interface DeckCardWithCard extends DeckCard {
  card: CardForDeck;
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
  onCardClick: (card: CardForDeck) => void;
  pendingOperations?: Map<string, string>;
  allDeckCards?: DeckCardWithCard[]; // Für Validierung
  selectedCardIds?: Set<string>; // Multi-Select
  onToggleCardSelection?: (cardId: string) => void; // Multi-Select
}

/**
 * Deck-Sektion (Main/Extra/Side) mit Kartenliste
 */
const SortableDeckCardItem = memo(function SortableDeckCardItem({
  deckCard,
  section,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemove,
  onMove,
  showMoveButtons,
  onCardClick,
  isPending,
  allDeckCards,
  isSelected,
  onToggleSelection,
}: {
  deckCard: DeckCardWithCard;
  section: DeckSection;
  onIncreaseQuantity: (cardId: string, section: DeckSection) => void;
  onDecreaseQuantity: (cardId: string, section: DeckSection) => void;
  onRemove: (cardId: string, section: DeckSection) => void;
  onMove?: (cardId: string, fromSection: DeckSection, toSection: DeckSection) => void;
  showMoveButtons: boolean;
  onCardClick: (card: CardForDeck) => void;
  isPending?: boolean;
  allDeckCards?: DeckCardWithCard[];
  isSelected?: boolean;
  onToggleSelection?: (cardId: string) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${deckCard.cardId}-${section}`,
    data: {
      type: 'deckCard',
      cardId: deckCard.cardId,
      section,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Validierung für diese Karte
  const cardValidation = useMemo(() => {
    if (!allDeckCards) return { isValid: true };
    return validateCardInDeck(
      deckCard.cardId,
      deckCard.quantity,
      allDeckCards.map((dc) => ({ cardId: dc.cardId, quantity: dc.quantity }))
    );
  }, [deckCard.cardId, deckCard.quantity, allDeckCards]);

  if (isPending) {
    return (
      <div className="flex items-center gap-3 p-2 rounded border bg-card opacity-60">
        {/* Kartenbild Skeleton */}
        <Skeleton className="h-16 w-11 shrink-0 rounded border" />

        {/* Karteninfo Skeleton */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-3 w-24" />
        </div>

        {/* Aktionen Skeleton */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-7 w-7 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 p-2 rounded border bg-card hover:bg-accent/50 transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${
        !cardValidation.isValid
          ? 'border-destructive border-2 bg-destructive/5'
          : cardValidation.warning
            ? 'border-yellow-500/50 bg-yellow-500/5'
            : ''
      } ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''}`}
      onClick={(e) => {
        // Wenn Checkbox geklickt wird, nicht Card-Dialog öffnen
        if ((e.target as HTMLElement).closest('[role="checkbox"]')) {
          return;
        }
        onCardClick(deckCard.card);
      }}
      title={
        !cardValidation.isValid
          ? cardValidation.error
          : cardValidation.warning
            ? cardValidation.warning
            : undefined
      }
    >
      {/* Multi-Select Checkbox */}
      {onToggleSelection && (
        <UICheckbox
          checked={isSelected}
          onCheckedChange={() => onToggleSelection(deckCard.cardId)}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        />
      )}
      {/* Kartenbild */}
      {deckCard.card.imageSmall && (
        <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded border">
          <Image
            src={deckCard.card.imageSmall}
            alt={deckCard.card.name}
            fill
            className="object-cover"
            sizes="44px"
            loading="lazy"
          />
        </div>
      )}

      {/* Karteninfo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{deckCard.quantity}x</span>
          <span className="text-sm truncate">{deckCard.card.name}</span>
          {!cardValidation.isValid && (
            <AlertTriangle
              className="h-4 w-4 text-destructive shrink-0"
              title={cardValidation.error}
            />
          )}
          {cardValidation.warning && (
            <AlertTriangle
              className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0"
              title={cardValidation.warning}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{deckCard.card.type}</p>
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
              const sections: DeckSection[] = ['MAIN', 'EXTRA', 'SIDE'];
              const currentIndex = sections.indexOf(section);
              const nextSection = sections[(currentIndex + 1) % sections.length];
              onMove(deckCard.cardId, section, nextSection);
            }}
            className="h-7 w-7 p-0"
            title={t('deck.moveToMain')}
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
});

export const DeckListSection = memo(
  function DeckListSection({
    title,
    section,
    cards,
    onIncreaseQuantity,
    onDecreaseQuantity,
    onRemove,
    onMove,
    showMoveButtons = false,
    onCardClick,
    pendingOperations = new Map(),
    allDeckCards,
    selectedCardIds,
    onToggleCardSelection,
  }: DeckListSectionProps) {
    const { t } = useTranslation();
    const totalCards = useMemo(() => cards.reduce((sum, dc) => sum + dc.quantity, 0), [cards]);
    const [selectedCard, setSelectedCard] = useState<CardForDeck | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const { setNodeRef, isOver, active } = useDroppable({
      id: section,
      data: {
        type: 'deckSection',
        section,
      },
    });

    // Prüfe ob aktives Drag-Element über dieser Drop-Zone ist
    const isActiveDropZone = isOver && active;

    const handleCardClick = useCallback((card: CardForDeck) => {
      setSelectedCard(card);
      setDialogOpen(true);
    }, []);

    const sortableItems = useMemo(
      () => cards.map((dc) => `${dc.cardId}-${section}`),
      [cards, section]
    );

    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
      count: cards.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => ESTIMATED_DECK_CARD_HEIGHT,
      overscan: VIRTUALIZATION_OVERSCAN,
    });

    const shouldVirtualize = cards.length > VIRTUALIZATION_THRESHOLD_DECK_LIST;

    return (
      <>
        <Card
          ref={setNodeRef}
          className={`transition-all duration-200 ${
            isActiveDropZone
              ? 'ring-2 ring-primary ring-offset-2 bg-primary/5 border-primary'
              : isOver
                ? 'ring-1 ring-primary/50 bg-primary/2'
                : ''
          }`}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {title} ({totalCards})
              </CardTitle>
              {onToggleCardSelection && selectedCardIds && (
                <div className="flex items-center gap-2">
                  <UICheckbox
                    checked={
                      cards.length > 0 && cards.every((dc) => selectedCardIds.has(dc.cardId))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        cards.forEach((dc) => onToggleCardSelection?.(dc.cardId));
                      } else {
                        cards.forEach((dc) => {
                          if (selectedCardIds.has(dc.cardId)) {
                            onToggleCardSelection?.(dc.cardId);
                          }
                        });
                      }
                    }}
                    className="shrink-0"
                  />
                  <span className="text-xs text-muted-foreground">
                    {cards.filter((dc) => selectedCardIds.has(dc.cardId)).length}{' '}
                    {t('common.selected')}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {cards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t('deck.noCards')}</p>
            ) : shouldVirtualize ? (
              <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                <div
                  ref={parentRef}
                  className="max-h-[400px] overflow-auto"
                  style={{ contain: 'strict' }}
                >
                  <div
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {virtualizer.getVirtualItems().map((virtualItem) => {
                      const deckCard = cards[virtualItem.index];
                      return (
                        <div
                          key={virtualItem.key}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                          }}
                        >
                          <div className="p-1">
                            <SortableDeckCardItem
                              deckCard={deckCard}
                              section={section}
                              onIncreaseQuantity={onIncreaseQuantity}
                              onDecreaseQuantity={onDecreaseQuantity}
                              onRemove={onRemove}
                              onMove={onMove}
                              showMoveButtons={showMoveButtons}
                              onCardClick={handleCardClick}
                              isPending={pendingOperations.has(`${deckCard.cardId}-${section}`)}
                              allDeckCards={allDeckCards || cards}
                              isSelected={selectedCardIds?.has(deckCard.cardId)}
                              onToggleSelection={onToggleCardSelection}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </SortableContext>
            ) : (
              <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
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
                      isPending={pendingOperations.has(`${deckCard.cardId}-${section}`)}
                      allDeckCards={allDeckCards || cards}
                      isSelected={selectedCardIds?.has(deckCard.cardId)}
                      onToggleSelection={onToggleCardSelection}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </CardContent>
        </Card>

        <CardDetailDialog card={selectedCard} open={dialogOpen} onOpenChange={setDialogOpen} />
      </>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison für bessere Performance
    return (
      prevProps.title === nextProps.title &&
      prevProps.section === nextProps.section &&
      prevProps.showMoveButtons === nextProps.showMoveButtons &&
      prevProps.cards.length === nextProps.cards.length &&
      prevProps.cards.every((card, index) => {
        const nextCard = nextProps.cards[index];
        return (
          card.cardId === nextCard?.cardId &&
          card.quantity === nextCard?.quantity &&
          card.deckSection === nextCard?.deckSection
        );
      }) &&
      prevProps.onIncreaseQuantity === nextProps.onIncreaseQuantity &&
      prevProps.onDecreaseQuantity === nextProps.onDecreaseQuantity &&
      prevProps.onRemove === nextProps.onRemove &&
      prevProps.onMove === nextProps.onMove &&
      prevProps.selectedCardIds?.size === nextProps.selectedCardIds?.size &&
      (prevProps.selectedCardIds === nextProps.selectedCardIds ||
        (prevProps.selectedCardIds &&
          nextProps.selectedCardIds &&
          Array.from(prevProps.selectedCardIds).every((id) =>
            nextProps.selectedCardIds!.has(id)
          ))) &&
      prevProps.onToggleCardSelection === nextProps.onToggleCardSelection
    );
  }
);
