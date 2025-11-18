import { useCallback, useRef, useState } from "react";
import { useTransition } from "react";
import type { DuelState, DuelAction } from "@/types/duel.types";
import { useRetry } from "./use-retry";
import type { HistoryAction } from "./use-duel-history";

interface UseDuelOperationsOptions {
  duelState: DuelState | null;
  setDuelState: (updater: (prev: DuelState | null) => DuelState | null) => void;
  addHistoryEntry: (action: HistoryAction, duelState: DuelState) => void;
  onError?: (error: string, retryFn?: () => Promise<void>) => void;
  onSuccess?: (message?: string) => void;
  queueOfflineOperation?: (
    type: "saveDuel" | "convertToCombo",
    data: unknown
  ) => void;
}

interface PendingOperation {
  type: "saveDuel" | "convertToCombo";
  timestamp: number;
}

/**
 * Custom Hook für Duel-Operationen (vereinfacht für lokale Duelle)
 *
 * Hauptsächlich für zukünftige Server-Integration:
 * - Duel speichern
 * - Duel als Combo konvertieren
 *
 * Features:
 * - Request-Deduplizierung für Server-Operationen
 * - Optimistic Updates
 * - Offline-Queue Support
 */
export function useDuelOperations({
  duelState,
  setDuelState,
  addHistoryEntry,
  onError,
  onSuccess,
  queueOfflineOperation,
}: UseDuelOperationsOptions) {
  const [isPending, startTransition] = useTransition();
  const [pendingOperations, setPendingOperations] = useState<Map<string, string>>(new Map());
  const [loadingStates, setLoadingStates] = useState<{
    isSavingDuel: boolean;
    isConvertingToCombo: boolean;
  }>({
    isSavingDuel: false,
    isConvertingToCombo: false,
  });

  const pendingOperationsRef = useRef<Map<string, PendingOperation>>(new Map());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const optimisticStateRef = useRef<Map<string, DuelState>>(new Map());
  const { retry } = useRetry({ maxRetries: 3, initialDelay: 1000 });

  /**
   * Generiert einen eindeutigen Key für eine Operation
   */
  const getOperationKey = useCallback(
    (type: string) => {
      return type;
    },
    []
  );

  /**
   * Prüft ob eine identische Operation bereits pending ist
   */
  const isOperationPending = useCallback(
    (key: string, maxAge: number = 500) => {
      const pending = pendingOperationsRef.current.get(key);
      if (!pending) return false;
      return Date.now() - pending.timestamp < maxAge;
    },
    []
  );

  /**
   * Bricht eine pending Operation ab
   */
  const cancelOperation = useCallback((key: string) => {
    const controller = abortControllersRef.current.get(key);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(key);
    }
    pendingOperationsRef.current.delete(key);
  }, []);

  /**
   * Markiert eine Operation als pending
   */
  const markOperationPending = useCallback((key: string, type: PendingOperation["type"]) => {
    pendingOperationsRef.current.set(key, { type, timestamp: Date.now() });
    setPendingOperations(prev => new Map(prev.set(key, type)));
  }, []);

  /**
   * Markiert eine Operation als abgeschlossen
   */
  const markOperationComplete = useCallback((key: string) => {
    pendingOperationsRef.current.delete(key);
    abortControllersRef.current.delete(key);
    setPendingOperations(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, []);

  /**
   * Speichert ein Duel (für zukünftige Server-Integration)
   * Aktuell nur Platzhalter - Duelle werden lokal gespeichert
   */
  const saveDuel = useCallback(async (duelStateToSave: DuelState) => {
    const key = getOperationKey("saveDuel");

    if (isOperationPending(key)) {
      return; // Deduplizierung
    }

    markOperationPending(key, "saveDuel");

    setLoadingStates(prev => ({ ...prev, isSavingDuel: true }));

    try {
      // TODO: Server-Action für Duel speichern implementieren
      console.log("Saving duel:", duelStateToSave);

      // Simuliere Server-Call
      await new Promise(resolve => setTimeout(resolve, 500));

      onSuccess?.("Duel gespeichert");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save duel";
      onError?.(errorMessage, () => saveDuel(duelStateToSave));
    } finally {
      markOperationComplete(key);
      setLoadingStates(prev => ({ ...prev, isSavingDuel: false }));
    }
  }, [getOperationKey, isOperationPending, markOperationPending, markOperationComplete, onSuccess, onError]);

  /**
   * Konvertiert ein Duel zu einer Combo (für zukünftige Server-Integration)
   */
  const convertDuelToCombo = useCallback(async (duelStateToConvert: DuelState, title: string) => {
    const key = getOperationKey("convertToCombo");

    if (isOperationPending(key)) {
      return; // Deduplizierung
    }

    markOperationPending(key, "convertToCombo");

    setLoadingStates(prev => ({ ...prev, isConvertingToCombo: true }));

    try {
      // TODO: Server-Action für Duel-zu-Combo-Konvertierung implementieren
      console.log("Converting duel to combo:", duelStateToConvert, title);

      // Simuliere Server-Call
      await new Promise(resolve => setTimeout(resolve, 1000));

      onSuccess?.("Duel als Combo gespeichert");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to convert duel to combo";
      onError?.(errorMessage, () => convertDuelToCombo(duelStateToConvert, title));
    } finally {
      markOperationComplete(key);
      setLoadingStates(prev => ({ ...prev, isConvertingToCombo: false }));
    }
  }, [getOperationKey, isOperationPending, markOperationPending, markOperationComplete, onSuccess, onError]);

  return {
    // State
    isPending,
    pendingOperations,
    loadingStates,

    // Operations
    saveDuel,
    convertDuelToCombo,

    // Utilities
    cancelOperation,
    isOperationPending,
  };
}
