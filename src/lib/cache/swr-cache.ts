/**
 * SWR Cache-Utilities für bessere Cache-Invalidierung
 */

import { mutate } from "swr";
import { invalidateCache, invalidateCachePattern } from "./cache-invalidation";

/**
 * Invalidiert SWR-Cache für einen bestimmten Key
 */
export function invalidateSWRCache(key: string): Promise<void> {
  return mutate(key, undefined, { revalidate: true });
}

/**
 * Invalidiert SWR-Cache für mehrere Keys
 */
export function invalidateSWRCacheKeys(keys: string[]): Promise<void[]> {
  return Promise.all(keys.map((key) => invalidateSWRCache(key)));
}

/**
 * Invalidiert SWR-Cache für Keys die einem Pattern entsprechen
 */
export function invalidateSWRCachePattern(pattern: string | RegExp): void {
  // SWR speichert Keys intern, wir können nur bekannte Keys invalidieren
  // Für Pattern-basierte Invalidierung müssen wir die Keys kennen
  // Dies ist eine vereinfachte Implementierung
  const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;

  // Beispiel: Invalidiere alle Deck-bezogenen Caches
  if (regex.test("/api/decks")) {
    invalidateSWRCache("/api/decks");
    // Weitere bekannte Keys...
  }
}

/**
 * Prefetch SWR-Cache für einen Key
 */
export function prefetchSWRCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  return mutate(key, fetcher, { revalidate: false });
}

