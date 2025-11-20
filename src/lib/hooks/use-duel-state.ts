import { useReducer, useCallback, useMemo } from 'react';
import { duelReducer } from '@/lib/utils/duel.reducer';
import { createInitialDuelState, getAvailableActions } from '@/lib/utils/duel.utils';
import { useDuelHistory } from './use-duel-history';
import { useDuelLogger } from '@/lib/utils/duel.logger';
import { useDuelErrorHandler, DuelErrors } from '@/lib/utils/error-handler';
import type {
  DuelState,
  DuelAction,
  DuelDeck,
  AvailableAction,
  DuelCardInstance,
  HistoryAction,
} from '@/types/duel.types';

// Toast wird über React Context verwendet, nicht direkt importiert

/**
 * Options für useDuelState
 */
interface UseDuelStateOptions {
  initialDeck?: DuelDeck;
  onError?: (message: string, type: 'error' | 'warning' | 'info' | 'success') => void;
}

/**
 * Return-Type von useDuelState
 */
interface UseDuelStateReturn {
  state: DuelState | null;
  dispatchDuelAction: (action: DuelAction) => void;
  availableActions: (cardInstanceId?: string) => AvailableAction[];
  currentHand: DuelCardInstance[];
  currentField: {
    monsterZone: (DuelCardInstance | null)[];
    spellTrapZone: (DuelCardInstance | null)[];
    fieldSpell: DuelCardInstance | null;
  };
  startDuel: (deck: DuelDeck) => void;
  resetDuel: () => void;
  // History-Management
  undo: () => DuelState | null;
  redo: () => DuelState | null;
  canUndo: boolean;
  canRedo: boolean;
  // Error Handling
  getRecentErrors: () => any[];
  clearErrors: () => void;
}

/**
 * Custom Hook für Duel-State-Management
 */
