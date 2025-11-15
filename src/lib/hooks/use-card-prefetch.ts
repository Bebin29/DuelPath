import { useEffect, useRef } from "react";
import { useCardCache } from "./use-card-cache";

interface UseCardPrefetchOptions {
  cardIds: string[];
  enabled?: boolean;
}

/**
 * Hook für Prefetching von Cards
 * 
 * Lädt Cards im Hintergrund vor, um Latenz zu reduzieren
 */
export function useCardPrefetch({ cardIds, enabled = true }: UseCardPrefetchOptions) {
  const { getCardData } = useCardCache();
  const prefetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || cardIds.length === 0) {
      return;
    }

    // Prefetch Cards, die noch nicht geladen wurden
    const cardsToPrefetch = cardIds.filter(
      (id) => id && id !== "00000000" && !prefetchedRef.current.has(id)
    );

    if (cardsToPrefetch.length === 0) {
      return;
    }

    // Prefetch in Batches (max 5 gleichzeitig)
    const batchSize = 5;
    for (let i = 0; i < cardsToPrefetch.length; i += batchSize) {
      const batch = cardsToPrefetch.slice(i, i + batchSize);
      
      // Leichter Delay zwischen Batches, um Server nicht zu überlasten
      setTimeout(() => {
        batch.forEach((cardId) => {
          if (!prefetchedRef.current.has(cardId)) {
            prefetchedRef.current.add(cardId);
            getCardData(cardId).catch(() => {
              // Bei Fehler aus Set entfernen, damit Retry möglich ist
              prefetchedRef.current.delete(cardId);
            });
          }
        });
      }, i * 50); // 50ms Delay zwischen Batches
    }
  }, [cardIds, enabled, getCardData]);
}
