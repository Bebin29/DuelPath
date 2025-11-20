/**
 * Cache-Invalidierung Utilities
 */

import { getCacheExpiry, isCacheExpired } from './cache-utils';

interface CacheEntry<T> {
  data: T;
  expiry: Date;
  etag?: string;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

/**
 * Speichert Daten im Cache
 */
export function setCache<T>(key: string, data: T, maxAge: number = 3600, etag?: string): void {
  cacheStore.set(key, {
    data,
    expiry: getCacheExpiry(maxAge),
    etag,
  });
}

/**
 * Lädt Daten aus dem Cache
 */
export function getCache<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;

  if (isCacheExpired(entry.expiry)) {
    cacheStore.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Invalidiert einen Cache-Eintrag
 */
export function invalidateCache(key: string): void {
  cacheStore.delete(key);
}

/**
 * Invalidiert alle Cache-Einträge die einem Pattern entsprechen
 */
export function invalidateCachePattern(pattern: string | RegExp): void {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
  const keysToDelete: string[] = [];

  for (const key of cacheStore.keys()) {
    if (regex.test(key)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => cacheStore.delete(key));
}

/**
 * Leert den gesamten Cache
 */
export function clearCache(): void {
  cacheStore.clear();
}

/**
 * Gibt Cache-Statistiken zurück
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{ key: string; expiry: Date; expired: boolean }>;
} {
  const entries: Array<{ key: string; expiry: Date; expired: boolean }> = [];

  for (const [key, entry] of cacheStore.entries()) {
    entries.push({
      key,
      expiry: entry.expiry,
      expired: isCacheExpired(entry.expiry),
    });
  }

  return {
    size: cacheStore.size,
    entries,
  };
}

/**
 * Bereinigt abgelaufene Cache-Einträge
 */
export function cleanupExpiredCache(): number {
  let cleaned = 0;
  const keysToDelete: string[] = [];

  for (const [key, entry] of cacheStore.entries()) {
    if (isCacheExpired(entry.expiry)) {
      keysToDelete.push(key);
      cleaned++;
    }
  }

  keysToDelete.forEach((key) => cacheStore.delete(key));
  return cleaned;
}

// Automatische Bereinigung alle 5 Minuten
if (typeof window !== 'undefined') {
  setInterval(
    () => {
      cleanupExpiredCache();
    },
    5 * 60 * 1000
  );
}
