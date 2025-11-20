import { useEffect, useCallback } from 'react';
import type { DuelState } from '@/types/duel.types';

const DUEL_STORAGE_KEY = 'duelpath-duel-state';
const DUEL_AUTO_SAVE_INTERVAL = 5000; // 5 Sekunden

/**
 * Hook für Offline-Storage von Duel-Zustand
 *
 * Speichert den aktuellen Duel-Zustand automatisch im LocalStorage
 * für Persistenz über Browser-Sessions hinweg
 */
export function useOfflineDuelStorage() {
  /**
   * Lädt den gespeicherten Duel-Zustand aus LocalStorage
   */
  const loadDuelLocally = useCallback((duelId?: string): DuelState | null => {
    try {
      const stored = localStorage.getItem(DUEL_STORAGE_KEY);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      // TODO: Validierung hinzufügen

      return parsed as DuelState;
    } catch (error) {
      console.error('Failed to load duel from localStorage:', error);
      return null;
    }
  }, []);

  /**
   * Speichert den Duel-Zustand im LocalStorage
   */
  const saveDuelLocally = useCallback((duelState: DuelState) => {
    try {
      localStorage.setItem(DUEL_STORAGE_KEY, JSON.stringify(duelState));
    } catch (error) {
      console.error('Failed to save duel to localStorage:', error);
    }
  }, []);

  /**
   * Entfernt den gespeicherten Duel-Zustand
   */
  const clearDuelLocally = useCallback(() => {
    try {
      localStorage.removeItem(DUEL_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear duel from localStorage:', error);
    }
  }, []);

  /**
   * Auto-Save Hook: Speichert den Duel-Zustand periodisch
   */
  const useAutoSave = useCallback(
    (duelState: DuelState | null) => {
      useEffect(() => {
        if (!duelState) {
          clearDuelLocally();
          return;
        }

        const saveInterval = setInterval(() => {
          saveDuelLocally(duelState);
        }, DUEL_AUTO_SAVE_INTERVAL);

        // Speichere auch sofort bei Änderungen
        saveDuelLocally(duelState);

        return () => clearInterval(saveInterval);
      }, [duelState]);
    },
    [saveDuelLocally, clearDuelLocally]
  );

  /**
   * Prüft ob ein Duel lokal gespeichert ist
   */
  const hasStoredDuel = useCallback((): boolean => {
    try {
      return localStorage.getItem(DUEL_STORAGE_KEY) !== null;
    } catch {
      return false;
    }
  }, []);

  /**
   * Lädt und entfernt den gespeicherten Duel-Zustand (für "Fortsetzen")
   */
  const resumeDuel = useCallback((): DuelState | null => {
    const duel = loadDuelLocally();
    if (duel) {
      clearDuelLocally(); // Entferne nach dem Laden
    }
    return duel;
  }, [loadDuelLocally, clearDuelLocally]);

  return {
    loadDuelLocally,
    saveDuelLocally,
    clearDuelLocally,
    useAutoSave,
    hasStoredDuel,
    resumeDuel,
  };
}
