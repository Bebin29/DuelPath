/**
 * Custom Hook für Deck-Card-Handler mit gemeinsamer Logik
 */

import { useCallback } from 'react';
import type { DeckSection } from '@/lib/validations/deck.schema';
import type { DeckWithCards, CardForDeck } from './use-deck-history';
import { findDeckCard } from '@/lib/utils/deck.utils';
import { MAX_CARD_COPIES } from '@/lib/constants/deck.constants';

interface UseDeckCardHandlersOptions {
  optimisticDeck: DeckWithCards | null;
  addCardOperation: (cardId: string, section: DeckSection, card: CardForDeck) => Promise<void>;
  updateQuantityOperation: (
    cardId: string,
    section: DeckSection,
    quantity: number,
    oldQuantity: number
  ) => Promise<void>;
  removeCardOperation: (cardId: string, section: DeckSection) => Promise<void>;
  moveCardOperation: (
    cardId: string,
    fromSection: DeckSection,
    toSection: DeckSection
  ) => Promise<void>;
  getCardData: (cardId: string) => Promise<CardForDeck | null>;
  onError: (title: string, description: string) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

/**
 * Hook für gemeinsame Deck-Card-Handler-Logik
 */
export function useDeckCardHandlers({
  optimisticDeck,
  addCardOperation,
  updateQuantityOperation,
  removeCardOperation,
  moveCardOperation,
  getCardData,
  onError,
  t,
}: UseDeckCardHandlersOptions) {
  const handleAddCardToSection = useCallback(
    async (cardId: string, section: DeckSection, card?: CardForDeck) => {
      if (!optimisticDeck) return;

      // Client-seitige Validierung
      const existingDeckCard = findDeckCard(optimisticDeck, cardId, section);
      if (existingDeckCard && existingDeckCard.quantity >= MAX_CARD_COPIES) {
        onError(
          t('deck.errors.addCardFailed'),
          t('deck.validation.maxCopies', { max: MAX_CARD_COPIES })
        );
        return;
      }

      // Hole Card-Daten falls nicht vorhanden
      let cardData: CardForDeck | null = card || null;
      if (!cardData) {
        cardData = await getCardData(cardId);
        if (!cardData) {
          onError(t('deck.errors.addCardFailed'), t('deck.errors.cardNotFound'));
          return;
        }
      }

      await addCardOperation(cardId, section, cardData);
    },
    [optimisticDeck, addCardOperation, getCardData, onError, t]
  );

  const handleIncreaseQuantity = useCallback(
    async (cardId: string, section: DeckSection) => {
      if (!optimisticDeck) return;

      const deckCard = findDeckCard(optimisticDeck, cardId, section);
      if (!deckCard) return;

      // Client-seitige Validierung
      if (deckCard.quantity >= MAX_CARD_COPIES) {
        onError(
          t('deck.errors.updateQuantityFailed'),
          t('deck.validation.maxCopies', { max: MAX_CARD_COPIES })
        );
        return;
      }

      const newQuantity = Math.min(deckCard.quantity + 1, MAX_CARD_COPIES);
      await updateQuantityOperation(cardId, section, newQuantity, deckCard.quantity);
    },
    [optimisticDeck, updateQuantityOperation, onError, t]
  );

  const handleRemove = useCallback(
    async (cardId: string, section: DeckSection) => {
      if (!optimisticDeck) return;
      await removeCardOperation(cardId, section);
    },
    [optimisticDeck, removeCardOperation]
  );

  const handleDecreaseQuantity = useCallback(
    async (cardId: string, section: DeckSection) => {
      if (!optimisticDeck) return;

      const deckCard = findDeckCard(optimisticDeck, cardId, section);

      // Client-seitige Validierung
      if (!deckCard) {
        onError(t('deck.errors.updateQuantityFailed'), t('deck.errors.cardNotInDeck'));
        return;
      }

      if (deckCard.quantity <= 1) {
        // Entferne Karte wenn quantity 1 ist
        await handleRemove(cardId, section);
        return;
      }

      const newQuantity = deckCard.quantity - 1;
      await updateQuantityOperation(cardId, section, newQuantity, deckCard.quantity);
    },
    [optimisticDeck, updateQuantityOperation, handleRemove, onError, t]
  );

  const handleMoveCard = useCallback(
    async (cardId: string, fromSection: DeckSection, toSection: DeckSection) => {
      if (!optimisticDeck || fromSection === toSection) return;
      await moveCardOperation(cardId, fromSection, toSection);
    },
    [optimisticDeck, moveCardOperation]
  );

  const handleDuplicateCard = useCallback(
    async (cardId: string, section: DeckSection) => {
      if (!optimisticDeck) return;
      const deckCard = findDeckCard(optimisticDeck, cardId, section);
      if (deckCard && deckCard.quantity < MAX_CARD_COPIES) {
        await handleIncreaseQuantity(cardId, section);
      }
    },
    [optimisticDeck, handleIncreaseQuantity]
  );

  return {
    handleAddCardToSection,
    handleIncreaseQuantity,
    handleRemove,
    handleDecreaseQuantity,
    handleMoveCard,
    handleDuplicateCard,
  };
}
