/**
 * Unit-Tests für useDeckHistory Hook
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDeckHistory } from "@/lib/hooks/use-deck-history";
import type { DeckWithCards } from "@/lib/hooks/use-deck-history";

describe("useDeckHistory", () => {
  const createMockDeck = (id: string, cardCount: number = 0): DeckWithCards => ({
    id,
    name: "Test Deck",
    description: "Test Description",
    format: "TCG",
    userId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    deckCards: Array.from({ length: cardCount }, (_, i) => ({
      id: `dc-${i}`,
      deckId: id,
      cardId: `card-${i}`,
      quantity: 1,
      deckSection: "MAIN" as const,
      card: {
        id: `card-${i}`,
        name: `Card ${i}`,
        type: "Effect Monster",
        race: "Warrior",
        attribute: "LIGHT",
        level: 4,
        atk: 1800,
        def: 1200,
        archetype: null,
        imageSmall: null,
        passcode: `passcode-${i}`,
      },
    })),
  });

  describe("Initialisierung", () => {
    it("sollte mit initialem Deck initialisieren", () => {
      const initialDeck = createMockDeck("deck-1", 5);
      const { result } = renderHook(() => useDeckHistory(initialDeck, 50));

      expect(result.current.currentDeck).toEqual(initialDeck);
      expect(result.current.history).toHaveLength(0);
      expect(result.current.historyIndex).toBe(-1);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it("sollte mit null initialisieren", () => {
      const { result } = renderHook(() => useDeckHistory(null, 50));

      expect(result.current.currentDeck).toBeNull();
      expect(result.current.history).toHaveLength(0);
    });
  });

  describe("addHistoryEntry", () => {
    it("sollte History-Eintrag hinzufügen", () => {
      const initialDeck = createMockDeck("deck-1", 5);
      const { result } = renderHook(() => useDeckHistory(initialDeck, 50));

      const newDeck = createMockDeck("deck-1", 6);
      act(() => {
        result.current.addHistoryEntry(
          { type: "addCard", cardId: "card-5", section: "MAIN" },
          newDeck
        );
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.historyIndex).toBe(0);
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it("sollte History-Größe begrenzen", () => {
      const initialDeck = createMockDeck("deck-1", 5);
      const { result } = renderHook(() => useDeckHistory(initialDeck, 3));

      // Füge 5 Einträge hinzu
      for (let i = 0; i < 5; i++) {
        const newDeck = createMockDeck("deck-1", 5 + i);
        act(() => {
          result.current.addHistoryEntry(
            { type: "addCard", cardId: `card-${i}`, section: "MAIN" },
            newDeck
          );
        });
      }

      // Sollte nur die letzten 3 Einträge behalten
      expect(result.current.history.length).toBeLessThanOrEqual(3);
    });
  });

  describe("undo", () => {
    it("sollte letzte Aktion rückgängig machen", () => {
      const initialDeck = createMockDeck("deck-1", 5);
      const { result } = renderHook(() => useDeckHistory(initialDeck, 50));

      const newDeck = createMockDeck("deck-1", 6);
      act(() => {
        result.current.addHistoryEntry(
          { type: "addCard", cardId: "card-5", section: "MAIN" },
          newDeck
        );
      });

      act(() => {
        const undoneDeck = result.current.undo();
        expect(undoneDeck).toEqual(initialDeck);
      });

      expect(result.current.currentDeck).toEqual(initialDeck);
      expect(result.current.historyIndex).toBe(-1);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it("sollte null zurückgeben wenn keine History vorhanden", () => {
      const initialDeck = createMockDeck("deck-1", 5);
      const { result } = renderHook(() => useDeckHistory(initialDeck, 50));

      act(() => {
        const undoneDeck = result.current.undo();
        expect(undoneDeck).toBeNull();
      });
    });
  });

  describe("redo", () => {
    it("sollte letzte rückgängig gemachte Aktion wiederholen", () => {
      const initialDeck = createMockDeck("deck-1", 5);
      const { result } = renderHook(() => useDeckHistory(initialDeck, 50));

      const newDeck = createMockDeck("deck-1", 6);
      act(() => {
        result.current.addHistoryEntry(
          { type: "addCard", cardId: "card-5", section: "MAIN" },
          newDeck
        );
      });

      act(() => {
        result.current.undo();
      });

      act(() => {
        const redoneDeck = result.current.redo();
        expect(redoneDeck).toEqual(newDeck);
      });

      expect(result.current.currentDeck).toEqual(newDeck);
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it("sollte null zurückgeben wenn keine Redo möglich", () => {
      const initialDeck = createMockDeck("deck-1", 5);
      const { result } = renderHook(() => useDeckHistory(initialDeck, 50));

      act(() => {
        const redoneDeck = result.current.redo();
        expect(redoneDeck).toBeNull();
      });
    });
  });

  describe("jumpToHistory", () => {
    it("sollte zu bestimmtem History-Eintrag springen", () => {
      const initialDeck = createMockDeck("deck-1", 5);
      const { result } = renderHook(() => useDeckHistory(initialDeck, 50));

      const deck1 = createMockDeck("deck-1", 6);
      const deck2 = createMockDeck("deck-1", 7);

      act(() => {
        result.current.addHistoryEntry(
          { type: "addCard", cardId: "card-5", section: "MAIN" },
          deck1
        );
        result.current.addHistoryEntry(
          { type: "addCard", cardId: "card-6", section: "MAIN" },
          deck2
        );
      });

      act(() => {
        const jumpedDeck = result.current.jumpToHistory(0);
        expect(jumpedDeck).toEqual(deck1);
      });

      expect(result.current.historyIndex).toBe(0);
      expect(result.current.currentDeck).toEqual(deck1);
    });

    it("sollte zum initialen Deck springen wenn Index -1", () => {
      const initialDeck = createMockDeck("deck-1", 5);
      const { result } = renderHook(() => useDeckHistory(initialDeck, 50));

      const newDeck = createMockDeck("deck-1", 6);
      act(() => {
        result.current.addHistoryEntry(
          { type: "addCard", cardId: "card-5", section: "MAIN" },
          newDeck
        );
      });

      act(() => {
        const jumpedDeck = result.current.jumpToHistory(-1);
        expect(jumpedDeck).toEqual(initialDeck);
      });

      expect(result.current.historyIndex).toBe(-1);
      expect(result.current.currentDeck).toEqual(initialDeck);
    });
  });

  describe("resetHistory", () => {
    it("sollte History zurücksetzen", () => {
      const initialDeck = createMockDeck("deck-1", 5);
      const { result } = renderHook(() => useDeckHistory(initialDeck, 50));

      const newDeck = createMockDeck("deck-1", 6);
      act(() => {
        result.current.addHistoryEntry(
          { type: "addCard", cardId: "card-5", section: "MAIN" },
          newDeck
        );
      });

      const resetDeck = createMockDeck("deck-1", 3);
      act(() => {
        result.current.resetHistory(resetDeck);
      });

      expect(result.current.history).toHaveLength(0);
      expect(result.current.historyIndex).toBe(-1);
      expect(result.current.currentDeck).toEqual(resetDeck);
    });
  });
});

