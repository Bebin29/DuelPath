"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/hooks";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { getUserDecks, getDeckById } from "@/server/actions/deck.actions";
import useSWR from "swr";
import { useComboHistory } from "@/lib/hooks/use-combo-history";
import { useComboOperations } from "@/lib/hooks/use-combo-operations";
import { useComboValidation } from "@/lib/hooks/use-combo-validation";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useCardPrefetch } from "@/lib/hooks/use-card-prefetch";
import { useOfflineComboStorage } from "@/lib/hooks/use-offline-combo-storage";
import type { DeckWithCards } from "@/lib/hooks/use-deck-history";
import { ComboTimeline } from "./ComboTimeline";
import { ComboStepEditor } from "./ComboStepEditor";
import { ComboStepItem } from "./ComboStepItem";
import { ComboPlayMode } from "./ComboPlayMode";
import { ComboVersionHistory } from "./ComboVersionHistory";
import { DRAG_ACTIVATION_DISTANCE } from "@/lib/constants/deck.constants";
import { sortComboSteps, exportComboToJSON, exportComboToText, importComboFromJSON } from "@/lib/utils/combo.utils";
import { Button } from "@/components/components/ui/button";
import { Input } from "@/components/components/ui/input";
import { Label } from "@/components/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/components/ui/select";
import { Textarea } from "@/components/components/ui/textarea";
import { AlertCircle, CheckCircle2, Plus, Save, ArrowLeft, Undo2, Redo2, Download, Upload } from "lucide-react";
import { useToast } from "@/components/components/ui/toast";
import type { ComboWithSteps } from "@/types/combo.types";
import type { CreateComboStepInput, UpdateComboStepInput } from "@/lib/validations/combo.schema";
import type { Deck } from "@prisma/client";
import { Skeleton } from "@/components/components/ui/skeleton";

interface ComboEditorProps {
  comboId: string;
}

/**
 * Combo-Editor Hauptkomponente
 * 
 * Features:
 * - Deck-Auswahl
 * - Titel & Beschreibung bearbeiten
 * - Steps hinzufügen/bearbeiten/löschen
 * - Undo/Redo
 * - Validierung
 */
