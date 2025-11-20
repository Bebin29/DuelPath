import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDuelState } from '@/lib/hooks/use-duel-state';
import type { DuelDeck, DuelState } from '@/types/duel.types';

// Mock dependencies
vi.mock('@/lib/hooks/use-duel-history', () => ({
  useDuelHistory: vi.fn(() => ({
    currentDuelState: null,
    addHistoryEntry: vi.fn(),
    undo: vi.fn(() => null),
    redo: vi.fn(() => null),
    canUndo: false,
    canRedo: false,
  })),
}));

vi.mock('@/lib/utils/duel.logger', () => ({
  useDuelLogger: vi.fn(() => ({
    addLogEntry: vi.fn(),
  })),
}));

vi.mock('@/lib/utils/error-handler', () => ({
  useDuelErrorHandler: vi.fn(() => ({
    createError: vi.fn(),
    logError: vi.fn(),
    getRecentErrors: vi.fn(() => []),
    clearErrors: vi.fn(),
  })),
}));

vi.mock('@/lib/utils/duel.utils', () => ({
  createInitialDuelState: vi.fn(() => ({
    turnPlayer: 'PLAYER',
    phase: 'DRAW',
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
  })),
  getAvailableActions: vi.fn(() => []),
}));

describe('useDuelState', () => {
  const mockDeck: DuelDeck = {
    id: 'test-deck',
    name: 'Test Deck',
    cards: [
      {
        id: 'card-1',
        name: 'Test Monster',
        type: 'Normal Monster',
        race: 'Warrior',
        attribute: 'LIGHT',
        level: 4,
        atk: 1500,
        def: 1000,
        desc: 'A test monster',
        passcode: '12345678',
        nameLower: 'test monster',
        typeLower: 'normal monster',
        raceLower: 'warrior',
        archetypeLower: null,
        archetype: null,
        banlistInfo: null,
        imageUrl: null,
        imageSmall: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with null state', () => {
    const { result } = renderHook(() => useDuelState());

    expect(result.current.state).toBeNull();
    expect(result.current.dispatchDuelAction).toBeInstanceOf(Function);
    expect(result.current.startDuel).toBeInstanceOf(Function);
    expect(result.current.undo).toBeInstanceOf(Function);
    expect(result.current.redo).toBeInstanceOf(Function);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should start a duel successfully', () => {
    const { useDuelLogger } = await import('@/lib/utils/duel.logger');
    const { useDuelErrorHandler } = await import('@/lib/utils/error-handler');
    const addLogEntry = vi.fn();
    const createError = vi.fn();
    const logError = vi.fn();

    useDuelLogger.mockReturnValue({ addLogEntry });
    useDuelErrorHandler.mockReturnValue({
      createError,
      logError,
      getRecentErrors: vi.fn(() => []),
      clearErrors: vi.fn(),
    });

    const { result } = renderHook(() => useDuelState());

    act(() => {
      result.current.startDuel(mockDeck);
    });

    expect(result.current.state).toBeDefined();
    expect(result.current.state?.phase).toBe('DRAW');
    expect(result.current.state?.turnCount).toBe(1);
    expect(addLogEntry).not.toHaveBeenCalled(); // No actions logged during start
  });

  it('should handle invalid deck in startDuel', () => {
    const { useDuelErrorHandler } = await import('@/lib/utils/error-handler');
    const createError = vi.fn(() => ({
      code: 'DECK_LOAD_FAILED',
      message: 'Invalid deck',
      recoverable: false,
      timestamp: Date.now(),
    }));
    const logError = vi.fn();

    useDuelErrorHandler.mockReturnValue({
      createError,
      logError,
      getRecentErrors: vi.fn(() => []),
      clearErrors: vi.fn(),
    });

    const { result } = renderHook(() => useDuelState());

    act(() => {
      result.current.startDuel({ ...mockDeck, cards: [] });
    });

    expect(createError).toHaveBeenCalledWith(
      'DECK_LOAD_FAILED',
      'Invalid deck provided for duel',
      expect.any(Object),
      false
    );
    expect(logError).toHaveBeenCalled();
  });

  it('should dispatch duel actions', () => {
    const { useDuelLogger } = await import('@/lib/utils/duel.logger');
    const { useDuelHistory } = await import('@/lib/hooks/use-duel-history');
    const addLogEntry = vi.fn();
    const addHistoryEntry = vi.fn();

    useDuelLogger.mockReturnValue({ addLogEntry });
    useDuelHistory.mockReturnValue({
      currentDuelState: null,
      addHistoryEntry,
      undo: vi.fn(() => null),
      redo: vi.fn(() => null),
      canUndo: false,
      canRedo: false,
    });

    const { result } = renderHook(() => useDuelState());

    act(() => {
      result.current.startDuel(mockDeck);
    });

    const action = { type: 'CHANGE_PHASE' as const, nextPhase: 'MAIN1' as const };

    act(() => {
      result.current.dispatchDuelAction(action);
    });

    expect(addHistoryEntry).toHaveBeenCalledWith(action, result.current.state);
    expect(addLogEntry).toHaveBeenCalledWith(result.current.state, action);
  });

  it('should handle errors during action dispatch', () => {
    const { useDuelErrorHandler } = await import('@/lib/utils/error-handler');
    const createError = vi.fn(() => ({
      code: 'STATE_CORRUPTION',
      message: 'Action failed',
      recoverable: true,
      timestamp: Date.now(),
    }));
    const logError = vi.fn();

    useDuelErrorHandler.mockReturnValue({
      createError,
      logError,
      getRecentErrors: vi.fn(() => []),
      clearErrors: vi.fn(),
    });

    const { result } = renderHook(() => useDuelState());

    // Mock a failing reducer
    const { useDuelHistory } = await import('@/lib/hooks/use-duel-history');
    useDuelHistory.mockReturnValue({
      currentDuelState: null,
      addHistoryEntry: vi.fn(() => {
        throw new Error('Reducer failed');
      }),
      undo: vi.fn(() => null),
      redo: vi.fn(() => null),
      canUndo: false,
      canRedo: false,
    });

    act(() => {
      result.current.startDuel(mockDeck);
    });

    const action = { type: 'CHANGE_PHASE' as const, nextPhase: 'MAIN1' as const };

    expect(() => {
      act(() => {
        result.current.dispatchDuelAction(action);
      });
    }).not.toThrow();

    expect(createError).toHaveBeenCalledWith(
      'STATE_CORRUPTION',
      expect.stringContaining('Failed to execute action'),
      expect.any(Object),
      true
    );
  });

  it('should prevent actions when no duel is active', () => {
    const { useDuelErrorHandler } = await import('@/lib/utils/error-handler');
    const createError = vi.fn(() => ({
      code: 'GAME_STATE_INCONSISTENT',
      message: 'No duel started',
      recoverable: false,
      timestamp: Date.now(),
    }));
    const logError = vi.fn();

    useDuelErrorHandler.mockReturnValue({
      createError,
      logError,
      getRecentErrors: vi.fn(() => []),
      clearErrors: vi.fn(),
    });

    const { result } = renderHook(() => useDuelState());

    const action = { type: 'CHANGE_PHASE' as const, nextPhase: 'MAIN1' as const };

    act(() => {
      result.current.dispatchDuelAction(action);
    });

    expect(createError).toHaveBeenCalledWith(
      'GAME_STATE_INCONSISTENT',
      'Cannot dispatch action: No duel started',
      { action },
      false
    );
  });

  it('should handle undo/redo operations', () => {
    const undo = vi.fn(() => ({ phase: 'DRAW' }) as DuelState);
    const redo = vi.fn(() => ({ phase: 'MAIN1' }) as DuelState);

    const { useDuelHistory } = await import('@/lib/hooks/use-duel-history');
    useDuelHistory.mockReturnValue({
      currentDuelState: null,
      addHistoryEntry: vi.fn(),
      undo,
      redo,
      canUndo: true,
      canRedo: true,
    });

    const { result } = renderHook(() => useDuelState());

    act(() => {
      result.current.startDuel(mockDeck);
    });

    act(() => {
      result.current.undo();
    });

    expect(undo).toHaveBeenCalled();

    act(() => {
      result.current.redo();
    });

    expect(redo).toHaveBeenCalled();
  });

  it('should handle undo/redo errors gracefully', () => {
    const { useDuelErrorHandler } = await import('@/lib/utils/error-handler');
    const createError = vi.fn(() => ({
      code: 'STATE_CORRUPTION',
      message: 'Undo failed',
      recoverable: true,
      timestamp: Date.now(),
    }));
    const logError = vi.fn();

    useDuelErrorHandler.mockReturnValue({
      createError,
      logError,
      getRecentErrors: vi.fn(() => []),
      clearErrors: vi.fn(),
    });

    const { useDuelHistory } = await import('@/lib/hooks/use-duel-history');
    useDuelHistory.mockReturnValue({
      currentDuelState: null,
      addHistoryEntry: vi.fn(),
      undo: vi.fn(() => {
        throw new Error('Undo failed');
      }),
      redo: vi.fn(() => null),
      canUndo: true,
      canRedo: false,
    });

    const { result } = renderHook(() => useDuelState());

    act(() => {
      result.current.undo();
    });

    expect(createError).toHaveBeenCalledWith(
      'STATE_CORRUPTION',
      'Undo failed: Undo failed',
      { originalError: expect.any(Error) },
      true
    );
  });

  it('should provide error handling functions', () => {
    const getRecentErrors = vi.fn(() => []);
    const clearErrors = vi.fn();

    const { useDuelErrorHandler } = await import('@/lib/utils/error-handler');
    useDuelErrorHandler.mockReturnValue({
      createError: vi.fn(),
      logError: vi.fn(),
      getRecentErrors,
      clearErrors,
    });

    const { result } = renderHook(() => useDuelState());

    result.current.getRecentErrors();
    result.current.clearErrors();

    expect(getRecentErrors).toHaveBeenCalled();
    expect(clearErrors).toHaveBeenCalled();
  });

  it('should accept error callback option', () => {
    const onError = vi.fn();

    const { result } = renderHook(() => useDuelState({ onError }));

    expect(result.current).toBeDefined();
    // The onError callback would be called during error conditions
  });

  it('should handle deck out gracefully in hooks', () => {
    const smallDeck = { ...mockDeck, cards: mockDeck.cards.slice(0, 3) };

    const { result } = renderHook(() => useDuelState());

    act(() => {
      result.current.startDuel(smallDeck);
    });

    // Ziehe alle Karten
    for (let i = 0; i < 3; i++) {
      act(() => {
        result.current.dispatchDuelAction({
          type: 'DRAW',
          player: 'PLAYER',
          count: 1,
        });
      });
    }

    // Deck sollte leer sein, aber Hook sollte nicht abstürzen
    expect(result.current.state?.player.deck.length).toBe(0);
    expect(result.current.state?.player.hand.length).toBe(5);
  });

  it('should handle invalid deck in startDuel', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useDuelState({ onError }));

    act(() => {
      result.current.startDuel({ ...mockDeck, cards: [] });
    });

    expect(onError).toHaveBeenCalledWith('Cannot start duel: Invalid deck selected.', 'error');
  });

  it('should handle malformed actions gracefully', () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useDuelState({ onError }));

    act(() => {
      result.current.startDuel(mockDeck);
    });

    // Ungültige Aktion dispatchen
    const invalidAction = { type: 'INVALID' } as any;

    expect(() => {
      act(() => {
        result.current.dispatchDuelAction(invalidAction);
      });
    }).not.toThrow();

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to execute action'),
      'error'
    );
  });

  it('should maintain state consistency during rapid actions', () => {
    const { result } = renderHook(() => useDuelState());

    act(() => {
      result.current.startDuel(mockDeck);
    });

    const initialCardCount = result.current.state?.player.hand.length || 0;

    // Schnelle Aktionsfolge
    act(() => {
      result.current.dispatchDuelAction({ type: 'CHANGE_PHASE', nextPhase: 'MAIN1' });
      result.current.dispatchDuelAction({
        type: 'NORMAL_SUMMON',
        player: 'PLAYER',
        cardInstanceId: result.current.state!.player.hand[0].instanceId,
        targetZoneIndex: 0,
      });
    });

    // State sollte konsistent bleiben
    const finalCardCount = result.current.state?.player.hand.length || 0;
    expect(finalCardCount).toBe(initialCardCount - 1); // Eine Karte weniger in Hand
    expect(result.current.state?.player.monsterZone[0]).toBeDefined();
  });

  it('should handle undo/redo with state corruption', () => {
    const onError = vi.fn();
    const { useDuelHistory } = await import('@/lib/hooks/use-duel-history');

    // Mock fehlerhafte History
    useDuelHistory.mockReturnValue({
      currentDuelState: null,
      addHistoryEntry: vi.fn(),
      undo: vi.fn(() => {
        throw new Error('History corruption');
      }),
      redo: vi.fn(() => null),
      canUndo: true,
      canRedo: false,
    });

    const { result } = renderHook(() => useDuelState({ onError }));

    act(() => {
      result.current.undo();
    });

    expect(onError).toHaveBeenCalledWith('Undo failed: History corruption', 'error');
  });

  it('should provide recent errors', () => {
    const { useDuelErrorHandler } = await import('@/lib/utils/error-handler');
    const getRecentErrors = vi.fn(() => [
      { code: 'TEST_ERROR', message: 'Test', timestamp: Date.now() },
    ]);

    useDuelErrorHandler.mockReturnValue({
      createError: vi.fn(),
      logError: vi.fn(),
      getRecentErrors,
      clearErrors: vi.fn(),
    });

    const { result } = renderHook(() => useDuelState());

    const errors = result.current.getRecentErrors();
    expect(getRecentErrors).toHaveBeenCalled();
    expect(errors.length).toBe(1);
  });

  it('should handle extreme state changes', () => {
    const { result } = renderHook(() => useDuelState());

    act(() => {
      result.current.startDuel(mockDeck);
    });

    // Extrem viele Aktionen ausführen
    for (let i = 0; i < 20; i++) {
      act(() => {
        result.current.dispatchDuelAction({
          type: 'DRAW',
          player: 'PLAYER',
          count: 1,
        });
      });
    }

    // State sollte immer noch gültig sein
    expect(result.current.state).toBeDefined();
    expect(typeof result.current.state?.player.hand.length).toBe('number');
  });
});
