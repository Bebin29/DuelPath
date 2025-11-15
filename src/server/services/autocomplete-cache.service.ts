/**
 * In-Memory Cache für Autocomplete-Ergebnisse
 * 
 * Reduziert Datenbank-Queries für häufig verwendete Autocomplete-Anfragen
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 Minuten
const MAX_CACHE_SIZE = 500; // Maximale Anzahl Einträge pro Cache

class AutocompleteCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  /**
   * Holt einen Wert aus dem Cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Prüfe ob Eintrag abgelaufen ist
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Speichert einen Wert im Cache
   */
  set(key: string, data: T): void {
    // Bereinige Cache wenn zu groß
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Entfernt abgelaufene Einträge
   */
  private cleanup(): void {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        entriesToDelete.push(key);
      }
    }

    entriesToDelete.forEach((key) => this.cache.delete(key));

    // Wenn immer noch zu groß, entferne älteste Einträge
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, this.cache.size - MAX_CACHE_SIZE + 100);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Leert den Cache
   */
  clear(): void {
    this.cache.clear();
  }
}

// Singleton-Instanzen für verschiedene Autocomplete-Typen
export const cardNameCache = new AutocompleteCache<string[]>();
export const archetypeCache = new AutocompleteCache<string[]>();
export const raceCache = new AutocompleteCache<string[]>();