export function useDuelState(options: UseDuelStateOptions = {}): UseDuelStateReturn {
  const { onError } = options;

  const [state, dispatch] = useReducer(duelReducer, null, () => {
    // Initialer State ist null, wird durch startDuel gesetzt
    return null;
  });

  // History-Management
  const { currentDuelState, addHistoryEntry, undo, redo, canUndo, canRedo } = useDuelHistory(
    state,
    50
  );

  // Logger
  const { addLogEntry } = useDuelLogger();

  // Error Handler
  const { createError, logError, getRecentErrors, clearErrors } = useDuelErrorHandler();

  /**
   * Dispatcht eine Duel-Action
   */
  const dispatchDuelAction = useCallback(
    (action: DuelAction) => {
      try {
        if (!state) {
          const error = createError(
            DuelErrors.GAME_STATE_INCONSISTENT,
            'Cannot dispatch action: No duel started',
            { action },
            false
          );
          if (error) logError(error);
          onError?.('No active duel. Please start a new duel.', 'error');
          return;
        }

        // Füge History-Eintrag hinzu bevor die Action ausgeführt wird
        addHistoryEntry(action as HistoryAction, state);

        // Logge die Action
        addLogEntry(state, action);

        // Führe Action aus
        dispatch(action);
      } catch (error) {
        const duelError = createError(
          DuelErrors.STATE_CORRUPTION,
          `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { action, originalError: error },
          true
        );
        if (duelError)
          logError(duelError, {
            state: state,
            actionHistory: currentDuelState ? [currentDuelState] : [],
          });

        onError?.('Action failed. The game state may be corrupted.', 'error');

        // Versuche State wiederherzustellen falls möglich
        if (canUndo) {
          try {
            undo();
            onError?.('Attempted to restore previous game state.', 'info');
          } catch (restoreError) {
            console.error('Failed to restore state:', restoreError);
          }
        }
      }
    },
    [
      state,
      addHistoryEntry,
      addLogEntry,
      createError,
      logError,
      currentDuelState,
      canUndo,
      undo,
      onError,
    ]
  );

  /**
   * Gibt verfügbare Aktionen zurück
   */
  const availableActions = useCallback(
    (cardInstanceId?: string): AvailableAction[] => {
      if (!state) return [];
      return getAvailableActions(state, cardInstanceId);
    },
    [state]
  );

  /**
   * Aktuelle Hand des Spielers
   */
  const currentHand: DuelCardInstance[] = state ? state.player.hand : [];

  /**
   * Aktuelles Feld des Spielers
   */
  const currentField = state
    ? {
        monsterZone: state.player.monsterZone,
        spellTrapZone: state.player.spellTrapZone,
        fieldSpell: state.player.fieldSpell,
      }
    : {
        monsterZone: [],
        spellTrapZone: [],
        fieldSpell: null,
      };

  /**
   * Startet ein neues Duell
   */
  const startDuel = useCallback(
    (deck: DuelDeck) => {
      try {
        if (!deck || !deck.cards || deck.cards.length === 0) {
          const error = createError(
            DuelErrors.DECK_LOAD_FAILED,
            'Invalid deck provided for duel',
            { deckId: deck?.id, cardCount: deck?.cards?.length },
            false
          );
          if (error) logError(error);
          onError?.('Cannot start duel: Invalid deck selected.', 'error');
          return;
        }

        // Zusätzliche Validierung: Stelle sicher, dass alle Karten gültig sind
        const validCards = deck.cards.filter((card) => card && card.id);
        if (validCards.length !== deck.cards.length) {
          const error = createError(
            DuelErrors.DECK_LOAD_FAILED,
            'Deck contains invalid cards',
            { deckId: deck.id, totalCards: deck.cards.length, validCards: validCards.length },
            false
          );
          if (error) logError(error);
          onError?.('Cannot start duel: Deck contains invalid cards.', 'error');
          return;
        }

        // Verwende nur die gültigen Karten für das Duell
        const cleanDeck: DuelDeck = {
          ...deck,
          cards: validCards,
        };

        const initialState = createInitialDuelState(cleanDeck);

        if (!initialState) {
          const error = createError(
            DuelErrors.STATE_CORRUPTION,
            'Failed to create initial duel state',
            { deckId: deck.id },
            false
          );
          if (error) logError(error);
          onError?.('Failed to initialize duel. Please try again.', 'error');
          return;
        }

        // Direkt den State setzen statt über Reducer
        dispatch(initialState as any); // Type assertion wegen Reducer-Type
        // History wird durch den neuen State automatisch resettet

        onError?.('Duel started successfully!', 'success');
      } catch (error) {
        // Einfache, direkte Fehlerbehandlung
        console.error('[DuelError] Failed to start duel - raw error:', error);
        console.error('[DuelError] Failed to start duel - error type:', typeof error);
        console.error(
          '[DuelError] Failed to start duel - is Error instance:',
          error instanceof Error
        );
        if (error instanceof Error) {
          console.error('[DuelError] Failed to start duel - error message:', error.message);
          console.error('[DuelError] Failed to start duel - error stack:', error.stack);
        }
        onError?.('Failed to start duel. Please check your deck and try again.', 'error');
      }
    },
    [createError, logError, onError]
  );

  /**
   * Resettet das Duell
   */
  const resetDuel = useCallback(() => {
    // Zurück zu null setzen
    dispatch(null as any);
  }, []);

  // Verwende den State von der History falls verfügbar, sonst den Reducer-State
  const effectiveState = currentDuelState || state;

  // Berechne abgeleitete Werte basierend auf effektivem State
  const effectiveCurrentHand = effectiveState ? effectiveState.player.hand : [];
  const effectiveCurrentField = effectiveState
    ? {
        monsterZone: effectiveState.player.monsterZone,
        spellTrapZone: effectiveState.player.spellTrapZone,
        fieldSpell: effectiveState.player.fieldSpell,
      }
    : {
        monsterZone: [],
        spellTrapZone: [],
        fieldSpell: null,
      };

  // Memoized availableActions basierend auf effektivem State
  const effectiveAvailableActions = useCallback(
    (cardInstanceId?: string): AvailableAction[] => {
      if (!effectiveState) return [];
      return getAvailableActions(effectiveState, cardInstanceId);
    },
    [effectiveState]
  );

  // Erweitere undo/redo um Error Handling
  const safeUndo = useCallback((): DuelState | null => {
    try {
      return undo();
    } catch (error) {
      const duelError = createError(
        DuelErrors.STATE_CORRUPTION,
        `Undo failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error },
        true
      );
      if (duelError) logError(duelError);
      toast.error('Failed to undo action.');
      return null;
    }
  }, [undo, createError, logError, onError]);

  const safeRedo = useCallback((): DuelState | null => {
    try {
      return redo();
    } catch (error) {
      const duelError = createError(
        DuelErrors.STATE_CORRUPTION,
        `Redo failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error },
        true
      );
      if (duelError) logError(duelError);
      onError?.('Failed to redo action.', 'error');
      return null;
    }
  }, [redo, createError, logError, onError]);

  return {
    state: effectiveState,
    dispatchDuelAction,
    availableActions: effectiveAvailableActions,
    currentHand: effectiveCurrentHand,
    currentField: effectiveCurrentField,
    startDuel,
    resetDuel,
    undo: safeUndo,
    redo: safeRedo,
    canUndo,
    canRedo,
    getRecentErrors,
    clearErrors,
  };
}
