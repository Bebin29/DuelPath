"use client";

import { memo, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/components/ui/button";
import { Badge } from "@/components/components/ui/badge";
import { Edit, Trash2, GripVertical, Copy } from "lucide-react";
import { Checkbox } from "@/components/components/ui/checkbox";
import Image from "next/image";
import type { ComboStepWithCard } from "@/lib/utils/combo.utils";
import type { ActionType } from "@/types/combo.types";
import { useTranslation } from "@/lib/i18n/hooks";
import { useIntersectionObserver } from "@/lib/hooks/use-intersection-observer";

interface ComboStepItemProps {
  step: ComboStepWithCard;
  stepNumber: number;
  onEdit?: (stepId: string) => void;
  onDelete?: (stepId: string) => void;
  onDuplicate?: (stepId: string) => void;
  showDragHandle?: boolean;
  isDragging?: boolean;
  isSelected?: boolean;
  onSelect?: (stepId: string, event: React.MouseEvent) => void;
  showCheckbox?: boolean;
}


/**
 * Einzelner Combo-Step in der Timeline
 */
function ComboStepItemComponent({
  step,
  stepNumber,
  onEdit,
  onDelete,
  onDuplicate,
  showDragHandle = false,
  isDragging: externalIsDragging = false,
  isSelected = false,
  onSelect,
  showCheckbox = false,
}: ComboStepItemProps) {
  const { t } = useTranslation();
  const [imageLoaded, setImageLoaded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({
    id: step.id,
    disabled: !showDragHandle,
    data: {
      type: "comboStep",
      stepId: step.id,
    },
  });

  // Intersection Observer für Lazy-Loading
  const { ref: imageRef, hasIntersected } = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: "50px",
    enabled: !!step.card.imageSmall,
  });

  const isDragging = externalIsDragging || sortableIsDragging;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Kombiniere refs für Sortable und Intersection Observer
  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    if (node && step.card.imageSmall) {
      (imageRef as React.MutableRefObject<HTMLElement | null>).current = node;
    }
  };

  return (
    <div
      ref={combinedRef}
      style={style}
      {...(showDragHandle ? { ...listeners, ...attributes } : {})}
      className={`group relative rounded-lg border bg-card p-4 hover:shadow-md transition-shadow ${
        isDragging ? "opacity-50 scale-95" : ""
      } ${showDragHandle ? "cursor-grab active:cursor-grabbing" : ""} ${
        isSelected ? "ring-2 ring-primary" : ""
      }`}
      onClick={(e) => {
        if (showCheckbox && onSelect && !(e.target as HTMLElement).closest("button")) {
          onSelect(step.id, e);
        }
      }}
    >
      <div className="flex gap-4">
        {/* Checkbox für Multi-Select */}
        {showCheckbox && (
          <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect?.(step.id, {} as React.MouseEvent)}
            />
          </div>
        )}
        {/* Schrittnummer */}
        <div className="flex flex-col items-center shrink-0">
          {showDragHandle && (
            <div className="cursor-grab active:cursor-grabbing mb-2 text-muted-foreground hover:text-foreground">
              <GripVertical className="h-5 w-5" />
            </div>
          )}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {stepNumber}
          </div>
        </div>

        {/* Kartenbild */}
        {step.card.imageSmall && (
          <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded border bg-muted">
            {hasIntersected ? (
              <Image
                src={step.card.imageSmall}
                alt={step.card.name}
                fill
                className={`object-cover transition-opacity duration-300 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                sizes="56px"
                onLoad={() => setImageLoaded(true)}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full animate-pulse bg-muted" />
            )}
          </div>
        )}

        {/* Step-Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{step.card.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {t(`combo.actionTypes.${step.actionType}` as any) || step.actionType}
                </Badge>
                {step.card.type && (
                  <span className="text-xs text-muted-foreground truncate">
                    {step.card.type}
                  </span>
                )}
              </div>
              {step.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {step.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(step.id)}
                  className="h-8 w-8 p-0"
                  title={t("common.edit")}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}
              {onDuplicate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDuplicate(step.id)}
                  className="h-8 w-8 p-0"
                  title={t("common.duplicate") || "Duplizieren"}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(step.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  title={t("common.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ComboStepItem = memo(ComboStepItemComponent);

