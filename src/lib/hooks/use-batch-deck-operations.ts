import { useCallback, useRef, useState, useEffect } from 'react';
import { useTransition } from 'react';
import type { DeckSection } from '@/lib/validations/deck.schema';
import type { DeckWithCards, CardForDeck } from './use-deck-history';
import { batchDeckOperations } from '@/server/actions/deck.actions';

interface BatchOperation {
  type: 'add' | 'update' | 'remove' | 'move';
  cardId: string;
  section: DeckSection;
  toSection?: DeckSection;
  quantity?: number;
  card?: CardForDeck;
  timestamp: number;
}

interface UseBatchDeckOperationsOptions {
  deckId: string;
  deck: DeckWithCards | null;
  setDeck: (updater: (prev: DeckWithCards | null) => DeckWithCards | null) => void;
  addHistoryEntry: (action: any, deckState: DeckWithCards) => void;
  onError?: (error: string) => void;
  onSuccess?: () => void;
  loadDeck: () => Promise<void>;
  batchSize?: number;
  batchDelay?: number; // Verzögerung in ms bevor Batch gesendet wird
}

/**
 * Hook für Batch-Deck-Operationen
 *
 * Sammelt Operationen in einer Queue und sendet sie in Batches an den Server
 * Reduziert die Anzahl der Server-Requests bei mehreren schnellen Operationen
 */
export function useBatchDeckOperations({
  deckId,
  deck,
  setDeck,
  addHistoryEntry,
  onError,
  onSuccess,
  loadDeck,
  batchSize = 10,
  batchDelay = 500,
}: UseBatchDeckOperationsOptions) {
  const [isPending, startTransition] = useTransition();
  const [queue, setQueue] = useState<BatchOperation[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const processingRef = useRef(false);

  /**
   * Verarbeitet die Queue und sendet Batch-Request
   */
  const processQueue = useCallback(async () => {
    if (processingRef.current || queue.length === 0) return;

    processingRef.current = true;
    const operationsToProcess = [...queue];
    setQueue([]);

    // Konvertiere zu Batch-Format
    const batchOperations = operationsToProcess.map((op) => {
      switch (op.type) {
        case 'add':
          return {
            type: 'add' as const,
            cardId: op.cardId,
            deckSection: op.section,
            quantity: op.quantity || 1,
          };
        case 'update':
          return {
            type: 'update' as const,
            cardId: op.cardId,
            deckSection: op.section,
            quantity: op.quantity!,
          };
        case 'remove':
          return {
            type: 'remove' as const,
            cardId: op.cardId,
            deckSection: op.section,
          };
        case 'move':
          return {
            type: 'move' as const,
            cardId: op.cardId,
            fromSection: op.section,
            toSection: op.toSection!,
          };
      }
    });

    startTransition(() => {
      (async () => {
        try {
          const result = await batchDeckOperations(deckId, {
            operations: batchOperations,
          });

          if (result.error) {
            await loadDeck();
            onError?.(result.error);
          } else if (result.results) {
            // Aktualisiere Deck-State basierend auf Batch-Ergebnissen
            setDeck((current) => {
              if (!current) return current;

              let newDeckCards = [...current.deckCards];

              // Verarbeite alle erfolgreichen Operationen
              for (const batchResult of result.results) {
                if (!batchResult.success) continue;

                const op = batchResult.operation;
                switch (op.type) {
                  case 'add':
                  case 'update':
                    if (batchResult.deckCard) {
                      const existingIndex = newDeckCards.findIndex(
                        (dc) =>
                          dc.cardId === batchResult.deckCard!.cardId &&
                          dc.deckSection === batchResult.deckCard!.deckSection
                      );
                      if (existingIndex >= 0) {
                        newDeckCards[existingIndex] = batchResult.deckCard;
                      } else {
                        newDeckCards.push(batchResult.deckCard);
                      }
                    }
                    break;
                  case 'remove':
                    newDeckCards = newDeckCards.filter(
                      (dc) => !(dc.cardId === op.cardId && dc.deckSection === op.deckSection)
                    );
                    break;
                  case 'move':
                    // Entferne aus alter Sektion
                    newDeckCards = newDeckCards.filter(
                      (dc) => !(dc.cardId === op.cardId && dc.deckSection === op.fromSection)
                    );
                    // Füge in neuer Sektion hinzu
                    if (batchResult.deckCard) {
                      const existingIndex = newDeckCards.findIndex(
                        (dc) =>
                          dc.cardId === batchResult.deckCard!.cardId &&
                          dc.deckSection === batchResult.deckCard!.deckSection
                      );
                      if (existingIndex >= 0) {
                        newDeckCards[existingIndex] = batchResult.deckCard;
                      } else {
                        newDeckCards.push(batchResult.deckCard);
                      }
                    }
                    break;
                }
              }

              const updatedDeck = { ...current, deckCards: newDeckCards };

              // Füge alle Operationen zur History hinzu
              operationsToProcess.forEach((op) => {
                addHistoryEntry(
                  {
                    type: op.type,
                    cardId: op.cardId,
                    section: op.section,
                    toSection: op.toSection,
                    quantity: op.quantity,
                  },
                  updatedDeck
                );
              });

              return updatedDeck;
            });
            onSuccess?.();
          }
        } catch (err) {
          await loadDeck();
          onError?.(err instanceof Error ? err.message : 'Batch operation failed');
        } finally {
          processingRef.current = false;
        }
      })();
    });
  }, [queue, deckId, setDeck, addHistoryEntry, onError, onSuccess, loadDeck]);

  /**
   * Fügt eine Operation zur Queue hinzu
   */
  const enqueueOperation = useCallback(
    (operation: Omit<BatchOperation, 'timestamp'>) => {
      setQueue((prev) => {
        const newQueue = [...prev, { ...operation, timestamp: Date.now() }];

        // Wenn Queue voll ist, verarbeite sofort
        if (newQueue.length >= batchSize) {
          if (batchTimerRef.current) {
            clearTimeout(batchTimerRef.current);
            batchTimerRef.current = null;
          }
          setTimeout(() => processQueue(), 0);
          return [];
        }

        // Sonst starte Timer für verzögertes Senden
        if (batchTimerRef.current) {
          clearTimeout(batchTimerRef.current);
        }
        batchTimerRef.current = setTimeout(() => {
          processQueue();
          batchTimerRef.current = null;
        }, batchDelay);

        return newQueue;
      });
    },
    [batchSize, batchDelay, processQueue]
  );

  /**
   * Verarbeitet Queue sofort (z.B. beim Unmount)
   */
  const flushQueue = useCallback(() => {
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }
    processQueue();
  }, [processQueue]);

  // Verarbeite Queue beim Unmount
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
      if (queue.length > 0) {
        processQueue();
      }
    };
  }, []);

  return {
    enqueueOperation,
    flushQueue,
    queueLength: queue.length,
    isPending,
  };
}
