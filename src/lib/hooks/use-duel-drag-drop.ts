import { useCallback } from "react";
import type {
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { useDuelState } from "./use-duel-state";
import type { DuelCardInstance } from "@/types/duel.types";

export interface DragDropItem {
  id: string;
  type: "card";
  data: {
    cardInstance: DuelCardInstance;
    zoneType: "hand" | "monster" | "spell-trap";
    zoneIndex?: number;
  };
}

export function useDuelDragDrop() {
  const { state, dispatchDuelAction } = useDuelState();

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const item = active.data.current as DragDropItem;

    if (item?.type === "card") {
      // Optional: Visuelles Feedback setzen
      document.body.style.cursor = "grabbing";
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeItem = active.data.current as DragDropItem;
    const overItem = over.data.current as DragDropItem;

    // Grundlegende Validierung
    if (!activeItem || !overItem || activeItem.type !== "card") return;

    // Hier könnte zusätzliche Logik für Drag-Over Feedback hinzugefügt werden
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    // Cursor zurücksetzen
    document.body.style.cursor = "";

    if (!over || !state) return;

    const activeItem = active.data.current as DragDropItem;
    const overItem = over.data.current as DragDropItem;

    if (!activeItem || activeItem.type !== "card") return;

    const { cardInstance } = activeItem.data;

    // Bestimme die Zielzone basierend auf over.id
    const overId = over.id as string;
    let targetZone: "monster" | "spell-trap" | null = null;
    let targetIndex = -1;

    // Parse die over.id um Zielzone zu bestimmen
    if (overId.startsWith("monster-zone-")) {
      targetZone = "monster";
      targetIndex = parseInt(overId.replace("monster-zone-", ""));
    } else if (overId.startsWith("spell-trap-zone-")) {
      targetZone = "spell-trap";
      targetIndex = parseInt(overId.replace("spell-trap-zone-", ""));
    }

    if (targetZone && targetIndex >= 0) {
      // Prüfe ob die Zone bereits belegt ist
      const isOccupied = targetZone === "monster"
        ? state.player.monsterZone[targetIndex] !== null
        : state.player.spellTrapZone[targetIndex] !== null;

      if (isOccupied) {
        // Optional: Feedback für belegte Zone
        return;
      }

      // Bestimme den Aktionstyp basierend auf der Quellzone
      let action;
      if (activeItem.data.zoneType === "hand") {
        if (targetZone === "monster") {
          action = {
            type: "NORMAL_SUMMON" as const,
            player: "PLAYER" as const,
            cardInstanceId: cardInstance.instanceId,
            targetZoneIndex: targetIndex,
          };
        } else if (targetZone === "spell-trap") {
          action = {
            type: "SET_SPELL" as const,
            player: "PLAYER" as const,
            cardInstanceId: cardInstance.instanceId,
            targetZoneIndex: targetIndex,
          };
        }
      }

      if (action) {
        dispatchDuelAction(action);
      }
    }
  }, [state, dispatchDuelAction]);

  return {
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}
