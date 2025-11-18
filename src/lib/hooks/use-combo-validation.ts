import { useMemo, useCallback } from "react";
import type { ComboWithSteps } from "@/types/combo.types";
import {
  validateComboSteps,
  validateComboCardsInDeck,
  type ComboValidationResult,
} from "@/lib/utils/combo.utils";
import type { DeckWithCards } from "./use-deck-history";

interface UseComboValidationOptions {
  combo: ComboWithSteps | null;
  deck?: DeckWithCards | null;
}

/**
 * Custom Hook für Combo-Validierung
 * 
 * Features:
 * - Echtzeit-Validierung von Kombos
 * - Prüfung ob verwendete Karten im zugeordneten Deck vorhanden sind
 * - Warnungen für potenzielle Probleme
 */
export function useComboValidation({
  combo,
  deck,
}: UseComboValidationOptions) {
  /**
   * Validiert die gesamte Kombo
   */
  const validateCombo = useCallback((): ComboValidationResult => {
    if (!combo) {
      return {
        isValid: false,
        errors: ["Keine Kombo vorhanden"],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validiere Steps
    const stepValidation = validateComboSteps(
      combo.steps.map((step) => ({
        cardId: step.cardId,
        actionType: step.actionType,
        order: step.order,
      }))
    );

    errors.push(...stepValidation.errors);
    warnings.push(...stepValidation.warnings);

    // Validiere Karten im Deck (falls Deck zugeordnet)
    if (combo.deckId && deck) {
      const cardValidation = validateComboCardsInDeck(
        combo,
        deck.deckCards.map((dc) => ({ cardId: dc.cardId }))
      );

      errors.push(...cardValidation.errors);
      warnings.push(...cardValidation.warnings);
    } else if (combo.deckId && !deck) {
      warnings.push("Deck zugeordnet, aber Deck-Daten nicht verfügbar - Karten-Validierung nicht möglich");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [combo, deck]);

  /**
   * Validiert einen einzelnen Step
   */
  const validateStep = useCallback(
    (stepId: string): { isValid: boolean; error?: string; warning?: string } => {
      if (!combo) {
        return { isValid: false, error: "Keine Kombo vorhanden" };
      }

      const step = combo.steps.find((s) => s.id === stepId);
      if (!step) {
        return { isValid: false, error: "Step nicht gefunden" };
      }

      // Prüfe ob Karte im Deck vorhanden ist (falls Deck zugeordnet)
      if (combo.deckId && deck) {
        const isInDeck = deck.deckCards.some((dc) => dc.cardId === step.cardId);
        if (!isInDeck) {
          return {
            isValid: false,
            error: "Diese Karte ist nicht im zugeordneten Deck vorhanden",
          };
        }
      }

      return { isValid: true };
    },
    [combo, deck]
  );

  /**
   * Prüft ob eine Karte im zugeordneten Deck vorhanden ist
   */
  const checkCardInDeck = useCallback(
    (cardId: string): boolean => {
      if (!combo?.deckId || !deck) {
        return true; // Wenn kein Deck zugeordnet, ist Validierung nicht möglich
      }

      return deck.deckCards.some((dc) => dc.cardId === cardId);
    },
    [combo, deck]
  );

  /**
   * Berechnet Validierungsergebnis (memoized)
   */
  const validationResult = useMemo(() => {
    return validateCombo();
  }, [validateCombo]);

  return {
    validateCombo,
    validateStep,
    checkCardInDeck,
    validationResult,
    isValid: validationResult.isValid,
    errors: validationResult.errors,
    warnings: validationResult.warnings,
  };
}



