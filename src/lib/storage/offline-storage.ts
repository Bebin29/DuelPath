/**
 * Offline-Storage-Utility für LocalStorage-basierte Datenpersistenz
 */

const STORAGE_PREFIX = "duelpath_offline_";
const DECK_STORAGE_KEY = `${STORAGE_PREFIX}decks`;
const SYNC_QUEUE_KEY = `${STORAGE_PREFIX}sync_queue`;
const LAST_SYNC_KEY = `${STORAGE_PREFIX}last_sync`;

/**
 * Speichert Deck-Daten im LocalStorage
 */
export function saveDeckToOfflineStorage(deckId: string, deckData: unknown): void {
  if (typeof window === "undefined") return;

  try {
    const existing = getOfflineDecks();
    existing[deckId] = {
      data: deckData,
      timestamp: Date.now(),
    };
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error("Failed to save deck to offline storage:", error);
  }
}

/**
 * Lädt Deck-Daten aus dem LocalStorage
 */
export function getDeckFromOfflineStorage(deckId: string): unknown | null {
  if (typeof window === "undefined") return null;

  try {
    const decks = getOfflineDecks();
    return decks[deckId]?.data || null;
  } catch (error) {
    console.error("Failed to load deck from offline storage:", error);
    return null;
  }
}

/**
 * Lädt alle gespeicherten Decks
 */
export function getOfflineDecks(): Record<string, { data: unknown; timestamp: number }> {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem(DECK_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Failed to load offline decks:", error);
    return {};
  }
}

/**
 * Entfernt ein Deck aus dem Offline-Storage
 */
export function removeDeckFromOfflineStorage(deckId: string): void {
  if (typeof window === "undefined") return;

  try {
    const existing = getOfflineDecks();
    delete existing[deckId];
    localStorage.setItem(DECK_STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error("Failed to remove deck from offline storage:", error);
  }
}

/**
 * Fügt eine Operation zur Sync-Queue hinzu
 */
export function addToSyncQueue(operation: {
  id: string;
  type: "addCard" | "removeCard" | "updateQuantity" | "moveCard" | "updateDeck";
  deckId: string;
  data: unknown;
  timestamp: number;
}): void {
  if (typeof window === "undefined") return;

  try {
    const queue = getSyncQueue();
    queue.push(operation);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Failed to add to sync queue:", error);
  }
}

/**
 * Lädt die Sync-Queue
 */
export function getSyncQueue(): Array<{
  id: string;
  type: string;
  deckId: string;
  data: unknown;
  timestamp: number;
}> {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load sync queue:", error);
    return [];
  }
}

/**
 * Entfernt eine Operation aus der Sync-Queue
 */
export function removeFromSyncQueue(operationId: string): void {
  if (typeof window === "undefined") return;

  try {
    const queue = getSyncQueue();
    const filtered = queue.filter((op) => op.id !== operationId);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to remove from sync queue:", error);
  }
}

/**
 * Leert die Sync-Queue
 */
export function clearSyncQueue(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(SYNC_QUEUE_KEY);
  } catch (error) {
    console.error("Failed to clear sync queue:", error);
  }
}

/**
 * Speichert den Zeitpunkt der letzten Synchronisation
 */
export function setLastSyncTime(timestamp: number = Date.now()): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(LAST_SYNC_KEY, timestamp.toString());
  } catch (error) {
    console.error("Failed to set last sync time:", error);
  }
}

/**
 * Lädt den Zeitpunkt der letzten Synchronisation
 */
export function getLastSyncTime(): number | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(LAST_SYNC_KEY);
    return stored ? parseInt(stored, 10) : null;
  } catch (error) {
    console.error("Failed to get last sync time:", error);
    return null;
  }
}

/**
 * Prüft ob LocalStorage verfügbar ist
 */
export function isLocalStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const test = "__localStorage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

