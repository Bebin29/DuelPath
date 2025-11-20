import { useRef, useCallback } from 'react';
import type { Card } from '@prisma/client';
import type { CardForDeck } from './use-deck-history';

interface CachedCard {
  card: CardForDeck;
  timestamp: number;
}

const CACHE_TTL = 60 * 60 * 1000; // 1 Stunde in Millisekunden

/**
 * Card-Cache für bessere Performance
 *
 * Cacht Card-Daten aus Suchergebnissen und API-Responses
 * Mit TTL-basiertem Caching (1 Stunde)
 */
export function useCardCache() {
  const cacheRef = useRef<Map<string, CachedCard>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Prüft ob ein Cache-Eintrag noch gültig ist
   */
  const isCacheValid = useCallback((cached: CachedCard): boolean => {
    return Date.now() - cached.timestamp < CACHE_TTL;
  }, []);

  /**
   * Bereinigt abgelaufene Cache-Einträge
   */
  const cleanupExpiredEntries = useCallback(() => {
    const now = Date.now();
    for (const [key, cached] of cacheRef.current.entries()) {
      if (now - cached.timestamp >= CACHE_TTL) {
        cacheRef.current.delete(key);
      }
    }
  }, []);

  /**
   * Fügt eine Card zum Cache hinzu
   */
  const addToCache = useCallback(
    (card: Card | CardForDeck) => {
      const cardForDeck: CardForDeck = {
        id: card.id,
        name: card.name,
        type: card.type,
        race: card.race ?? null,
        attribute: card.attribute ?? null,
        level: card.level ?? null,
        atk: card.atk ?? null,
        def: card.def ?? null,
        archetype: card.archetype ?? null,
        imageSmall: card.imageSmall ?? null,
      };
      cacheRef.current.set(card.id, {
        card: cardForDeck,
        timestamp: Date.now(),
      });
      // Periodische Bereinigung (alle 100 Einträge)
      if (cacheRef.current.size % 100 === 0) {
        cleanupExpiredEntries();
      }
    },
    [cleanupExpiredEntries]
  );

  /**
   * Fügt mehrere Cards zum Cache hinzu
   */
  const addMultipleToCache = useCallback(
    (cards: (Card | CardForDeck)[]) => {
      cards.forEach((card) => addToCache(card));
    },
    [addToCache]
  );

  /**
   * Holt eine Card aus dem Cache
   */
  const getFromCache = useCallback(
    (cardId: string): CardForDeck | null => {
      const cached = cacheRef.current.get(cardId);
      if (!cached) return null;

      if (isCacheValid(cached)) {
        return cached.card;
      } else {
        // Cache-Eintrag abgelaufen, entfernen
        cacheRef.current.delete(cardId);
        return null;
      }
    },
    [isCacheValid]
  );

  /**
   * Holt mehrere Cards aus dem Cache
   */
  const getMultipleFromCache = useCallback(
    (cardIds: string[]): Map<string, CardForDeck> => {
      const result = new Map<string, CardForDeck>();
      cardIds.forEach((id) => {
        const card = getFromCache(id);
        if (card) {
          result.set(id, card);
        }
      });
      return result;
    },
    [getFromCache]
  );

  /**
   * Lädt eine Card von der API (mit Cache-Fallback)
   */
  const getCardData = useCallback(
    async (cardId: string): Promise<CardForDeck | null> => {
      // Prüfe zuerst Cache
      const cached = getFromCache(cardId);
      if (cached) {
        return cached;
      }

      // Lade von API
      // Breche vorherigen Request ab
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`/api/cards?id=${cardId}`, {
          signal: abortControllerRef.current.signal,
        });
        if (response.ok) {
          const data = await response.json();
          if (data.card) {
            addToCache(data.card);
            return {
              id: data.card.id,
              name: data.card.name,
              type: data.card.type,
              race: data.card.race ?? null,
              attribute: data.card.attribute ?? null,
              level: data.card.level ?? null,
              atk: data.card.atk ?? null,
              def: data.card.def ?? null,
              archetype: data.card.archetype ?? null,
              imageSmall: data.card.imageSmall ?? null,
            };
          }
        }
      } catch (error) {
        console.error('Failed to fetch card:', error);
      }
      return null;
    },
    [getFromCache, addToCache]
  );

  /**
   * Lädt mehrere Cards von der API (Batch-Request)
   */
  const getMultipleCardData = useCallback(
    async (cardIds: string[]): Promise<Map<string, CardForDeck>> => {
      // Prüfe zuerst Cache
      const cached = getMultipleFromCache(cardIds);
      const missingIds = cardIds.filter((id) => !cached.has(id));

      if (missingIds.length === 0) {
        return cached;
      }

      // Batch-Request für fehlende Cards
      try {
        const response = await fetch(`/api/cards?ids=${missingIds.join(',')}`);
        if (response.ok) {
          const data = await response.json();
          if (data.cards && Array.isArray(data.cards)) {
            data.cards.forEach((card: Card) => {
              addToCache(card);
              const cardForDeck: CardForDeck = {
                id: card.id,
                name: card.name,
                type: card.type,
                race: card.race ?? null,
                attribute: card.attribute ?? null,
                level: card.level ?? null,
                atk: card.atk ?? null,
                def: card.def ?? null,
                archetype: card.archetype ?? null,
                imageSmall: card.imageSmall ?? null,
              };
              cached.set(card.id, cardForDeck);
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch cards:', error);
      }

      return cached;
    },
    [getMultipleFromCache, addToCache]
  );

  /**
   * Leert den Cache
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  /**
   * Bricht laufende Requests ab
   */
  const abortRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    addToCache,
    addMultipleToCache,
    getFromCache,
    getMultipleFromCache,
    getCardData,
    getMultipleCardData,
    clearCache,
    abortRequests,
  };
}
