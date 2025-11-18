import { useState, useCallback } from "react";
import type { DuelState, DuelAction } from "@/types/duel.types";

type HistoryAction = DuelAction;

interface HistoryEntry {
  action: HistoryAction;
  duelState: DuelState;
  timestamp: number;
}

/**
 * Custom Hook für Undo/Redo-Funktionalität im Duel-Modus
 *
 * @param initialDuelState - Initialer Duel-Zustand
 * @param maxHistorySize - Maximale Anzahl History-Einträge (default: 50)
 * @returns History-Management-Funktionen
 */
export function useDuelHistory(
  initialDuelState: DuelState | null,
  maxHistorySize: number = 50
) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentDuelState, setCurrentDuelState] = useState<DuelState | null>(initialDuelState);

  /**
   * Deep clone eines DuelState (für History-Snapshots)
   */
  const cloneDuelState = useCallback((state: DuelState): DuelState => {
    return JSON.parse(JSON.stringify(state));
  }, []);

  /**
   * Fügt einen neuen History-Eintrag hinzu
   */
  const addHistoryEntry = useCallback(
    (action: HistoryAction, duelState: DuelState) => {
      setHistory((prev) => {
        // Entferne alle Einträge nach dem aktuellen Index (wenn Undo gemacht wurde)
        const newHistory = prev.slice(0, historyIndex + 1);

        // Füge neuen Eintrag hinzu
        const newEntry: HistoryEntry = {
          action,
          duelState: cloneDuelState(duelState),
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

      setCurrentDuelState(duelState);
    },
    [historyIndex, maxHistorySize, cloneDuelState]
  );

  /**
   * Macht die letzte Aktion rückgängig
   */
  const undo = useCallback((): DuelState | null => {
    if (historyIndex < 0 || history.length === 0) {
      return null;
    }

    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);

    if (newIndex >= 0) {
      const previousState = history[newIndex].duelState;
      setCurrentDuelState(previousState);
      return previousState;
    } else {
      // Kein vorheriger State, zurück zum initialen State
      setCurrentDuelState(initialDuelState);
      return initialDuelState;
    }
  }, [historyIndex, history, initialDuelState]);

  /**
   * Stellt die letzte rückgängig gemachte Aktion wieder her
   */
  const redo = useCallback((): DuelState | null => {
    const nextIndex = historyIndex + 1;
    if (nextIndex >= history.length) {
      return null;
    }

    setHistoryIndex(nextIndex);
    const nextState = history[nextIndex].duelState;
    setCurrentDuelState(nextState);
    return nextState;
  }, [historyIndex, history]);

  /**
   * Springt zu einem bestimmten History-Eintrag
   */
  const jumpToHistory = useCallback(
    (index: number): DuelState | null => {
      if (index < -1 || index >= history.length) {
        return null;
      }

      setHistoryIndex(index);

      if (index >= 0) {
        const targetState = history[index].duelState;
        setCurrentDuelState(targetState);
        return targetState;
      } else {
        // Springe zum initialen State
        setCurrentDuelState(initialDuelState);
        return initialDuelState;
      }
    },
    [history, initialDuelState]
  );

  /**
   * Setzt die History zurück
   */
  const resetHistory = useCallback((newInitialState: DuelState | null = null) => {
    setHistory([]);
    setHistoryIndex(-1);
    setCurrentDuelState(newInitialState);
  }, []);

  /**
   * Prüft ob Undo möglich ist
   */
  const canUndo = historyIndex >= 0 || (historyIndex === -1 && initialDuelState !== null);

  /**
   * Prüft ob Redo möglich ist
   */
  const canRedo = historyIndex < history.length - 1;

  /**
   * Maximale History-Größe (für UI-Anzeige)
   */
  const maxHistorySizeReached = history.length >= maxHistorySize;

  return {
    currentDuelState,
    history,
    historyIndex,
    maxHistorySize,
    addHistoryEntry,
    undo,
    redo,
    jumpToHistory,
    resetHistory,
    canUndo,
    canRedo,
    maxHistorySizeReached,
  };
}
