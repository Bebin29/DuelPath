/**
 * Unit-Tests für useDuelOperations Hook
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useDuelOperations } from "@/lib/hooks/use-duel-operations";
import type { DuelState } from "@/types/duel.types";
import { DuelPhase } from "@/types/duel.types";

describe("useDuelOperations", () => {
  let mockDuelState: DuelState;
  let mockSetDuelState: vi.MockedFunction<any>;
  let mockAddHistoryEntry: vi.MockedFunction<any>;
  let mockOnError: vi.MockedFunction<any>;
  let mockOnSuccess: vi.MockedFunction<any>;

  beforeEach(() => {
    mockDuelState = {
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

    mockSetDuelState = vi.fn();
    mockAddHistoryEntry = vi.fn();
    mockOnError = vi.fn();
    mockOnSuccess = vi.fn();
  });

  it("should initialize with correct state", () => {
    const { result } = renderHook(() =>
      useDuelOperations({
        duelState: mockDuelState,
        setDuelState: mockSetDuelState,
        addHistoryEntry: mockAddHistoryEntry,
        onError: mockOnError,
        onSuccess: mockOnSuccess,
      })
    );

    expect(result.current.isPending).toBe(false);
    expect(result.current.pendingOperations.size).toBe(0);
    expect(result.current.loadingStates.isSavingDuel).toBe(false);
    expect(result.current.loadingStates.isConvertingToCombo).toBe(false);
  });

  it("should handle saveDuel operation", async () => {
    // Mock erfolgreichen Server-Call
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as any;

    const { result } = renderHook(() =>
      useDuelOperations({
        duelState: mockDuelState,
        setDuelState: mockSetDuelState,
        addHistoryEntry: mockAddHistoryEntry,
        onError: mockOnError,
        onSuccess: mockOnSuccess,
      })
    );

    act(() => {
      result.current.saveDuel(mockDuelState);
    });

    expect(result.current.loadingStates.isSavingDuel).toBe(true);

    await waitFor(() => {
      expect(result.current.loadingStates.isSavingDuel).toBe(false);
    });

    expect(mockOnSuccess).toHaveBeenCalledWith("Duel gespeichert");
  });

  it("should handle saveDuel error", async () => {
    // Mock fehlgeschlagenen Server-Call
    global.fetch = vi.fn(() =>
      Promise.reject(new Error("Network error"))
    ) as any;

    const { result } = renderHook(() =>
      useDuelOperations({
        duelState: mockDuelState,
        setDuelState: mockSetDuelState,
        addHistoryEntry: mockAddHistoryEntry,
        onError: mockOnError,
        onSuccess: mockOnSuccess,
      })
    );

    act(() => {
      result.current.saveDuel(mockDuelState);
    });

    await waitFor(() => {
      expect(result.current.loadingStates.isSavingDuel).toBe(false);
    });

    expect(mockOnError).toHaveBeenCalledWith("Network error", expect.any(Function));
  });

  it("should handle convertDuelToCombo operation", async () => {
    // Mock erfolgreichen Server-Call
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as any;

    const { result } = renderHook(() =>
      useDuelOperations({
        duelState: mockDuelState,
        setDuelState: mockSetDuelState,
        addHistoryEntry: mockAddHistoryEntry,
        onError: mockOnError,
        onSuccess: mockOnSuccess,
      })
    );

    act(() => {
      result.current.convertDuelToCombo(mockDuelState, "Test Combo");
    });

    expect(result.current.loadingStates.isConvertingToCombo).toBe(true);

    await waitFor(() => {
      expect(result.current.loadingStates.isConvertingToCombo).toBe(false);
    });

    expect(mockOnSuccess).toHaveBeenCalledWith("Duel als Combo gespeichert");
  });

  it("should deduplicate operations", () => {
    const { result } = renderHook(() =>
      useDuelOperations({
        duelState: mockDuelState,
        setDuelState: mockSetDuelState,
        addHistoryEntry: mockAddHistoryEntry,
        onError: mockOnError,
        onSuccess: mockOnSuccess,
      })
    );

    act(() => {
      result.current.saveDuel(mockDuelState);
      result.current.saveDuel(mockDuelState); // Zweiter Call sollte dedupliziert werden
    });

    expect(result.current.pendingOperations.size).toBe(1);
  });

  it("should cancel operations", () => {
    const { result } = renderHook(() =>
      useDuelOperations({
        duelState: mockDuelState,
        setDuelState: mockSetDuelState,
        addHistoryEntry: mockAddHistoryEntry,
        onError: mockOnError,
        onSuccess: mockOnSuccess,
      })
    );

    act(() => {
      result.current.saveDuel(mockDuelState);
    });

    expect(result.current.pendingOperations.size).toBe(1);

    act(() => {
      result.current.cancelOperation("saveDuel");
    });

    expect(result.current.pendingOperations.size).toBe(0);
  });
});
