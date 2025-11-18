/**
 * Unit-Tests für useDuelHistory Hook
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDuelHistory } from "@/lib/hooks/use-duel-history";
import type { DuelState, DuelAction } from "@/types/duel.types";
import { DuelPhase } from "@/types/duel.types";

describe("useDuelHistory", () => {
  let initialState: DuelState;

  beforeEach(() => {
    initialState = {
      turnPlayer: "PLAYER",
      phase: DuelPhase.DRAW,
      turnCount: 1,
      player: {
        lp: 8000,
        hand: [],
        monsterZone: Array(5).fill(null),
        spellTrapZone: Array(5).fill(null),
        graveyard: [],
        deck: [],
        extraDeck: [],
      },
      opponent: {
        lp: 8000,
        hand: [],
        monsterZone: Array(5).fill(null),
        spellTrapZone: Array(5).fill(null),
        graveyard: [],
        deck: [],
        extraDeck: [],
      },
      normalSummonUsedThisTurn: false,
      duelEnded: false,
    };
  });

  it("should initialize with initial state", () => {
    const { result } = renderHook(() => useDuelHistory(initialState));

    expect(result.current.currentDuelState).toEqual(initialState);
    expect(result.current.history).toHaveLength(0);
    expect(result.current.historyIndex).toBe(-1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("should add history entry", () => {
    const { result } = renderHook(() => useDuelHistory(initialState));

    const action: DuelAction = { type: "CHANGE_PHASE", nextPhase: DuelPhase.STANDBY };
    const newState = { ...initialState, phase: DuelPhase.STANDBY };

    act(() => {
      result.current.addHistoryEntry(action, newState);
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.historyIndex).toBe(0);
    expect(result.current.currentDuelState).toEqual(newState);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it("should undo action", () => {
    const { result } = renderHook(() => useDuelHistory(initialState));

    const action: DuelAction = { type: "CHANGE_PHASE", nextPhase: DuelPhase.STANDBY };
    const newState = { ...initialState, phase: DuelPhase.STANDBY };

    act(() => {
      result.current.addHistoryEntry(action, newState);
    });

    act(() => {
      const undoneState = result.current.undo();
      expect(undoneState).toEqual(initialState);
    });

    expect(result.current.historyIndex).toBe(-1);
    expect(result.current.currentDuelState).toEqual(initialState);
    expect(result.current.canUndo).toBe(true); // Kann zum initial state zurück
    expect(result.current.canRedo).toBe(true);
  });

  it("should redo action", () => {
    const { result } = renderHook(() => useDuelHistory(initialState));

    const action: DuelAction = { type: "CHANGE_PHASE", nextPhase: DuelPhase.STANDBY };
    const newState = { ...initialState, phase: DuelPhase.STANDBY };

    act(() => {
      result.current.addHistoryEntry(action, newState);
      result.current.undo();
    });

    act(() => {
      const redoneState = result.current.redo();
      expect(redoneState).toEqual(newState);
    });

    expect(result.current.historyIndex).toBe(0);
    expect(result.current.currentDuelState).toEqual(newState);
    expect(result.current.canRedo).toBe(false);
  });

  it("should limit history size", () => {
    const maxSize = 3;
    const { result } = renderHook(() => useDuelHistory(initialState, maxSize));

    // Füge mehr Einträge hinzu als maxSize
    for (let i = 0; i < maxSize + 2; i++) {
      const action: DuelAction = { type: "CHANGE_PHASE", nextPhase: DuelPhase.STANDBY };
      const newState = { ...initialState, turnCount: i + 2 };

      act(() => {
        result.current.addHistoryEntry(action, newState);
      });
    }

    expect(result.current.history).toHaveLength(maxSize);
    expect(result.current.maxHistorySizeReached).toBe(true);
  });

  it("should reset history", () => {
    const { result } = renderHook(() => useDuelHistory(initialState));

    const action: DuelAction = { type: "CHANGE_PHASE", nextPhase: DuelPhase.STANDBY };
    const newState = { ...initialState, phase: DuelPhase.STANDBY };

    act(() => {
      result.current.addHistoryEntry(action, newState);
      result.current.resetHistory();
    });

    expect(result.current.history).toHaveLength(0);
    expect(result.current.historyIndex).toBe(-1);
    expect(result.current.currentDuelState).toBeNull();
  });

  it("should handle jump to history index", () => {
    const { result } = renderHook(() => useDuelHistory(initialState));

    // Füge mehrere Einträge hinzu
    const states = [initialState];
    for (let i = 0; i < 3; i++) {
      const action: DuelAction = { type: "CHANGE_PHASE", nextPhase: DuelPhase.STANDBY };
      const newState = { ...initialState, turnCount: i + 2 };
      states.push(newState);

      act(() => {
        result.current.addHistoryEntry(action, newState);
      });
    }

    // Springe zum zweiten Eintrag
    act(() => {
      const jumpedState = result.current.jumpToHistory(1);
      expect(jumpedState).toEqual(states[2]); // Index 1 ist der zweite Eintrag
    });

    expect(result.current.historyIndex).toBe(1);
    expect(result.current.currentDuelState).toEqual(states[2]);
  });
});
