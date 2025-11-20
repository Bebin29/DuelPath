/**
 * Unit-Tests für useDeckCardHandlers Hook
 *
 * Hinweis: Da dieser Hook viele Abhängigkeiten hat, testen wir hauptsächlich
 * die Logik über Integration-Tests oder Mocking der Abhängigkeiten
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeckCardHandlers } from '@/lib/hooks/use-deck-card-handlers';
import type { DeckWithCards } from '@/lib/hooks/use-deck-history';
import type { DeckSection } from '@/lib/validations/deck.schema';

describe('useDeckCardHandlers', () => {
  const createMockDeck = (): DeckWithCards => ({
    id: 'deck-1',
    name: 'Test Deck',
    description: 'Test Description',
    format: 'TCG',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deckCards: [
      {
        id: 'dc-1',
        deckId: 'deck-1',
        cardId: 'card-1',
        quantity: 1,
        deckSection: 'MAIN',
        card: {
          id: 'card-1',
          name: 'Test Card',
          type: 'Effect Monster',
          race: 'Warrior',
          attribute: 'LIGHT',
          level: 4,
          atk: 1800,
          def: 1200,
          archetype: null,
          imageSmall: null,
          passcode: '12345678',
        },
      },
    ],
  });

  const mockAddCardOperation = vi.fn().mockResolvedValue(undefined);
  const mockUpdateQuantityOperation = vi.fn().mockResolvedValue(undefined);
  const mockRemoveCardOperation = vi.fn().mockResolvedValue(undefined);
  const mockMoveCardOperation = vi.fn().mockResolvedValue(undefined);
  const mockGetCardData = vi.fn().mockResolvedValue({
    id: 'card-2',
    name: 'New Card',
    type: 'Spell Card',
    race: null,
    attribute: null,
    level: null,
    atk: null,
    def: null,
    archetype: null,
    imageSmall: null,
  });
  const mockOnError = vi.fn();
  const mockT = vi.fn((key: string) => key);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sollte Handler-Funktionen zurückgeben', () => {
    const mockDeck = createMockDeck();
    const { result } = renderHook(() =>
      useDeckCardHandlers({
        optimisticDeck: mockDeck,
        addCardOperation: mockAddCardOperation,
        updateQuantityOperation: mockUpdateQuantityOperation,
        removeCardOperation: mockRemoveCardOperation,
        moveCardOperation: mockMoveCardOperation,
        getCardData: mockGetCardData,
        onError: mockOnError,
        t: mockT,
      })
    );

    expect(result.current.handleAddCardToSection).toBeDefined();
    expect(result.current.handleIncreaseQuantity).toBeDefined();
    expect(result.current.handleRemove).toBeDefined();
    expect(result.current.handleDecreaseQuantity).toBeDefined();
    expect(result.current.handleMoveCard).toBeDefined();
    expect(result.current.handleDuplicateCard).toBeDefined();
  });

  it('sollte handleRemove aufrufen wenn deck null', async () => {
    const { result } = renderHook(() =>
      useDeckCardHandlers({
        optimisticDeck: null,
        addCardOperation: mockAddCardOperation,
        updateQuantityOperation: mockUpdateQuantityOperation,
        removeCardOperation: mockRemoveCardOperation,
        moveCardOperation: mockMoveCardOperation,
        getCardData: mockGetCardData,
        onError: mockOnError,
        t: mockT,
      })
    );

    await act(async () => {
      await result.current.handleRemove('card-1', 'MAIN');
    });

    // Sollte nicht aufgerufen werden wenn deck null
    expect(mockRemoveCardOperation).not.toHaveBeenCalled();
  });

  it('sollte handleMoveCard aufrufen', async () => {
    const mockDeck = createMockDeck();
    const { result } = renderHook(() =>
      useDeckCardHandlers({
        optimisticDeck: mockDeck,
        addCardOperation: mockAddCardOperation,
        updateQuantityOperation: mockUpdateQuantityOperation,
        removeCardOperation: mockRemoveCardOperation,
        moveCardOperation: mockMoveCardOperation,
        moveCardOperation: mockMoveCardOperation,
        getCardData: mockGetCardData,
        onError: mockOnError,
        t: mockT,
      })
    );

    await act(async () => {
      await result.current.handleMoveCard('card-1', 'MAIN', 'EXTRA');
    });

    expect(mockMoveCardOperation).toHaveBeenCalledWith('card-1', 'MAIN', 'EXTRA');
  });

  it('sollte handleMoveCard nicht aufrufen wenn fromSection === toSection', async () => {
    const mockDeck = createMockDeck();
    const { result } = renderHook(() =>
      useDeckCardHandlers({
        optimisticDeck: mockDeck,
        addCardOperation: mockAddCardOperation,
        updateQuantityOperation: mockUpdateQuantityOperation,
        removeCardOperation: mockRemoveCardOperation,
        moveCardOperation: mockMoveCardOperation,
        getCardData: mockGetCardData,
        onError: mockOnError,
        t: mockT,
      })
    );

    await act(async () => {
      await result.current.handleMoveCard('card-1', 'MAIN', 'MAIN');
    });

    expect(mockMoveCardOperation).not.toHaveBeenCalled();
  });
});
