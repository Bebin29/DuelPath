"use client";

import { useRef, useMemo, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ComboStepItem } from "./ComboStepItem";
import type { ComboStepWithCard } from "@/lib/utils/combo.utils";
import { sortComboSteps } from "@/lib/utils/combo.utils";
import { useTranslation } from "@/lib/i18n/hooks";
import { useMultiSelect } from "@/lib/hooks/use-keyboard-shortcuts";

interface ComboTimelineProps {
  steps: ComboStepWithCard[];
  onEditStep?: (stepId: string) => void;
  onDeleteStep?: (stepId: string) => void;
  onDuplicateStep?: (stepId: string) => void;
  onBatchDelete?: (stepIds: string[]) => void;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  highlightedStepId?: string;
  showDragHandle?: boolean;
  enableMultiSelect?: boolean;
}

/**
 * Geschätzte Höhe eines Step-Items in Pixeln
 */
const ESTIMATED_STEP_ITEM_HEIGHT = 120;

/**
 * Schwellenwert für Virtualisierung (ab dieser Anzahl Steps wird virtualisiert)
 */
const VIRTUALIZATION_THRESHOLD = 25;

/**
 * Overscan für Virtualisierung (Anzahl zusätzlicher Items die vor/nach dem Viewport gerendert werden)
 */
const VIRTUALIZATION_OVERSCAN = 5;

/**
 * Vertikale Timeline für Combo-Steps
 * 
 * Features:
 * - Virtualisierung für viele Steps (ab 25 Steps)
 * - Sortierung nach order
 * - Highlighting für aktuellen Step (Play-Modus)
 */
function ComboTimelineComponent({
  steps,
  onEditStep,
  onDeleteStep,
  onDuplicateStep,
  onBatchDelete,
  onSelectionChange,
  highlightedStepId,
  showDragHandle = false,
  enableMultiSelect = false,
}: ComboTimelineProps) {
  const { t } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);

  // Sortiere Steps nach order
  const sortedSteps = useMemo(() => sortComboSteps(steps), [steps]);

  // Multi-Select - nur wenn aktiviert
  const multiSelectResult = useMultiSelect(
    sortedSteps,
    enableMultiSelect && onSelectionChange
      ? (newSelection) => {
          onSelectionChange(newSelection);
        }
      : undefined
  );
  
  const { selectedIds, toggleSelection, clearSelection, isSelected } = enableMultiSelect
    ? multiSelectResult
    : {
        selectedIds: new Set<string>(),
        toggleSelection: () => {},
        clearSelection: () => {},
        isSelected: () => false,
      };

  // Sortable Items (MUSS vor allen bedingten Returns sein)
  const sortableItems = useMemo(
    () => sortedSteps.map((step) => step.id),
    [sortedSteps]
  );

  // Virtualisierung
  const virtualizer = useVirtualizer({
    count: sortedSteps.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_STEP_ITEM_HEIGHT,
    overscan: VIRTUALIZATION_OVERSCAN,
  });

  const shouldVirtualize = sortedSteps.length > VIRTUALIZATION_THRESHOLD;

  if (sortedSteps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("combo.noSteps")}
      </div>
    );
  }

  // Keine Virtualisierung für kleine Listen
  if (!shouldVirtualize) {
    return (
      <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {sortedSteps.map((step, index) => (
            <ComboStepItem
              key={step.id}
              step={step}
              stepNumber={index + 1}
              onEdit={onEditStep}
              onDelete={onDeleteStep}
              onDuplicate={onDuplicateStep}
              showDragHandle={showDragHandle}
              isDragging={false}
              isSelected={enableMultiSelect ? isSelected(step.id) : false}
              onSelect={enableMultiSelect ? (id, e) => toggleSelection(id, index, e) : undefined}
              showCheckbox={enableMultiSelect}
            />
          ))}
        </div>
      </SortableContext>
    );
  }

  // Virtualisierte Liste
  return (
    <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto"
        style={{ contain: "strict" }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const step = sortedSteps[virtualItem.index];
            if (!step) {
              return null;
            }

            return (
              <div
                key={virtualItem.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className={`${
                  highlightedStepId === step.id ? "ring-2 ring-primary rounded-lg" : ""
                }`}
              >
                <div className="p-2">
                  <ComboStepItem
                    step={step}
                    stepNumber={virtualItem.index + 1}
                    onEdit={onEditStep}
                    onDelete={onDeleteStep}
                    showDragHandle={showDragHandle}
                    isDragging={false}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SortableContext>
  );
}

export const ComboTimeline = memo(ComboTimelineComponent);

