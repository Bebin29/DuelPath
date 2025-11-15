/**
 * Hook für Offline-Status und -Funktionalität
 */

import { useState, useEffect, useCallback } from "react";

interface UseOfflineReturn {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  syncPending: boolean;
  syncQueueLength: number;
  syncNow: () => Promise<void>;
}

/**
 * Hook für Offline-Status und Synchronisation
 */
export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [syncPending, setSyncPending] = useState<boolean>(false);
  const [syncQueueLength, setSyncQueueLength] = useState<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      setWasOffline(true);
      // Automatische Synchronisation wenn wieder online
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Prüfe initialen Status
    setIsOnline(navigator.onLine);

    // Prüfe Sync-Queue-Länge
    const checkSyncQueue = () => {
      const { getSyncQueue } = require("@/lib/storage/offline-storage");
      const queue = getSyncQueue();
      setSyncQueueLength(queue.length);
    };

    checkSyncQueue();
    const interval = setInterval(checkSyncQueue, 5000); // Alle 5 Sekunden prüfen

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline || syncPending) return;

    setSyncPending(true);
    try {
      const { getSyncQueue, removeFromSyncQueue, setLastSyncTime } = require("@/lib/storage/offline-storage");
      const queue = getSyncQueue();

      // TODO: Implementiere tatsächliche Synchronisation mit Backend
      // Für jetzt nur Queue leeren
      for (const operation of queue) {
        try {
          // Hier würde die tatsächliche API-Anfrage stattfinden
          // await syncOperation(operation);
          removeFromSyncQueue(operation.id);
        } catch (error) {
          console.error("Failed to sync operation:", operation, error);
          // Behalte Operation in Queue für späteren Retry
        }
      }

      setLastSyncTime();
      setSyncQueueLength(0);
    } catch (error) {
      console.error("Failed to sync:", error);
    } finally {
      setSyncPending(false);
    }
  }, [isOnline, syncPending]);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    syncPending,
    syncQueueLength,
    syncNow,
  };
}

