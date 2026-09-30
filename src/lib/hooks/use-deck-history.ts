import { useState, useCallback } from 'react';
import type { Deck, DeckCard, Card } from '@/generated/prisma/client';

export type CardForDeck = Pick<
  Card,
  | 'id'
  | 'name'
  | 'type'
  | 'race'
  | 'attribute'
  | 'level'
  | 'atk'
  | 'def'
  | 'archetype'
  | 'imageSmall'
  | 'passcode'
>;

export interface DeckWithCards extends Deck {
  deckCards: Array<DeckCard & { card: CardForDeck }>;
}

export type HistoryAction =
  | { type: 'addCard'; cardId: string; section: string }
  | { type: 'removeCard'; cardId: string; section: string }
  | {
      type: 'updateQuantity';
      cardId: string;
      section: string;
      oldQuantity: number;
      newQuantity: number;
    }
  | { type: 'moveCard'; cardId: string; fromSection: string; toSection: string };

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
export function useDeckHistory(initialDeck: DeckWithCards | null, maxHistorySize: number = 50) {
  // Einträge und Index liegen in einem State, damit mehrere Aufrufe vor dem nächsten Render
  // auf dem jeweils aktuellen Index aufbauen statt auf einem veralteten Closure-Wert.
  const [{ history, historyIndex }, setState] = useState<{
    history: HistoryEntry[];
    historyIndex: number;
  }>({ history: [], historyIndex: -1 });
  const [currentDeck, setCurrentDeck] = useState<DeckWithCards | null>(initialDeck);

  const setHistoryIndex = useCallback(
    (index: number) => setState((prev) => ({ ...prev, historyIndex: index })),
    []
  );

  /**
   * Fügt einen neuen History-Eintrag hinzu
   */
  const addHistoryEntry = useCallback(
    (action: HistoryAction, deckState: DeckWithCards) => {
      setState((prev) => {
        // Entferne alle Einträge nach dem aktuellen Index (wenn Undo gemacht wurde)
        const kept = prev.history.slice(0, prev.historyIndex + 1);
        const newEntry: HistoryEntry = {
          action,
          deckState: structuredClone(deckState),
          timestamp: Date.now(),
        };
        // Begrenze History-Größe
        const updated = [...kept, newEntry].slice(-maxHistorySize);
        return { history: updated, historyIndex: updated.length - 1 };
      });

      setCurrentDeck(deckState);
    },
    [maxHistorySize]
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
  }, [history, historyIndex, initialDeck, setHistoryIndex]);

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
  }, [history, historyIndex, setHistoryIndex]);

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
    setState({ history: [], historyIndex: -1 });
    setCurrentDeck(deck);
  }, []);

  /**
   * Springt zu einem bestimmten History-Eintrag
   */
  const jumpToHistory = useCallback(
    (index: number): DeckWithCards | null => {
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
    },
    [history, initialDeck, setHistoryIndex]
  );

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
