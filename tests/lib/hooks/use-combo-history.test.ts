/**
 * Unit-Tests für useComboHistory Hook
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useComboHistory } from "@/lib/hooks/use-combo-history";
import type { ComboWithSteps } from "@/types/combo.types";

describe("useComboHistory", () => {
  const createMockCombo = (id: string, stepCount: number = 0): ComboWithSteps => ({
    id,
    title: "Test Combo",
    description: "Test Description",
    userId: "user-1",
    deckId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    steps: Array.from({ length: stepCount }, (_, i) => ({
      id: `step-${i}`,
      comboId: id,
      order: i + 1,
      cardId: `card-${i}`,
      actionType: "NORMAL_SUMMON",
      description: null,
      targetCardId: null,
      card: {
        id: `card-${i}`,
        name: `Card ${i}`,
        type: "Effect Monster",
        race: "Warrior",
        attribute: "LIGHT",
        level: 4,
        atk: 1800,
        def: 1200,
        desc: null,
        archetype: null,
        banlistInfo: null,
        imageUrl: null,
        imageSmall: null,
        passcode: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })),
  });

  describe("Initialisierung", () => {
    it("sollte mit initialer Kombo initialisieren", () => {
      const initialCombo = createMockCombo("combo-1", 5);
      const { result } = renderHook(() => useComboHistory(initialCombo, 50));

      expect(result.current.currentCombo).toEqual(initialCombo);
      expect(result.current.history).toHaveLength(0);
      expect(result.current.historyIndex).toBe(-1);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
    });

    it("sollte mit null initialisieren", () => {
      const { result } = renderHook(() => useComboHistory(null, 50));

      expect(result.current.currentCombo).toBeNull();
      expect(result.current.history).toHaveLength(0);
    });
  });

  describe("addHistoryEntry", () => {
    it("sollte History-Eintrag hinzufügen", () => {
      const initialCombo = createMockCombo("combo-1", 5);
      const { result } = renderHook(() => useComboHistory(initialCombo, 50));

      const newCombo = createMockCombo("combo-1", 6);
      act(() => {
        result.current.addHistoryEntry(
          { type: "addStep", stepId: "step-5", order: 6 },
          newCombo
        );
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.historyIndex).toBe(0);
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it("sollte History-Größe begrenzen", () => {
      const initialCombo = createMockCombo("combo-1", 5);
      const { result } = renderHook(() => useComboHistory(initialCombo, 3));

      // Füge 5 Einträge hinzu
      for (let i = 0; i < 5; i++) {
        const newCombo = createMockCombo("combo-1", 5 + i);
        act(() => {
          result.current.addHistoryEntry(
            { type: "addStep", stepId: `step-${i}`, order: i + 1 },
            newCombo
          );
        });
      }

      // Sollte nur die letzten 3 Einträge behalten
      expect(result.current.history.length).toBeLessThanOrEqual(3);
    });
  });

  describe("undo", () => {
    it("sollte letzte Aktion rückgängig machen", () => {
      const initialCombo = createMockCombo("combo-1", 5);
      const { result } = renderHook(() => useComboHistory(initialCombo, 50));

      const newCombo = createMockCombo("combo-1", 6);
      act(() => {
        result.current.addHistoryEntry(
          { type: "addStep", stepId: "step-5", order: 6 },
          newCombo
        );
      });

      act(() => {
        const undoneCombo = result.current.undo();
        expect(undoneCombo).toEqual(initialCombo);
      });

      expect(result.current.currentCombo).toEqual(initialCombo);
      expect(result.current.historyIndex).toBe(-1);
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(true);
    });

    it("sollte null zurückgeben wenn keine History vorhanden", () => {
      const initialCombo = createMockCombo("combo-1", 5);
      const { result } = renderHook(() => useComboHistory(initialCombo, 50));

      act(() => {
        const undoneCombo = result.current.undo();
        expect(undoneCombo).toBeNull();
      });
    });
  });

  describe("redo", () => {
    it("sollte letzte rückgängig gemachte Aktion wiederholen", () => {
      const initialCombo = createMockCombo("combo-1", 5);
      const { result } = renderHook(() => useComboHistory(initialCombo, 50));

      const newCombo = createMockCombo("combo-1", 6);
      act(() => {
        result.current.addHistoryEntry(
          { type: "addStep", stepId: "step-5", order: 6 },
          newCombo
        );
      });

      act(() => {
        result.current.undo();
      });

      act(() => {
        const redoneCombo = result.current.redo();
        expect(redoneCombo).toEqual(newCombo);
      });

      expect(result.current.currentCombo).toEqual(newCombo);
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    });

    it("sollte null zurückgeben wenn keine Redo möglich", () => {
      const initialCombo = createMockCombo("combo-1", 5);
      const { result } = renderHook(() => useComboHistory(initialCombo, 50));

      act(() => {
        const redoneCombo = result.current.redo();
        expect(redoneCombo).toBeNull();
      });
    });
  });

  describe("jumpToHistory", () => {
    it("sollte zu bestimmtem History-Eintrag springen", () => {
      const initialCombo = createMockCombo("combo-1", 5);
      const { result } = renderHook(() => useComboHistory(initialCombo, 50));

      const combo1 = createMockCombo("combo-1", 6);
      const combo2 = createMockCombo("combo-1", 7);

      act(() => {
        result.current.addHistoryEntry(
          { type: "addStep", stepId: "step-5", order: 6 },
          combo1
        );
        result.current.addHistoryEntry(
          { type: "addStep", stepId: "step-6", order: 7 },
          combo2
        );
      });

      act(() => {
        const jumpedCombo = result.current.jumpToHistory(0);
        expect(jumpedCombo).toEqual(combo1);
      });

      expect(result.current.historyIndex).toBe(0);
      expect(result.current.currentCombo).toEqual(combo1);
    });

    it("sollte zur initialen Kombo springen wenn Index -1", () => {
      const initialCombo = createMockCombo("combo-1", 5);
      const { result } = renderHook(() => useComboHistory(initialCombo, 50));

      const newCombo = createMockCombo("combo-1", 6);
      act(() => {
        result.current.addHistoryEntry(
          { type: "addStep", stepId: "step-5", order: 6 },
          newCombo
        );
      });

      act(() => {
        const jumpedCombo = result.current.jumpToHistory(-1);
        expect(jumpedCombo).toEqual(initialCombo);
      });

      expect(result.current.historyIndex).toBe(-1);
      expect(result.current.currentCombo).toEqual(initialCombo);
    });
  });

  describe("resetHistory", () => {
    it("sollte History zurücksetzen", () => {
      const initialCombo = createMockCombo("combo-1", 5);
      const { result } = renderHook(() => useComboHistory(initialCombo, 50));

      const newCombo = createMockCombo("combo-1", 6);
      act(() => {
        result.current.addHistoryEntry(
          { type: "addStep", stepId: "step-5", order: 6 },
          newCombo
        );
      });

      const resetCombo = createMockCombo("combo-1", 3);
      act(() => {
        result.current.resetHistory(resetCombo);
      });

      expect(result.current.history).toHaveLength(0);
      expect(result.current.historyIndex).toBe(-1);
      expect(result.current.currentCombo).toEqual(resetCombo);
    });
  });
});



