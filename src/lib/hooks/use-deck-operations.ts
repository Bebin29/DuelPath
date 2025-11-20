import { useCallback, useRef, useState } from 'react';
import { useTransition } from 'react';
import type { DeckSection } from '@/lib/validations/deck.schema';
import type { DeckWithCards, CardForDeck, HistoryAction } from './use-deck-history';
import { useRetry } from './use-retry';
import {
  addCardToDeck,
  updateCardQuantity,
  removeCardFromDeck,
  moveCardBetweenSections,
} from '@/server/actions/deck.actions';

interface UseDeckOperationsOptions {
  deckId: string;
  deck: DeckWithCards | null;
  setDeck: (updater: (prev: DeckWithCards | null) => DeckWithCards | null) => void;
  addHistoryEntry: (action: HistoryAction, deckState: DeckWithCards) => void;
  onError?: (error: string, retryFn?: () => Promise<void>) => void;
  onSuccess?: (message?: string) => void;
  loadDeck: () => Promise<void>;
  updateOptimisticDeck?: (action: OptimisticAction) => void;
}

type OptimisticAction =
  | { type: 'addCard'; cardId: string; section: DeckSection; card: CardForDeck }
  | { type: 'updateQuantity'; cardId: string; section: DeckSection; quantity: number }
  | { type: 'removeCard'; cardId: string; section: DeckSection }
  | { type: 'moveCard'; cardId: string; fromSection: DeckSection; toSection: DeckSection };

interface PendingOperation {
  cardId: string;
  section: DeckSection;
  type: 'add' | 'update' | 'remove' | 'move';
  timestamp: number;
}

/**
 * Custom Hook für Deck-Operationen mit Request-Deduplizierung
 *
 * Features:
 * - Request-Queue mit Debouncing für Quantity-Updates
 * - Identische Requests innerhalb 500ms werden dedupliziert
 * - AbortController für abgebrochene Requests
 */
