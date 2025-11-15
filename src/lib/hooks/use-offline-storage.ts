import { useEffect, useState, useCallback, useRef } from "react";

interface OfflineOperation {
  id: string;
  type: "create" | "update" | "delete";
  resource: "combo" | "step";
  data: unknown;
  timestamp: number;
}

const STORAGE_KEY = "duelpath_offline_operations";
const STORAGE_VERSION = 1;

/**
 * Hook für Offline-Storage und Sync
 * 
 * Speichert Operationen lokal wenn offline und synchronisiert sie wenn wieder online
 */
export function useOfflineStorage() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingOperations, setPendingOperations] = useState<OfflineOperation[]>([]);
  const syncInProgressRef = useRef(false);

  // Prüfe Online-Status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Lade gespeicherte Operationen beim Start
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const operations = JSON.parse(stored) as OfflineOperation[];
        setPendingOperations(operations);
      }
    } catch (error) {
      console.error("Failed to load offline operations:", error);
    }
  }, []);

  // Speichere Operationen in LocalStorage
  const saveOperations = useCallback((operations: OfflineOperation[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
      setPendingOperations(operations);
    } catch (error) {
      console.error("Failed to save offline operations:", error);
    }
  }, []);

  /**
   * Fügt eine Operation zur Offline-Queue hinzu
   */
  const queueOperation = useCallback(
    (
      type: OfflineOperation["type"],
      resource: OfflineOperation["resource"],
      data: unknown
    ) => {
      const operation: OfflineOperation = {
        id: `offline-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        type,
        resource,
        data,
        timestamp: Date.now(),
      };

      const updated = [...pendingOperations, operation];
      saveOperations(updated);
      return operation.id;
    },
    [pendingOperations, saveOperations]
  );

  /**
   * Entfernt eine Operation aus der Queue
   */
  const removeOperation = useCallback(
    (operationId: string) => {
      const updated = pendingOperations.filter((op) => op.id !== operationId);
      saveOperations(updated);
    },
    [pendingOperations, saveOperations]
  );

  /**
   * Synchronisiert alle ausstehenden Operationen
   */
  const syncOperations = useCallback(
    async (syncFn: (operation: OfflineOperation) => Promise<boolean>) => {
      if (syncInProgressRef.current || !isOnline || pendingOperations.length === 0) {
        return;
      }

      syncInProgressRef.current = true;

      try {
        const operationsToSync = [...pendingOperations];
        const successful: string[] = [];
        const failed: OfflineOperation[] = [];

        for (const operation of operationsToSync) {
          try {
            const success = await syncFn(operation);
            if (success) {
              successful.push(operation.id);
            } else {
              failed.push(operation);
            }
          } catch (error) {
            console.error("Failed to sync operation:", operation, error);
            failed.push(operation);
          }
        }

        // Entferne erfolgreiche Operationen
        if (successful.length > 0) {
          const updated = pendingOperations.filter(
            (op) => !successful.includes(op.id)
          );
          saveOperations(updated);
        }

        // Speichere fehlgeschlagene Operationen für späteren Retry
        if (failed.length > 0) {
          const updated = pendingOperations.filter((op) =>
            failed.some((f) => f.id === op.id)
          );
          saveOperations(updated);
        }
      } finally {
        syncInProgressRef.current = false;
      }
    },
    [isOnline, pendingOperations, saveOperations]
  );

  /**
   * Leert alle ausstehenden Operationen
   */
  const clearOperations = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPendingOperations([]);
  }, []);

  return {
    isOnline,
    pendingOperations,
    queueOperation,
    removeOperation,
    syncOperations,
    clearOperations,
    hasPendingOperations: pendingOperations.length > 0,
  };
}

