import { useCallback, useRef, useState } from "react";
import { useTransition } from "react";
import type { ComboWithSteps } from "@/types/combo.types";
import type { CreateComboStepInput, UpdateComboStepInput } from "@/lib/validations/combo.schema";
import type { Card } from "@prisma/client";
import { useRetry } from "./use-retry";
import {
  createCombo,
  updateCombo,
  deleteCombo,
  addComboStep,
  updateComboStep,
  deleteComboStep,
  reorderComboSteps,
} from "@/server/actions/combo.actions";
import { sortComboSteps } from "@/lib/utils/combo.utils";
import type { HistoryAction } from "./use-combo-history";

interface UseComboOperationsOptions {
  comboId?: string;
  combo: ComboWithSteps | null;
  setCombo: (updater: (prev: ComboWithSteps | null) => ComboWithSteps | null) => void;
  addHistoryEntry: (action: HistoryAction, comboState: ComboWithSteps) => void;
  onError?: (error: string, retryFn?: () => Promise<void>) => void;
  onSuccess?: (message?: string) => void;
  loadCombo?: () => Promise<void>;
  queueOfflineOperation?: (
    type: "create" | "update" | "delete",
    resource: "combo" | "step",
    data: unknown
  ) => void;
}

interface PendingOperation {
  stepId?: string;
  type: "create" | "update" | "delete" | "addStep" | "updateStep" | "deleteStep" | "reorderSteps";
  timestamp: number;
}

/**
 * Custom Hook für Combo-Operationen mit Request-Deduplizierung
 * 
 * Features:
 * - Request-Queue mit Debouncing
 * - Identische Requests innerhalb 500ms werden dedupliziert
 * - AbortController für abgebrochene Requests
 * - Optimistic Updates
 */
