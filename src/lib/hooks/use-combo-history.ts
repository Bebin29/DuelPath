import { useState, useCallback } from "react";
import type { ComboWithSteps } from "@/types/combo.types";

type HistoryAction =
  | { type: "addStep"; stepId: string; order: number }
  | { type: "removeStep"; stepId: string; order: number }
  | { type: "updateStep"; stepId: string; order: number }
  | { type: "reorderSteps"; stepIds: string[] }
  | { type: "updateCombo"; field: string };

interface HistoryEntry {
  action: HistoryAction;
  comboState: ComboWithSteps;
  timestamp: number;
}

/**
 * Custom Hook für Undo/Redo-Funktionalität im Combo-Editor
 * 
 * @param initialCombo - Initiale Kombo
 * @param maxHistorySize - Maximale Anzahl History-Einträge (default: 50)
 * @returns History-Management-Funktionen
 */
export function useComboHistory(
  initialCombo: ComboWithSteps | null,
  maxHistorySize: number = 50
) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentCombo, setCurrentCombo] = useState<ComboWithSteps | null>(initialCombo);

  /**
   * Fügt einen neuen History-Eintrag hinzu
   */
  const addHistoryEntry = useCallback(
    (action: HistoryAction, comboState: ComboWithSteps) => {
      setHistory((prev) => {
        // Entferne alle Einträge nach dem aktuellen Index (wenn Undo gemacht wurde)
        const newHistory = prev.slice(0, historyIndex + 1);
        
        // Füge neuen Eintrag hinzu
        const newEntry: HistoryEntry = {
          action,
          comboState: structuredClone(comboState), // Deep clone
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
      
      setCurrentCombo(comboState);
    },
    [historyIndex, maxHistorySize]
  );

  /**
   * Macht die letzte Aktion rückgängig
   */
  const undo = useCallback((): ComboWithSteps | null => {
    if (historyIndex < 0 || history.length === 0) {
      return null;
    }

    const previousIndex = historyIndex - 1;
    if (previousIndex < 0) {
      // Zurück zur initialen Kombo
      setHistoryIndex(-1);
      setCurrentCombo(initialCombo);
      return initialCombo;
    }

    const previousEntry = history[previousIndex];
    setHistoryIndex(previousIndex);
    setCurrentCombo(previousEntry.comboState);
    return previousEntry.comboState;
  }, [history, historyIndex, initialCombo]);

  /**
   * Wiederholt die letzte rückgängig gemachte Aktion
   */
  const redo = useCallback((): ComboWithSteps | null => {
    if (historyIndex >= history.length - 1) {
      return null;
    }

    const nextIndex = historyIndex + 1;
    const nextEntry = history[nextIndex];
    setHistoryIndex(nextIndex);
    setCurrentCombo(nextEntry.comboState);
    return nextEntry.comboState;
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
  const resetHistory = useCallback((combo: ComboWithSteps | null) => {
    setHistory([]);
    setHistoryIndex(-1);
    setCurrentCombo(combo);
  }, []);

  /**
   * Springt zu einem bestimmten History-Eintrag
   */
  const jumpToHistory = useCallback((index: number): ComboWithSteps | null => {
    if (index < -1 || index >= history.length) {
      return null;
    }

    if (index === -1) {
      setHistoryIndex(-1);
      setCurrentCombo(initialCombo);
      return initialCombo;
    }

    const entry = history[index];
    setHistoryIndex(index);
    setCurrentCombo(entry.comboState);
    return entry.comboState;
  }, [history, initialCombo]);

  return {
    currentCombo,
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

