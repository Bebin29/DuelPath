import { z } from "zod";
import type { ActionType } from "@/types/combo.types";

/**
 * Aktionstyp Enum für Validierung
 */
export const ACTION_TYPES = [
  "SUMMON",
  "ACTIVATE",
  "SET",
  "ATTACK",
  "DRAW",
  "DISCARD",
  "SPECIAL_SUMMON",
  "TRIBUTE_SUMMON",
  "NORMAL_SUMMON",
  "FLIP_SUMMON",
  "OTHER",
] as const;

/**
 * Schema für Combo-Schritt Erstellung
 */
export const createComboStepSchema = z.object({
  cardId: z.string().min(1, "Karten-ID ist erforderlich"),
  actionType: z.enum(ACTION_TYPES, {
    errorMap: () => ({ message: "Ungültiger Aktionstyp" }),
  }),
  description: z
    .string()
    .max(1000, "Beschreibung darf maximal 1000 Zeichen lang sein")
    .optional()
    .nullable(),
  targetCardId: z.string().min(1).optional().nullable(),
  order: z
    .number()
    .int("Reihenfolge muss eine ganze Zahl sein")
    .min(1, "Reihenfolge muss mindestens 1 sein"),
});

export type CreateComboStepInput = z.infer<typeof createComboStepSchema>;

/**
 * Schema für Combo-Schritt Update
 */
export const updateComboStepSchema = z.object({
  cardId: z.string().min(1, "Karten-ID ist erforderlich").optional(),
  actionType: z
    .enum(ACTION_TYPES, {
      errorMap: () => ({ message: "Ungültiger Aktionstyp" }),
    })
    .optional(),
  description: z
    .string()
    .max(1000, "Beschreibung darf maximal 1000 Zeichen lang sein")
    .optional()
    .nullable(),
  targetCardId: z.string().min(1).optional().nullable(),
  order: z
    .number()
    .int("Reihenfolge muss eine ganze Zahl sein")
    .min(1, "Reihenfolge muss mindestens 1 sein")
    .optional(),
});

export type UpdateComboStepInput = z.infer<typeof updateComboStepSchema>;

/**
 * Schema für Combo-Erstellung
 */
export const createComboSchema = z.object({
  title: z
    .string()
    .min(1, "Titel muss mindestens 1 Zeichen lang sein")
    .max(200, "Titel darf maximal 200 Zeichen lang sein")
    .trim(),
  description: z
    .string()
    .max(2000, "Beschreibung darf maximal 2000 Zeichen lang sein")
    .optional()
    .nullable(),
  deckId: z.string().min(1).optional().nullable(),
  steps: z
    .array(createComboStepSchema)
    .max(100, "Eine Kombo darf maximal 100 Schritte haben")
    .optional()
    .default([]),
}).refine(
  (data) => {
    // Prüfe ob order-Werte eindeutig und sequenziell sind (nur wenn Steps vorhanden)
    if (!data.steps || data.steps.length === 0) {
      return true; // Keine Steps ist erlaubt beim Erstellen
    }
    const orders = data.steps.map((step) => step.order).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      if (orders[i] !== i + 1) {
        return false;
      }
    }
    return true;
  },
  {
    message: "Reihenfolge-Werte müssen eindeutig und sequenziell sein (1, 2, 3, ...)",
    path: ["steps"],
  }
);

export type CreateComboInput = z.infer<typeof createComboSchema>;

/**
 * Schema für Combo-Update
 */
export const updateComboSchema = z.object({
  title: z
    .string()
    .min(1, "Titel muss mindestens 1 Zeichen lang sein")
    .max(200, "Titel darf maximal 200 Zeichen lang sein")
    .trim()
    .optional(),
  description: z
    .string()
    .max(2000, "Beschreibung darf maximal 2000 Zeichen lang sein")
    .optional()
    .nullable(),
  deckId: z.string().min(1).optional().nullable(),
});

export type UpdateComboInput = z.infer<typeof updateComboSchema>;

/**
 * Schema für Step-Reihenfolge Update
 */
export const comboStepOrderSchema = z.object({
  stepIds: z
    .array(z.string().min(1))
    .min(1, "Mindestens eine Step-ID ist erforderlich")
    .max(100, "Maximal 100 Steps können neu sortiert werden"),
});

export type ComboStepOrderInput = z.infer<typeof comboStepOrderSchema>;

/**
 * Schema für Batch-Operationen auf Combo-Steps
 */
export const batchComboStepOperationsSchema = z.object({
  operations: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("delete"),
          stepId: z.string().min(1),
        }),
        z.object({
          type: z.literal("update"),
          stepId: z.string().min(1),
          data: updateComboStepSchema,
        }),
      ])
    )
    .min(1, "Mindestens eine Operation ist erforderlich")
    .max(50, "Maximal 50 Operationen pro Batch erlaubt"),
});

export type BatchComboStepOperationsInput = z.infer<typeof batchComboStepOperationsSchema>;

/**
 * Combo-Validierungsregeln
 */
export const COMBO_VALIDATION_RULES = {
  MIN_STEPS: 1,
  MAX_STEPS: 100,
  TITLE_MIN_LENGTH: 1,
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 2000,
  STEP_DESCRIPTION_MAX_LENGTH: 1000,
} as const;

/**
 * Validiert eine Kombo gegen die Regeln
 */
export interface ComboValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validiert Combo-Schritte
 * 
 * @param steps - Array von Combo-Schritten
 * @returns Validierungsergebnis
 */
export function validateComboSteps(
  steps: Array<{ cardId: string; actionType: ActionType; order: number }>
): ComboValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Prüfe Mindestanzahl
  if (steps.length < COMBO_VALIDATION_RULES.MIN_STEPS) {
    errors.push(
      `Kombo hat nur ${steps.length} Schritt(e). Mindestens ${COMBO_VALIDATION_RULES.MIN_STEPS} Schritt erforderlich.`
    );
  }

  // Prüfe Maximalanzahl
  if (steps.length > COMBO_VALIDATION_RULES.MAX_STEPS) {
    errors.push(
      `Kombo hat ${steps.length} Schritte. Maximal ${COMBO_VALIDATION_RULES.MAX_STEPS} Schritte erlaubt.`
    );
  }

  // Prüfe ob order-Werte eindeutig und sequenziell sind
  const orders = steps.map((step) => step.order).sort((a, b) => a - b);
  const uniqueOrders = new Set(orders);
  
  if (uniqueOrders.size !== orders.length) {
    errors.push("Reihenfolge-Werte müssen eindeutig sein");
  }

  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) {
      errors.push(
        `Reihenfolge-Werte müssen sequenziell sein. Erwartet ${i + 1}, gefunden ${orders[i]}`
      );
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validiert ob eine Karte in einem Deck vorhanden ist
 * 
 * @param cardId - ID der Karte
 * @param deckId - ID des Decks
 * @returns true wenn Karte im Deck vorhanden ist
 */
export async function validateCardInDeck(
  cardId: string,
  deckId: string | null | undefined
): Promise<{ isValid: boolean; error?: string }> {
  if (!deckId) {
    // Wenn kein Deck zugeordnet ist, ist Validierung nicht möglich
    return { isValid: true };
  }

  // Diese Funktion wird in den Server Actions implementiert
  // Hier nur die Signatur für die Validierung
  return { isValid: true };
}