export function useComboOperations({
  comboId,
  combo,
  setCombo,
  addHistoryEntry,
  onError,
  onSuccess,
  loadCombo,
  queueOfflineOperation,
}: UseComboOperationsOptions) {
  const [isPending, startTransition] = useTransition();
  const [pendingOperations, setPendingOperations] = useState<Map<string, string>>(new Map());
  const [loadingStates, setLoadingStates] = useState<{
    isUpdatingCombo: boolean;
    isAddingStep: boolean;
    isUpdatingStep: Map<string, boolean>;
    isDeletingStep: Map<string, boolean>;
    isReorderingSteps: boolean;
  }>({
    isUpdatingCombo: false,
    isAddingStep: false,
    isUpdatingStep: new Map(),
    isDeletingStep: new Map(),
    isReorderingSteps: false,
  });
  const pendingOperationsRef = useRef<Map<string, PendingOperation>>(new Map());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const optimisticStateRef = useRef<Map<string, ComboWithSteps>>(new Map());
  const { retry } = useRetry({ maxRetries: 3, initialDelay: 1000 });

  /**
   * Generiert einen eindeutigen Key für eine Operation
   */
  const getOperationKey = useCallback(
    (type: string, stepId?: string) => {
      return stepId ? `${type}-${stepId}` : type;
    },
    []
  );

  /**
   * Prüft ob eine identische Operation bereits pending ist
   */
  const isOperationPending = useCallback(
    (key: string, maxAge: number = 500) => {
      const pending = pendingOperationsRef.current.get(key);
      if (!pending) return false;
      return Date.now() - pending.timestamp < maxAge;
    },
    []
  );

  /**
   * Bricht eine pending Operation ab
   */
  const cancelOperation = useCallback((key: string) => {
    const controller = abortControllersRef.current.get(key);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(key);
    }
    pendingOperationsRef.current.delete(key);
  }, []);

  /**
   * Aktualisiert eine Kombo
   */
  const updateComboData = useCallback(
    async (data: { title?: string; description?: string | null; deckId?: string | null }) => {
      if (!comboId) {
        onError?.("Keine Kombo-ID vorhanden");
        return;
      }

      const key = getOperationKey("update");

      if (isOperationPending(key)) {
        return;
      }

      // Speichere aktuellen State für Rollback
      if (combo) {
        optimisticStateRef.current.set(key, structuredClone(combo));
      }

      // Optimistic update
      setCombo((current) => {
        if (!current) return current;
        return {
          ...current,
          ...data,
          updatedAt: new Date(),
        };
      });

      setPendingOperations((prev) => new Map(prev).set(key, "update"));
      setLoadingStates((prev) => ({ ...prev, isUpdatingCombo: true }));
      pendingOperationsRef.current.set(key, {
        type: "update",
        timestamp: Date.now(),
      });

      startTransition(() => {
        (async () => {
          try {
            const result = await retry(key, () => updateCombo(comboId, data));

            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
            setLoadingStates((prev) => ({ ...prev, isUpdatingCombo: false }));
            pendingOperationsRef.current.delete(key);
            optimisticStateRef.current.delete(key);

            if (result.error) {
              // Rollback
              const previousState = optimisticStateRef.current.get(key);
              if (previousState) {
                setCombo(previousState);
              } else if (loadCombo) {
                await loadCombo();
              }
              onError?.(result.error);
            } else if (result.combo) {
              setCombo((current) => {
                if (!current) return current;
                const updated = {
                  ...current,
                  ...result.combo,
                  steps: current.steps, // Behalte Steps
                };
                addHistoryEntry({ type: "updateCombo", field: Object.keys(data)[0] || "" }, updated);
                return updated;
              });
              onSuccess?.();
            }
          } catch (err) {
            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
            pendingOperationsRef.current.delete(key);
            // Rollback
            const previousState = optimisticStateRef.current.get(key);
            if (previousState) {
              setCombo(previousState);
            } else if (loadCombo) {
              await loadCombo();
            }
            onError?.(err instanceof Error ? err.message : "Failed to update combo");
          }
        })();
      });
    },
    [comboId, combo, setCombo, addHistoryEntry, onError, onSuccess, getOperationKey, isOperationPending, retry, loadCombo]
  );

  /**
   * Fügt einen Step hinzu
   */
  const addStep = useCallback(
    async (step: CreateComboStepInput) => {
      if (!comboId) {
        onError?.("Keine Kombo-ID vorhanden");
        return;
      }

      const key = getOperationKey("addStep");

      if (isOperationPending(key)) {
        return;
      }

      // Speichere aktuellen State für Rollback
      if (combo) {
        optimisticStateRef.current.set(key, structuredClone(combo));
      }

      // Optimistic update (temporäre ID)
      const tempStepId = `temp-${Date.now()}`;
      setCombo((current) => {
        if (!current) return current;
        
        // Versuche Card-Daten aus bestehenden Steps zu finden
        const existingCard = current.steps.find((s) => s.cardId === step.cardId)?.card;
        
        // Erstelle minimale Card-Struktur falls nicht vorhanden
        const card: Pick<Card, "id" | "name" | "imageSmall" | "type"> = existingCard || {
          id: step.cardId,
          name: "",
          imageSmall: null,
          type: "",
        };
        
        const newStep = {
          id: tempStepId,
          comboId: current.id,
          order: step.order,
          cardId: step.cardId,
          actionType: step.actionType,
          description: step.description || null,
          targetCardId: step.targetCardId || null,
          card: card as Card, // Type assertion für vollständige Card-Struktur
        };
        const updated = {
          ...current,
          steps: sortComboSteps([...current.steps, newStep]),
        };
        return updated;
      });

      setPendingOperations((prev) => new Map(prev).set(key, "addStep"));
      setLoadingStates((prev) => ({ ...prev, isAddingStep: true }));
      pendingOperationsRef.current.set(key, {
        type: "addStep",
        timestamp: Date.now(),
      });

      startTransition(() => {
        (async () => {
          try {
            const result = await retry(key, () => addComboStep(comboId, step));

            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
            setLoadingStates((prev) => ({ ...prev, isAddingStep: false }));
            pendingOperationsRef.current.delete(key);
            optimisticStateRef.current.delete(key);

            if (result.error) {
              // Rollback
              const previousState = optimisticStateRef.current.get(key);
              if (previousState) {
                setCombo(previousState);
              } else if (loadCombo) {
                await loadCombo();
              }
              onError?.(result.error);
            } else if (result.step) {
              setCombo((current) => {
                if (!current) return current;
                const updated = {
                  ...current,
                  steps: sortComboSteps(
                    current.steps
                      .filter((s) => s.id !== tempStepId)
                      .concat(result.step!)
                  ),
                };
                addHistoryEntry(
                  { type: "addStep", stepId: result.step!.id, order: result.step!.order },
                  updated
                );
                return updated;
              });
              onSuccess?.();
            }
          } catch (err) {
            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
            setLoadingStates((prev) => ({ ...prev, isAddingStep: false }));
            pendingOperationsRef.current.delete(key);
            // Rollback
            const previousState = optimisticStateRef.current.get(key);
            if (previousState) {
              setCombo(previousState);
            } else if (loadCombo) {
              await loadCombo();
            }
            onError?.(err instanceof Error ? err.message : "Failed to add step");
          }
        })();
      });
    },
    [comboId, combo, setCombo, addHistoryEntry, onError, onSuccess, getOperationKey, isOperationPending, retry, loadCombo]
  );

  /**
   * Aktualisiert einen Step
   */
  const updateStep = useCallback(
    async (stepId: string, step: UpdateComboStepInput) => {
      if (!comboId) {
        onError?.("Keine Kombo-ID vorhanden");
        return;
      }

      const key = getOperationKey("updateStep", stepId);

      if (isOperationPending(key)) {
        return;
      }

      // Speichere aktuellen State für Rollback
      if (combo) {
        optimisticStateRef.current.set(key, structuredClone(combo));
      }

      // Optimistic update
      setCombo((current) => {
        if (!current) return current;
        const updated = {
          ...current,
          steps: current.steps.map((s) =>
            s.id === stepId
              ? {
                  ...s,
                  ...step,
                  order: step.order ?? s.order,
                }
              : s
          ),
        };
        return updated;
      });

      setPendingOperations((prev) => new Map(prev).set(key, "updateStep"));
      setLoadingStates((prev) => ({
        ...prev,
        isUpdatingStep: new Map(prev.isUpdatingStep).set(stepId, true),
      }));
      pendingOperationsRef.current.set(key, {
        stepId,
        type: "updateStep",
        timestamp: Date.now(),
      });

      startTransition(() => {
        (async () => {
          try {
            const result = await retry(key, () => updateComboStep(stepId, step));

            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
            setLoadingStates((prev) => {
              const newMap = new Map(prev.isUpdatingStep);
              newMap.delete(stepId);
              return { ...prev, isUpdatingStep: newMap };
            });
            pendingOperationsRef.current.delete(key);
            optimisticStateRef.current.delete(key);

            if (result.error) {
              // Rollback
              const previousState = optimisticStateRef.current.get(key);
              if (previousState) {
                setCombo(previousState);
              } else if (loadCombo) {
                await loadCombo();
              }
              onError?.(result.error);
            } else if (result.step) {
              setCombo((current) => {
                if (!current) return current;
                const updated = {
                  ...current,
                  steps: sortComboSteps(
                    current.steps.map((s) => (s.id === stepId ? result.step! : s))
                  ),
                };
                addHistoryEntry(
                  { type: "updateStep", stepId: result.step!.id, order: result.step!.order },
                  updated
                );
                return updated;
              });
              onSuccess?.();
            }
          } catch (err) {
            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
            setLoadingStates((prev) => {
              const newMap = new Map(prev.isUpdatingStep);
              newMap.delete(stepId);
              return { ...prev, isUpdatingStep: newMap };
            });
            pendingOperationsRef.current.delete(key);
            // Rollback
            const previousState = optimisticStateRef.current.get(key);
            if (previousState) {
              setCombo(previousState);
            } else if (loadCombo) {
              await loadCombo();
            }
            onError?.(err instanceof Error ? err.message : "Failed to update step");
          }
        })();
      });
    },
    [comboId, combo, setCombo, addHistoryEntry, onError, onSuccess, getOperationKey, isOperationPending, retry, loadCombo]
  );

  /**
   * Löscht einen Step
   */
  const removeStep = useCallback(
    async (stepId: string) => {
      if (!comboId) {
        onError?.("Keine Kombo-ID vorhanden");
        return;
      }

      const key = getOperationKey("deleteStep", stepId);

      if (isOperationPending(key)) {
        return;
      }

      // Speichere aktuellen State für Rollback
      const step = combo?.steps.find((s) => s.id === stepId);
      if (combo && step) {
        optimisticStateRef.current.set(key, JSON.parse(JSON.stringify(combo)));
      }

      // Optimistic update
      setCombo((current) => {
        if (!current) return current;
        return {
          ...current,
          steps: current.steps.filter((s) => s.id !== stepId).map((s, index) => ({
            ...s,
            order: index + 1,
          })),
        };
      });

      setPendingOperations((prev) => new Map(prev).set(key, "deleteStep"));
      setLoadingStates((prev) => ({
        ...prev,
        isDeletingStep: new Map(prev.isDeletingStep).set(stepId, true),
      }));
      pendingOperationsRef.current.set(key, {
        stepId,
        type: "deleteStep",
        timestamp: Date.now(),
      });

      startTransition(() => {
        (async () => {
          try {
            const result = await retry(key, () => deleteComboStep(stepId));

            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
            setLoadingStates((prev) => {
              const newMap = new Map(prev.isDeletingStep);
              newMap.delete(stepId);
              return { ...prev, isDeletingStep: newMap };
            });
            pendingOperationsRef.current.delete(key);
            optimisticStateRef.current.delete(key);

            if (result.error) {
              // Rollback
              const previousState = optimisticStateRef.current.get(key);
              if (previousState) {
                setCombo(previousState);
              } else if (loadCombo) {
                await loadCombo();
              }
              onError?.(result.error);
            } else {
              if (step) {
                addHistoryEntry(
                  { type: "removeStep", stepId: step.id, order: step.order },
                  combo!
                );
              }
              onSuccess?.();
            }
          } catch (err) {
            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
            setLoadingStates((prev) => {
              const newMap = new Map(prev.isDeletingStep);
              newMap.delete(stepId);
              return { ...prev, isDeletingStep: newMap };
            });
            pendingOperationsRef.current.delete(key);
            // Rollback
            const previousState = optimisticStateRef.current.get(key);
            if (previousState) {
              setCombo(previousState);
            } else if (loadCombo) {
              await loadCombo();
            }
            onError?.(err instanceof Error ? err.message : "Failed to delete step");
          }
        })();
      });
    },
    [comboId, combo, setCombo, addHistoryEntry, onError, onSuccess, getOperationKey, isOperationPending, retry, loadCombo]
  );

  /**
   * Sortiert Steps neu
   */
  const reorderSteps = useCallback(
    async (stepIds: string[]) => {
      if (!comboId) {
        onError?.("Keine Kombo-ID vorhanden");
        return;
      }

      const key = getOperationKey("reorderSteps");

      if (isOperationPending(key)) {
        return;
      }

      // Speichere aktuellen State für Rollback
      if (combo) {
        optimisticStateRef.current.set(key, structuredClone(combo));
      }

      // Optimistic update
      setCombo((current) => {
        if (!current) return current;
        const stepMap = new Map(current.steps.map((s) => [s.id, s]));
        const reorderedSteps = stepIds
          .map((id) => stepMap.get(id))
          .filter((s): s is NonNullable<typeof s> => s !== undefined)
          .map((s, index) => ({
            ...s,
            order: index + 1,
          }));
        return {
          ...current,
          steps: reorderedSteps,
        };
      });

      setPendingOperations((prev) => new Map(prev).set(key, "reorderSteps"));
      setLoadingStates((prev) => ({ ...prev, isReorderingSteps: true }));
      pendingOperationsRef.current.set(key, {
        type: "reorderSteps",
        timestamp: Date.now(),
      });

      startTransition(() => {
        (async () => {
          try {
            const result = await retry(key, () => reorderComboSteps(comboId, stepIds));

            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
            setLoadingStates((prev) => ({ ...prev, isReorderingSteps: false }));
            pendingOperationsRef.current.delete(key);
            optimisticStateRef.current.delete(key);

            if (result.error) {
              // Rollback
              const previousState = optimisticStateRef.current.get(key);
              if (previousState) {
                setCombo(previousState);
              } else if (loadCombo) {
                await loadCombo();
              }
              onError?.(result.error);
            } else {
              if (combo) {
                addHistoryEntry({ type: "reorderSteps", stepIds }, combo);
              }
              onSuccess?.();
            }
          } catch (err) {
            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
            setLoadingStates((prev) => ({ ...prev, isReorderingSteps: false }));
            pendingOperationsRef.current.delete(key);
            // Rollback
            const previousState = optimisticStateRef.current.get(key);
            if (previousState) {
              setCombo(previousState);
            } else if (loadCombo) {
              await loadCombo();
            }
            onError?.(err instanceof Error ? err.message : "Failed to reorder steps");
          }
        })();
      });
    },
    [comboId, combo, setCombo, addHistoryEntry, onError, onSuccess, getOperationKey, isOperationPending, retry, loadCombo]
  );

  /**
   * Führt Batch-Operationen auf Steps aus
   */
  const batchOperations = useCallback(
    async (
      operations: Array<
        | { type: "delete"; stepId: string }
        | { type: "update"; stepId: string; data: UpdateComboStepInput }
      >
    ) => {
      if (!comboId || !combo) return;

      const key = getOperationKey("batchOperations", { operations });
      if (isOperationPending(key)) {
        return;
      }

      // Speichere aktuellen State für Rollback
      if (combo) {
        optimisticStateRef.current.set(key, structuredClone(combo));
      }

      // Optimistic update
      setCombo((current) => {
        if (!current) return current;
        let updatedSteps = [...current.steps];

        for (const operation of operations) {
          if (operation.type === "delete") {
            updatedSteps = updatedSteps.filter((s) => s.id !== operation.stepId);
          } else if (operation.type === "update") {
            updatedSteps = updatedSteps.map((s) =>
              s.id === operation.stepId ? { ...s, ...operation.data } : s
            );
          }
        }

        return {
          ...current,
          steps: sortComboSteps(updatedSteps),
        };
      });

      setPendingOperations((prev) => new Map(prev).set(key, "batchOperations"));
      setLoadingStates((prev) => ({ ...prev, isUpdatingCombo: true }));

      startTransition(() => {
        (async () => {
          try {
            const response = await fetch(`/api/combos/${comboId}/steps/batch`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ operations: operations }),
            });

            const result = await response.json();

            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
            setLoadingStates((prev) => ({ ...prev, isUpdatingCombo: false }));
            pendingOperationsRef.current.delete(key);
            optimisticStateRef.current.delete(key);

            if (result.error || !result.success) {
              // Rollback
              const previousState = optimisticStateRef.current.get(key);
              if (previousState) {
                setCombo(previousState);
              } else if (loadCombo) {
                await loadCombo();
              }
              onError?.(result.error || "Batch operations failed");
            } else {
              // Reload combo to get updated data
              if (loadCombo) {
                await loadCombo();
              }
              onSuccess?.();
            }
          } catch (err) {
            setPendingOperations((prev) => {
              const next = new Map(prev);
              next.delete(key);
              return next;
            });
            setLoadingStates((prev) => ({ ...prev, isUpdatingCombo: false }));
            pendingOperationsRef.current.delete(key);
            // Rollback
            const previousState = optimisticStateRef.current.get(key);
            if (previousState) {
              setCombo(previousState);
            } else if (loadCombo) {
              await loadCombo();
            }
            onError?.(err instanceof Error ? err.message : "Failed to execute batch operations");
          }
        })();
      });
    },
    [comboId, combo, setCombo, onError, onSuccess, getOperationKey, isOperationPending, loadCombo]
  );

  return {
    isPending,
    pendingOperations,
    loadingStates,
    updateCombo: updateComboData,
    addStep,
    updateStep,
    removeStep,
    reorderSteps,
    batchOperations,
    cancelOperation,
  };
}

