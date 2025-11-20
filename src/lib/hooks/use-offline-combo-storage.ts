import { useEffect, useCallback } from 'react';
import { useOfflineStorage } from './use-offline-storage';
import type { ComboWithSteps } from '@/types/combo.types';
import {
  createCombo,
  updateCombo,
  deleteCombo,
  addComboStep,
  updateComboStep,
  deleteComboStep,
} from '@/server/actions/combo.actions';
import type { CreateComboInput, UpdateComboInput } from '@/lib/validations/combo.schema';
import type { CreateComboStepInput, UpdateComboStepInput } from '@/lib/validations/combo.schema';

/**
 * Hook für Offline-Storage von Combos
 *
 * Speichert Combo-Operationen lokal wenn offline und synchronisiert sie wenn wieder online
 */
export function useOfflineComboStorage() {
  const {
    isOnline,
    pendingOperations,
    queueOperation,
    removeOperation,
    syncOperations,
    hasPendingOperations,
  } = useOfflineStorage();

  /**
   * Synchronisiert eine einzelne Operation
   */
  const syncOperation = useCallback(async (operation: { resource: string; type: string; data: unknown }): Promise<boolean> => {
    try {
      if (operation.resource === 'combo') {
        if (operation.type === 'create') {
          const result = await createCombo(operation.data as CreateComboInput);
          return !('error' in result);
        } else if (operation.type === 'update') {
          const { comboId, ...data } = operation.data as { comboId: string } & UpdateComboInput;
          const result = await updateCombo(comboId, data);
          return !('error' in result);
        } else if (operation.type === 'delete') {
          const result = await deleteCombo(operation.data as string);
          return !('error' in result);
        }
      } else if (operation.resource === 'step') {
        if (operation.type === 'create') {
          const { comboId, ...step } = operation.data as { comboId: string } & CreateComboStepInput;
          const result = await addComboStep(comboId, step);
          return !('error' in result);
        } else if (operation.type === 'update') {
          const { stepId, ...data } = operation.data as { stepId: string } & UpdateComboStepInput;
          const result = await updateComboStep(stepId, data);
          return !('error' in result);
        } else if (operation.type === 'delete') {
          const result = await deleteComboStep(operation.data as string);
          return !('error' in result);
        }
      }
      return false;
    } catch (error) {
      console.error('Failed to sync operation:', error);
      return false;
    }
  }, []);

  // Automatische Synchronisation wenn wieder online
  useEffect(() => {
    if (isOnline && hasPendingOperations) {
      syncOperations(syncOperation);
    }
  }, [isOnline, hasPendingOperations, syncOperations, syncOperation]);

  /**
   * Speichert eine Combo lokal (für Offline-Zugriff)
   */
  const saveComboLocally = useCallback((combo: ComboWithSteps) => {
    try {
      const key = `combo_${combo.id}`;
      localStorage.setItem(key, JSON.stringify(combo));
    } catch (error) {
      console.error('Failed to save combo locally:', error);
    }
  }, []);

  /**
   * Lädt eine Combo aus lokalem Storage
   */
  const loadComboLocally = useCallback((comboId: string): ComboWithSteps | null => {
    try {
      const key = `combo_${comboId}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored) as ComboWithSteps;
      }
    } catch (error) {
      console.error('Failed to load combo locally:', error);
    }
    return null;
  }, []);

  /**
   * Entfernt eine Combo aus lokalem Storage
   */
  const removeComboLocally = useCallback((comboId: string) => {
    try {
      const key = `combo_${comboId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove combo locally:', error);
    }
  }, []);

  return {
    isOnline,
    pendingOperations,
    hasPendingOperations,
    queueOperation,
    removeOperation,
    syncOperations: () => syncOperations(syncOperation),
    saveComboLocally,
    loadComboLocally,
    removeComboLocally,
  };
}