export function useDeckOperations({
  deckId,
  deck,
  setDeck,
  addHistoryEntry,
  onError,
  onSuccess,
  loadDeck,
  updateOptimisticDeck,
}: UseDeckOperationsOptions) {
  const [isPending, startTransition] = useTransition();
  const [pendingOperations, setPendingOperations] = useState<Map<string, string>>(new Map());
  const pendingOperationsRef = useRef<Map<string, PendingOperation>>(new Map());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const optimisticStateRef = useRef<Map<string, DeckWithCards>>(new Map());
  const { retry } = useRetry({ maxRetries: 3, initialDelay: 1000 });

  /**
   * Generiert einen eindeutigen Key für eine Operation
   */
  const getOperationKey = useCallback(
    (type: string, cardId: string, section: DeckSection, toSection?: DeckSection) => {
      return `${type}-${cardId}-${section}${toSection ? `-${toSection}` : ''}`;
    },
    []
  );

  /**
   * Prüft ob eine identische Operation bereits pending ist
   */
  const isOperationPending = useCallback((key: string, maxAge: number = 500) => {
    const pending = pendingOperationsRef.current.get(key);
    if (!pending) return false;
    return Date.now() - pending.timestamp < maxAge;
  }, []);

  /**
   * Bricht eine pending Operation ab
   */
  const cancelOperation = useCallback((key: string) => {
    const controller = abortControllersRef.current.get(key);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(key);
    }
    const timer = debounceTimersRef.current.get(key);
    if (timer) {
      clearTimeout(timer);
      debounceTimersRef.current.delete(key);
    }
    pendingOperationsRef.current.delete(key);
  }, []);

  /**
   * Rollback für eine spezifische Operation (selektiver Rollback)
   */
  const rollbackOperation = useCallback(
    (operationKey: string, cardId: string, section: DeckSection) => {
      const previousState = optimisticStateRef.current.get(operationKey);
      if (previousState && deck) {
        // Setze nur die betroffene Karte zurück
        setDeck((current) => {
          if (!current) return current;
          // Finde die Karte die zurückgesetzt werden muss
          const previousDeckCard = previousState.deckCards.find(
            (dc) => dc.cardId === cardId && dc.deckSection === section
          );
          const currentDeckCard = current.deckCards.find(
            (dc) => dc.cardId === cardId && dc.deckSection === section
          );

          if (previousDeckCard && currentDeckCard) {
            // Karte existierte vorher: Setze auf vorherigen Zustand zurück
            return {
              ...current,
              deckCards: current.deckCards.map((dc) =>
                dc.cardId === cardId && dc.deckSection === section ? previousDeckCard : dc
              ),
            };
          } else if (!previousDeckCard && currentDeckCard) {
            // Karte existierte nicht vorher: Entferne sie
            return {
              ...current,
              deckCards: current.deckCards.filter(
                (dc) => !(dc.cardId === cardId && dc.deckSection === section)
              ),
            };
          }
          return current;
        });
      }
      optimisticStateRef.current.delete(operationKey);
    },
    [deck, setDeck]
  );

  /**
   * Fügt eine Karte zum Deck hinzu
   */
  const addCard = useCallback(
    async (cardId: string, section: DeckSection, card?: CardForDeck) => {
      const key = getOperationKey('add', cardId, section);

      // Prüfe ob bereits pending
      if (isOperationPending(key)) {
        return;
      }

      // Speichere aktuellen State für Rollback
      const operationKey = `${cardId}-${section}`;
      if (deck) {
        optimisticStateRef.current.set(operationKey, JSON.parse(JSON.stringify(deck)));
      }

      // Markiere als pending
      setPendingOperations((prev) => new Map(prev).set(operationKey, 'add'));
      pendingOperationsRef.current.set(key, {
        cardId,
        section,
        type: 'add',
        timestamp: Date.now(),
      });

      // Optimistic update
      if (updateOptimisticDeck && card) {
        updateOptimisticDeck({
          type: 'addCard',
          cardId,
          section,
          card,
        });
      }

      startTransition(() => {
        (async () => {
          try {
            const result = await retry(key, () =>
              addCardToDeck(deckId, {
                cardId,
                quantity: 1,
                deckSection: section,
              })
            );

            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(operationKey);
              return next;
            });
            pendingOperationsRef.current.delete(key);
            optimisticStateRef.current.delete(operationKey);

            if (result.error) {
              // Selektiver Rollback statt loadDeck()
              rollbackOperation(operationKey, cardId, section);
              onError?.(result.error);
            } else if (result.deckCard) {
              // Aktualisiere State direkt mit Server-Response
              setDeck((current) => {
                if (!current) return current;
                const updatedDeck = {
                  ...current,
                  deckCards: current.deckCards.some(
                    (dc) =>
                      dc.cardId === result.deckCard!.cardId &&
                      dc.deckSection === result.deckCard!.deckSection
                  )
                    ? current.deckCards.map((dc) =>
                        dc.cardId === result.deckCard!.cardId &&
                        dc.deckSection === result.deckCard!.deckSection
                          ? result.deckCard!
                          : dc
                      )
                    : [...current.deckCards, result.deckCard!],
                };
                addHistoryEntry({ type: 'addCard', cardId, section }, updatedDeck);
                return updatedDeck;
              });
              onSuccess?.();
            }
          } catch (err) {
            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(operationKey);
              return next;
            });
            pendingOperationsRef.current.delete(key);
            // Selektiver Rollback statt loadDeck()
            rollbackOperation(operationKey, cardId, section);
            onError?.(err instanceof Error ? err.message : 'Failed to add card');
          }
        })();
      });
    },
    [
      deckId,
      deck,
      setDeck,
      addHistoryEntry,
      onError,
      onSuccess,
      getOperationKey,
      isOperationPending,
      updateOptimisticDeck,
      retry,
      rollbackOperation,
    ]
  );

  /**
   * Aktualisiert die Anzahl einer Karte (mit Debouncing)
   */
  const updateQuantity = useCallback(
    async (cardId: string, section: DeckSection, newQuantity: number, oldQuantity: number) => {
      const key = getOperationKey('update', cardId, section);

      // Bricht vorherige pending Operation ab
      cancelOperation(key);

      // Speichere aktuellen State für Rollback
      const operationKey = `${cardId}-${section}`;
      if (deck) {
        optimisticStateRef.current.set(operationKey, JSON.parse(JSON.stringify(deck)));
      }

      // Markiere als pending
      setPendingOperations((prev) => new Map(prev).set(operationKey, 'update'));
      pendingOperationsRef.current.set(key, {
        cardId,
        section,
        type: 'update',
        timestamp: Date.now(),
      });

      // Optimistic update
      if (updateOptimisticDeck) {
        updateOptimisticDeck({
          type: 'updateQuantity',
          cardId,
          section,
          quantity: newQuantity,
        });
      }

      // Debounce: Warte 300ms bevor Request gesendet wird
      const timer = setTimeout(() => {
        startTransition(() => {
          (async () => {
            try {
              const result = await retry(key, () =>
                updateCardQuantity(deckId, {
                  cardId,
                  quantity: newQuantity,
                  deckSection: section,
                })
              );

              setPendingOperations((prev) => {
                const next = new Map(prev);
                next.delete(operationKey);
                return next;
              });
              pendingOperationsRef.current.delete(key);
              debounceTimersRef.current.delete(key);
              optimisticStateRef.current.delete(operationKey);

              if (result.error) {
                // Selektiver Rollback statt loadDeck()
                rollbackOperation(operationKey, cardId, section);
                onError?.(result.error);
              } else if (result.deckCard) {
                // Aktualisiere State direkt mit Server-Response
                setDeck((current) => {
                  if (!current) return current;
                  const updatedDeck = {
                    ...current,
                    deckCards: current.deckCards.map((dc) =>
                      dc.cardId === cardId && dc.deckSection === section ? result.deckCard! : dc
                    ),
                  };
                  addHistoryEntry(
                    { type: 'updateQuantity', cardId, section, oldQuantity, newQuantity },
                    updatedDeck
                  );
                  return updatedDeck;
                });
              }
            } catch (err) {
              setPendingOperations((prev) => {
                const next = new Map(prev);
                next.delete(operationKey);
                return next;
              });
              pendingOperationsRef.current.delete(key);
              debounceTimersRef.current.delete(key);
              // Selektiver Rollback statt loadDeck()
              rollbackOperation(operationKey, cardId, section);
              onError?.(err instanceof Error ? err.message : 'Failed to update quantity');
            }
          })();
        });
      }, 300);

      debounceTimersRef.current.set(key, timer);
    },
    [
      deckId,
      deck,
      setDeck,
      addHistoryEntry,
      onError,
      getOperationKey,
      cancelOperation,
      updateOptimisticDeck,
      retry,
      rollbackOperation,
    ]
  );

  /**
   * Entfernt eine Karte aus dem Deck
   */
  const removeCard = useCallback(
    async (cardId: string, section: DeckSection) => {
      const key = getOperationKey('remove', cardId, section);

      if (isOperationPending(key)) {
        return;
      }

      // Speichere aktuellen State für Rollback
      const operationKey = `${cardId}-${section}`;
      if (deck) {
        optimisticStateRef.current.set(operationKey, JSON.parse(JSON.stringify(deck)));
      }

      setPendingOperations((prev) => new Map(prev).set(operationKey, 'remove'));
      pendingOperationsRef.current.set(key, {
        cardId,
        section,
        type: 'remove',
        timestamp: Date.now(),
      });

      // Optimistic update
      if (updateOptimisticDeck) {
        updateOptimisticDeck({
          type: 'removeCard',
          cardId,
          section,
        });
      }

      startTransition(() => {
        (async () => {
          try {
            const result = await retry(key, () =>
              removeCardFromDeck(deckId, {
                cardId,
                deckSection: section,
              })
            );

            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(operationKey);
              return next;
            });
            pendingOperationsRef.current.delete(key);
            optimisticStateRef.current.delete(operationKey);

            if (result.error) {
              // Selektiver Rollback statt loadDeck()
              rollbackOperation(operationKey, cardId, section);
              onError?.(result.error);
            } else if (result.removedDeckCard) {
              // Aktualisiere State direkt - entferne Karte
              setDeck((current) => {
                if (!current) return current;
                const updatedDeck = {
                  ...current,
                  deckCards: current.deckCards.filter(
                    (dc) => !(dc.cardId === cardId && dc.deckSection === section)
                  ),
                };
                addHistoryEntry({ type: 'removeCard', cardId, section }, updatedDeck);
                return updatedDeck;
              });
              onSuccess?.();
            }
          } catch (err) {
            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(operationKey);
              return next;
            });
            pendingOperationsRef.current.delete(key);
            // Selektiver Rollback statt loadDeck()
            rollbackOperation(operationKey, cardId, section);
            onError?.(err instanceof Error ? err.message : 'Failed to remove card');
          }
        })();
      });
    },
    [
      deckId,
      deck,
      setDeck,
      addHistoryEntry,
      onError,
      onSuccess,
      getOperationKey,
      isOperationPending,
      updateOptimisticDeck,
      retry,
      rollbackOperation,
    ]
  );

  /**
   * Verschiebt eine Karte zwischen Sektionen
   */
  const moveCard = useCallback(
    async (cardId: string, fromSection: DeckSection, toSection: DeckSection) => {
      const key = getOperationKey('move', cardId, fromSection, toSection);

      if (isOperationPending(key)) {
        return;
      }

      // Speichere aktuellen State für Rollback
      const operationKey = `${cardId}-${fromSection}`;
      if (deck) {
        optimisticStateRef.current.set(operationKey, JSON.parse(JSON.stringify(deck)));
      }

      setPendingOperations((prev) => new Map(prev).set(operationKey, 'move'));
      pendingOperationsRef.current.set(key, {
        cardId,
        section: fromSection,
        type: 'move',
        timestamp: Date.now(),
      });

      // Optimistic update
      if (updateOptimisticDeck) {
        updateOptimisticDeck({
          type: 'moveCard',
          cardId,
          fromSection,
          toSection,
        });
      }

      startTransition(() => {
        (async () => {
          try {
            const result = await retry(key, () =>
              moveCardBetweenSections(deckId, {
                cardId,
                fromSection,
                toSection,
              })
            );

            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(operationKey);
              return next;
            });
            pendingOperationsRef.current.delete(key);
            optimisticStateRef.current.delete(operationKey);

            if (result.error) {
              // Selektiver Rollback statt loadDeck()
              rollbackOperation(operationKey, cardId, fromSection);
              onError?.(result.error);
            } else if (result.deckCard) {
              // Aktualisiere State direkt mit Server-Response
              setDeck((current) => {
                if (!current) return current;
                let newDeckCards = current.deckCards;

                if (result.removedCardId && result.removedSection) {
                  newDeckCards = newDeckCards.filter(
                    (dc) =>
                      !(
                        dc.cardId === result.removedCardId &&
                        dc.deckSection === result.removedSection
                      )
                  );
                } else {
                  newDeckCards = newDeckCards.map((dc) =>
                    dc.cardId === cardId && dc.deckSection === fromSection
                      ? { ...dc, deckSection: toSection }
                      : dc
                  );
                }

                const existingIndex = newDeckCards.findIndex(
                  (dc) =>
                    dc.cardId === result.deckCard!.cardId &&
                    dc.deckSection === result.deckCard!.deckSection
                );
                if (existingIndex >= 0) {
                  newDeckCards[existingIndex] = result.deckCard;
                } else {
                  newDeckCards.push(result.deckCard);
                }

                const updatedDeck = { ...current, deckCards: newDeckCards };
                addHistoryEntry({ type: 'moveCard', cardId, fromSection, toSection }, updatedDeck);
                return updatedDeck;
              });
            }
          } catch (err) {
            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(operationKey);
              return next;
            });
            pendingOperationsRef.current.delete(key);
            // Selektiver Rollback statt loadDeck()
            rollbackOperation(operationKey, cardId, fromSection);
            onError?.(err instanceof Error ? err.message : 'Failed to move card');
          }
        })();
      });
    },
    [
      deckId,
      deck,
      setDeck,
      addHistoryEntry,
      onError,
      getOperationKey,
      isOperationPending,
      updateOptimisticDeck,
      retry,
      rollbackOperation,
    ]
  );

  return {
    addCard,
    updateQuantity,
    removeCard,
    moveCard,
    isPending,
    pendingOperations,
  };
}
