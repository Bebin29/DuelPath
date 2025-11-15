import { useState, useCallback } from "react";
import type { Deck, DeckCard, Card } from "@prisma/client";

export type CardForDeck = Pick<Card, "id" | "name" | "type" | "race" | "attribute" | "level" | "atk" | "def" | "archetype" | "imageSmall">;

export interface DeckWithCards extends Deck {
  deckCards: Array<DeckCard & { card: CardForDeck }>;
}

type HistoryAction =
  | { type: "addCard"; cardId: string; section: string }
  | { type: "removeCard"; cardId: string; section: string }
  | { type: "updateQuantity"; cardId: string; section: string; oldQuantity: number; newQuantity: number }
  | { type: "moveCard"; cardId: string; fromSection: string; toSection: string };

interface HistoryEntry {
  action: HistoryAction;
  deckState: DeckWithCards;
  timestamp: number;
}

/**
 * Custom Hook für Undo/Redo-Funktionalität im Deck-Editor
 * 
 * @param initialDeck - Initiales Deck
 * @param maxHistorySize - Maximale Anzahl History-Einträge (default: 50)
 * @returns History-Management-Funktionen
 */
export function useDeckHistory(
  initialDeck: DeckWithCards | null,
  maxHistorySize: number = 50
) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentDeck, setCurrentDeck] = useState<DeckWithCards | null>(initialDeck);

  /**
   * Fügt einen neuen History-Eintrag hinzu
   */
  const addHistoryEntry = useCallback(
    (action: HistoryAction, deckState: DeckWithCards) => {
      setHistory((prev) => {
        // Entferne alle Einträge nach dem aktuellen Index (wenn Undo gemacht wurde)
        const newHistory = prev.slice(0, historyIndex + 1);
        
        // Füge neuen Eintrag hinzu
        const newEntry: HistoryEntry = {
          action,
          deckState: JSON.parse(JSON.stringify(deckState)), // Deep clone
          timestamp: Date.now(),
        };
        
        const updated = [...newHistory, newEntry];
        
        // Begrenze History-Größe
        if (updated.length > maxHistorySize) {
          return updated.slice(-maxHistorySize);
        }
        
        return updated;
      });
      
      setHistoryIndex((prev) => {
        const newIndex = prev + 1;
        // Begrenze Index auf maxHistorySize
        return Math.min(newIndex, maxHistorySize - 1);
      });
      
      setCurrentDeck(deckState);
    },
    [historyIndex, maxHistorySize]
  );

  /**
   * Macht die letzte Aktion rückgängig
   */
  const undo = useCallback((): DeckWithCards | null => {
    if (historyIndex < 0 || history.length === 0) {
      return null;
    }

    const previousIndex = historyIndex - 1;
    if (previousIndex < 0) {
      // Zurück zum initialen Deck
      setHistoryIndex(-1);
      setCurrentDeck(initialDeck);
      return initialDeck;
    }

    const previousEntry = history[previousIndex];
    setHistoryIndex(previousIndex);
    setCurrentDeck(previousEntry.deckState);
    return previousEntry.deckState;
  }, [history, historyIndex, initialDeck]);

  /**
   * Wiederholt die letzte rückgängig gemachte Aktion
   */
  const redo = useCallback((): DeckWithCards | null => {
    if (historyIndex >= history.length - 1) {
      return null;
    }

    const nextIndex = historyIndex + 1;
    const nextEntry = history[nextIndex];
    setHistoryIndex(nextIndex);
    setCurrentDeck(nextEntry.deckState);
    return nextEntry.deckState;
  }, [history, historyIndex]);

  /**
   * Prüft ob Undo möglich ist
   */
  const canUndo = historyIndex >= 0;

  /**
   * Prüft ob Redo möglich ist
   */
  const canRedo = historyIndex < history.length - 1;

  /**
   * Setzt die History zurück
   */
  const resetHistory = useCallback((deck: DeckWithCards | null) => {
    setHistory([]);
    setHistoryIndex(-1);
    setCurrentDeck(deck);
  }, []);

  /**
   * Springt zu einem bestimmten History-Eintrag
   */
  const jumpToHistory = useCallback((index: number): DeckWithCards | null => {
    if (index < -1 || index >= history.length) {
      return null;
    }

    if (index === -1) {
      setHistoryIndex(-1);
      setCurrentDeck(initialDeck);
      return initialDeck;
    }

    const entry = history[index];
    setHistoryIndex(index);
    setCurrentDeck(entry.deckState);
    return entry.deckState;
  }, [history, initialDeck]);

  return {
    currentDeck,
    history,
    historyIndex,
    maxHistorySize,
    addHistoryEntry,
    undo,
    redo,
    jumpToHistory,
    canUndo,
    canRedo,
    resetHistory,
  };
}

