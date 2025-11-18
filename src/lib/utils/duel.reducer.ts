import type { DuelState, DuelAction } from "@/types/duel.types";
import { applyAction, validateAction } from "./duel.utils";

/**
 * Alle möglichen Aktionen für den Reducer
 */
type ReducerAction = DuelAction | DuelState | null;

/**
 * Duel Reducer für useReducer
 */
export function duelReducer(state: DuelState | null, action: ReducerAction): DuelState | null {
  // Direkte State-Setzung (für startDuel/resetDuel)
  if (action === null || typeof action === "object" && "turnPlayer" in action) {
    return action as DuelState | null;
  }

  // DuelAction verarbeiten
  if (state && typeof action === "object" && "type" in action) {
    const duelAction = action as DuelAction;
    const validation = validateAction(state, duelAction);
    if (!validation.ok) {
      console.warn("Invalid duel action:", validation.errors);
      return state; // Ungültige Aktionen ignorieren
    }

    return applyAction(state, duelAction);
  }

  return state;
}