export function ComboEditor({ comboId }: ComboEditorProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();

  // Offline-Storage
  const {
    isOnline,
    hasPendingOperations,
    loadComboLocally,
    saveComboLocally,
    queueOperation,
  } = useOfflineComboStorage();

  // SWR für Combo-Daten
  const { data: comboData, error: comboError, isLoading, mutate: mutateCombo } = useSWR<{
    success: boolean;
    combo: ComboWithSteps;
    error?: string;
  }>(
    `/api/combos/${comboId}`,
    async (url) => {
      // Versuche zuerst lokal zu laden wenn offline
      if (!navigator.onLine) {
        const localCombo = loadComboLocally(comboId);
        if (localCombo) {
          return { success: true, combo: localCombo };
        }
      }

      const response = await fetch(url);
      if (!response.ok) {
        // Wenn offline und Request fehlschlägt, versuche lokal zu laden
        if (!navigator.onLine) {
          const localCombo = loadComboLocally(comboId);
          if (localCombo) {
            return { success: true, combo: localCombo };
          }
        }
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch combo");
      }
      const data = await response.json();
      
      // Speichere lokal für Offline-Zugriff
      if (data.success && data.combo) {
        saveComboLocally(data.combo);
      }
      
      return data;
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  const [combo, setCombo] = useState<ComboWithSteps | null>(null);
  const error = comboError?.message || comboData?.error || null;
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);
  const [deckForValidation, setDeckForValidation] = useState<DeckWithCards | null>(null);
  const [isLoadingDeckForValidation, setIsLoadingDeckForValidation] = useState(false);
  const [stepEditorOpen, setStepEditorOpen] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [playModeOpen, setPlayModeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [enableMultiSelect, setEnableMultiSelect] = useState(false);
  const [selectedStepIds, setSelectedStepIds] = useState<Set<string>>(new Set());

  // Drag & Drop Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE,
      },
    })
  );

  // History
  const {
    currentCombo: historyCombo,
    addHistoryEntry,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
    resetHistory,
  } = useComboHistory(combo, 50);

  // Sync combo from SWR data
  useEffect(() => {
    if (comboData?.combo) {
      setCombo(comboData.combo);
    }
  }, [comboData]);

  // Sync history when combo changes from server
  useEffect(() => {
    if (combo && combo !== historyCombo) {
      resetHistory(combo);
      setTitle(combo.title);
      setDescription(combo.description || "");
      setSelectedDeckId(combo.deckId || null);
    }
  }, [combo, historyCombo, resetHistory]);

  // Warnung bei ungespeicherten Änderungen
  useEffect(() => {
    const hasUnsavedChanges =
      historyCombo &&
      (historyCombo.title !== title ||
        historyCombo.description !== (description || null) ||
        historyCombo.deckId !== (selectedDeckId || null));

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [historyCombo, title, description, selectedDeckId]);

  // Show error toast when combo error occurs
  useEffect(() => {
    if (error) {
      addToast({
        variant: "error",
        title: t("combo.errors.loadFailed") || "Fehler beim Laden",
        description: error,
      });
    }
  }, [error, t, addToast]);

  const loadComboData = useCallback(async () => {
    await mutateCombo();
  }, [mutateCombo]);

  const loadDecks = useCallback(async () => {
    setIsLoadingDecks(true);
    try {
      const result = await getUserDecks();
      if (result.decks) {
        setDecks(result.decks);
      }
    } catch (err) {
      console.error("Failed to load decks:", err);
    } finally {
      setIsLoadingDecks(false);
    }
  }, []);

  const loadDeckForValidation = useCallback(async (deckId: string) => {
    setIsLoadingDeckForValidation(true);
    try {
      const result = await getDeckById(deckId);
      if (result.success && result.deck) {
        setDeckForValidation(result.deck as DeckWithCards);
      } else {
        setDeckForValidation(null);
      }
    } catch (err) {
      console.error("Failed to load deck for validation:", err);
      setDeckForValidation(null);
    } finally {
      setIsLoadingDeckForValidation(false);
    }
  }, []);

  // Load deck for validation when deckId changes
  useEffect(() => {
    const deckId = historyCombo?.deckId || selectedDeckId;
    if (deckId) {
      loadDeckForValidation(deckId);
    } else {
      setDeckForValidation(null);
    }
  }, [historyCombo?.deckId, selectedDeckId, loadDeckForValidation]);

  // Validation
  const { validationResult } = useComboValidation({
    combo: historyCombo,
    deck: deckForValidation,
  });

  // Prefetch Cards aus Combo-Steps
  const cardIdsFromSteps = historyCombo
    ? historyCombo.steps
        .map((step) => [step.cardId, step.targetCardId].filter(Boolean) as string[])
        .flat()
    : [];
  
  useCardPrefetch({
    cardIds: cardIdsFromSteps,
    enabled: !!historyCombo && historyCombo.steps.length > 0,
  });

  // Prefetch Cards aus Deck (wenn Deck für Validierung geladen ist)
  const cardIdsFromDeck = deckForValidation?.cards?.map((dc) => dc.cardId) || [];
  useCardPrefetch({
    cardIds: cardIdsFromDeck,
    enabled: !!deckForValidation && cardIdsFromDeck.length > 0,
  });

  // Operations
  const {
    isPending,
    updateCombo: updateComboData,
    addStep,
    updateStep,
    removeStep,
    reorderSteps: reorderStepsOperation,
    batchOperations,
  } = useComboOperations({
    comboId,
    combo: historyCombo,
    setCombo: (updater) => {
      const newCombo = updater(historyCombo);
      if (newCombo) {
        setCombo(newCombo);
        // Speichere lokal für Offline-Zugriff
        saveComboLocally(newCombo);
      }
    },
    addHistoryEntry,
    onError: (error) => {
      addToast({
        variant: "error",
        title: t("combo.errors.operationFailed") || "Fehler",
        description: error,
      });
    },
    onSuccess: () => {
      // Erfolg wird durch optimistic updates bereits angezeigt
    },
    loadCombo: loadComboData,
    queueOfflineOperation: queueOperation,
  });

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  // Auto-Save für Titel und Beschreibung
  useAutoSave({
    data: {
      title,
      description: description || null,
      deckId: selectedDeckId || null,
    },
    onSave: async (data) => {
      if (!historyCombo) return;
      await updateComboData(data);
    },
    debounceMs: 500,
    enabled: !!historyCombo && !isPending,
    compareFn: (prev, current) => {
      return (
        prev.title === current.title &&
        prev.description === current.description &&
        prev.deckId === current.deckId
      );
    },
  });

  // Keyboard-Shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: "s",
        ctrl: true,
        handler: (e) => {
          e.preventDefault();
          handleSave();
        },
        description: "Speichern",
      },
      {
        key: "z",
        ctrl: true,
        handler: (e) => {
          e.preventDefault();
          if (!e.shiftKey) {
            handleUndo();
          }
        },
        description: "Rückgängig",
      },
      {
        key: "z",
        ctrl: true,
        shift: true,
        handler: (e) => {
          e.preventDefault();
          handleRedo();
        },
        description: "Wiederholen",
      },
      {
        key: "y",
        ctrl: true,
        handler: (e) => {
          e.preventDefault();
          handleRedo();
        },
        description: "Wiederholen",
      },
      {
        key: "Delete",
        handler: (e) => {
          if (editingStepId) {
            e.preventDefault();
            handleDeleteStep(editingStepId);
          }
        },
        description: "Step löschen",
      },
    ],
    enabled: !!historyCombo && !stepEditorOpen && !playModeOpen,
  });

  async function handleSave() {
    if (!historyCombo) return;

    // Prüfe Validierung vor dem Speichern
    if (!validationResult.isValid) {
      addToast({
        variant: "error",
        title: t("combo.validationErrors") || "Validierungsfehler",
        description: validationResult.errors.join(", "),
      });
      return;
    }

    await updateComboData({
      title,
      description: description || null,
      deckId: selectedDeckId || null,
    });

    addToast({
      variant: "success",
      title: t("combo.comboSaved") || "Kombo gespeichert",
      description: t("combo.comboSavedDescription") || "Die Änderungen wurden erfolgreich gespeichert",
    });
  }

  function handleAddStep() {
    setEditingStepId(null);
    setStepEditorOpen(true);
  }

  function handleEditStep(stepId: string) {
    setEditingStepId(stepId);
    setStepEditorOpen(true);
  }

  function handleDeleteStep(stepId: string) {
    if (!confirm(t("combo.step.confirmDelete") || "Möchtest du diesen Schritt wirklich löschen?")) {
      return;
    }
    removeStep(stepId);
  }

  async function handleDuplicateStep(stepId: string) {
    if (!historyCombo) return;
    
    const stepToDuplicate = historyCombo.steps.find((s) => s.id === stepId);
    if (!stepToDuplicate) return;

    const sortedSteps = sortComboSteps(historyCombo.steps);
    const maxOrder = sortedSteps.length > 0 
      ? Math.max(...sortedSteps.map((s) => s.order))
      : 0;
    
    await addStep({
      cardId: stepToDuplicate.cardId,
      actionType: stepToDuplicate.actionType as any,
      description: stepToDuplicate.description || undefined,
      targetCardId: stepToDuplicate.targetCardId || undefined,
      order: maxOrder + 1,
    });
  }

  async function handleSaveStep(step: CreateComboStepInput | UpdateComboStepInput) {
    if (!historyCombo) return;

    if (editingStepId) {
      // Update existing step
      await updateStep(editingStepId, step as UpdateComboStepInput);
    } else {
      // Add new step
      const newOrder = historyCombo.steps.length + 1;
      await addStep({
        ...step,
        order: newOrder,
      } as CreateComboStepInput);
    }

    setStepEditorOpen(false);
    setEditingStepId(null);
  }

  function handleUndo() {
    const undoneCombo = undoHistory();
    if (undoneCombo) {
      setCombo(undoneCombo);
    }
  }

  function handleRedo() {
    const redoneCombo = redoHistory();
    if (redoneCombo) {
      setCombo(redoneCombo);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    if (active.data.current?.type === "comboStep") {
      setActiveStepId(active.id as string);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveStepId(null);

    if (!over || !historyCombo) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const sortedSteps = sortComboSteps(historyCombo.steps);
    const oldIndex = sortedSteps.findIndex((s) => s.id === activeId);
    const newIndex = sortedSteps.findIndex((s) => s.id === overId);

    if (oldIndex === -1 || newIndex === -1) return;

    // Reorder steps: Verschiebe das aktive Element an die neue Position
    const reordered = [...sortedSteps];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Extrahiere nur die IDs in der neuen Reihenfolge
    const stepIds = reordered.map((s) => s.id);

    // Reorder steps
    await reorderStepsOperation(stepIds);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !historyCombo) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive border border-destructive/20">
        {error || t("combo.errors.notFound")}
      </div>
    );
  }

  const editingStep = editingStepId
    ? historyCombo.steps.find((s) => s.id === editingStepId)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/combos")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("common.back") || "Zurück"}
          </Button>
          {!isOnline && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-sm">
              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" />
              {t("common.offline") || "Offline"}
            </div>
          )}
          {isOnline && hasPendingOperations && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-600 text-sm">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              {t("common.syncing") || "Synchronisiere..."}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {comboId && (
            <ComboVersionHistory
              comboId={comboId}
              onVersionRestored={loadComboData}
            />
          )}
          <Button
            variant="outline"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "application/json";
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                try {
                  const text = await file.text();
                  const imported = importComboFromJSON(text);
                  
                  if (!imported) {
                    addToast({
                      variant: "error",
                      title: t("combo.importFailed") || "Import fehlgeschlagen",
                      description: t("combo.invalidFileFormat") || "Ungültiges Dateiformat",
                    });
                    return;
                  }

                  // Setze Titel und Beschreibung
                  setTitle(imported.title);
                  setDescription(imported.description || "");

                  // Füge Steps hinzu
                  for (const step of imported.steps) {
                    await addStep({
                      cardId: step.cardId,
                      actionType: step.actionType as any,
                      description: step.description || undefined,
                      targetCardId: step.targetCardId || undefined,
                      order: step.order,
                    });
                  }

                  addToast({
                    variant: "success",
                    title: t("combo.imported") || "Kombo importiert",
                    description: t("combo.importedDescription") || "Die Kombo wurde erfolgreich importiert",
                  });
                } catch (error) {
                  addToast({
                    variant: "error",
                    title: t("combo.importFailed") || "Import fehlgeschlagen",
                    description: error instanceof Error ? error.message : String(error),
                  });
                }
              };
              input.click();
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t("combo.import") || "Importieren"}
          </Button>
          <Button
            variant="outline"
            onClick={handleUndo}
            disabled={!canUndo || isPending}
          >
            <Undo2 className="mr-2 h-4 w-4" />
            {t("common.undo") || "Rückgängig"}
          </Button>
          <Button
            variant="outline"
            onClick={handleRedo}
            disabled={!canRedo || isPending}
          >
            <Redo2 className="mr-2 h-4 w-4" />
            {t("common.redo") || "Wiederholen"}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            {t("common.save") || "Speichern"}
          </Button>
        </div>
      </div>

      {/* Validierung */}
      {validationResult.errors.length > 0 && (
        <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-destructive mb-2">{t("combo.validationErrors")}</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {validationResult.warnings.length > 0 && (
        <div className="rounded-md bg-yellow-500/10 p-4 border border-yellow-500/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-600 mb-2">{t("combo.validationWarnings")}</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Combo-Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="combo-title">{t("combo.title") || "Titel"}</Label>
          <Input
            id="combo-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("combo.titlePlaceholder")}
            maxLength={200}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="combo-deck">{t("combo.deck") || "Deck (Optional)"}</Label>
          <Select
            value={selectedDeckId || "none"}
            onValueChange={(value) => setSelectedDeckId(value === "none" ? null : value)}
            disabled={isLoadingDecks}
          >
            <SelectTrigger id="combo-deck">
              <SelectValue placeholder={isLoadingDecks ? t("common.loading") : t("combo.selectDeck") || "Deck auswählen"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("combo.noDeck") || "Kein Deck"}</SelectItem>
              {decks.map((deck) => (
                <SelectItem key={deck.id} value={deck.id}>
                  {deck.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="combo-description">{t("combo.description") || "Beschreibung"}</Label>
        <Textarea
          id="combo-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("combo.comboDescriptionPlaceholder")}
          rows={3}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground">
          {description.length}/2000 {t("combo.characters")}
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {t("combo.steps") || "Schritte"} ({historyCombo.steps.length})
          </h2>
          <div className="flex gap-2">
            {historyCombo.steps.length > 0 && (
              <>
                <Button variant="outline" onClick={() => setPlayModeOpen(true)}>
                  {t("combo.playCombo") || "Kombo abspielen"}
                </Button>
                <Button
                  variant={enableMultiSelect ? "default" : "outline"}
                  onClick={() => {
                    setEnableMultiSelect(!enableMultiSelect);
                    if (enableMultiSelect) {
                      setSelectedStepIds(new Set());
                    }
                  }}
                >
                  {enableMultiSelect
                    ? t("combo.cancelSelection") || "Auswahl abbrechen"
                    : t("combo.selectMultiple") || "Mehrere auswählen"}
                </Button>
                {enableMultiSelect && selectedStepIds.size > 0 && (
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (confirm(t("combo.batchDeleteConfirm") || `Möchtest du ${selectedStepIds.size} Schritte wirklich löschen?`)) {
                        const stepIdsArray = Array.from(selectedStepIds);
                        await batchOperations(
                          stepIdsArray.map((id) => ({ type: "delete" as const, stepId: id }))
                        );
                        setSelectedStepIds(new Set());
                        setEnableMultiSelect(false);
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("combo.deleteSelected") || `Löschen (${selectedStepIds.size})`}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!historyCombo) return;
                    const json = exportComboToJSON(historyCombo);
                    const blob = new Blob([json], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${historyCombo.title.replace(/[^a-z0-9]/gi, "_")}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    addToast({
                      variant: "success",
                      title: t("combo.exported") || "Kombo exportiert",
                      description: t("combo.exportedDescription") || "Die Kombo wurde erfolgreich exportiert",
                    });
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t("combo.export") || "Exportieren"}
                </Button>
              </>
            )}
            <Button onClick={handleAddStep}>
              <Plus className="mr-2 h-4 w-4" />
              {t("combo.step.add") || "Schritt hinzufügen"}
            </Button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <ComboTimeline
            steps={historyCombo.steps}
            onEditStep={handleEditStep}
            onDeleteStep={handleDeleteStep}
            onDuplicateStep={handleDuplicateStep}
            onSelectionChange={setSelectedStepIds}
            showDragHandle={!enableMultiSelect}
            enableMultiSelect={enableMultiSelect}
          />
          <DragOverlay
            style={{
              cursor: "grabbing",
            }}
            className="opacity-90"
          >
            {activeStepId && (() => {
              const step = historyCombo.steps.find((s) => s.id === activeStepId);
              if (!step) return null;
              const sortedSteps = sortComboSteps(historyCombo.steps);
              const stepNumber = sortedSteps.findIndex((s) => s.id === activeStepId) + 1;
              return (
                <div className="transform rotate-2 shadow-2xl scale-105">
                  <ComboStepItem
                    step={step}
                    stepNumber={stepNumber}
                    showDragHandle={true}
                    isDragging={true}
                  />
                </div>
              );
            })()}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Step Editor Dialog */}
      <ComboStepEditor
        open={stepEditorOpen}
        onOpenChange={setStepEditorOpen}
        onSave={handleSaveStep}
        initialStep={editingStep ? {
          cardId: editingStep.cardId,
          actionType: editingStep.actionType as any,
          description: editingStep.description,
          targetCardId: editingStep.targetCardId,
          order: editingStep.order,
        } : undefined}
        mode={editingStepId ? "edit" : "create"}
      />

      {/* Play Mode Dialog */}
      {historyCombo && (
        <ComboPlayMode
          open={playModeOpen}
          onOpenChange={setPlayModeOpen}
          combo={historyCombo}
        />
      )}
    </div>
  );
}

