import { z } from "zod";

/**
 * Deck-Format Enum
 */
export const DECK_FORMAT = ["TCG", "OCG", "Casual"] as const;
export type DeckFormat = (typeof DECK_FORMAT)[number];

/**
 * Deck-Sektion Enum
 */
export const DECK_SECTION = ["MAIN", "EXTRA", "SIDE"] as const;
export type DeckSection = (typeof DECK_SECTION)[number];

/**
 * Schema für Deck-Erstellung
 */
export const createDeckSchema = z.object({
  name: z
    .string()
    .min(1, "Deckname muss mindestens 1 Zeichen lang sein")
    .max(100, "Deckname darf maximal 100 Zeichen lang sein")
    .trim(),
  description: z.string().max(500, "Beschreibung darf maximal 500 Zeichen lang sein").optional().nullable(),
  format: z.enum(DECK_FORMAT, {
    errorMap: () => ({ message: "Format muss TCG, OCG oder Casual sein" }),
  }).default("TCG"),
});

export type CreateDeckInput = z.infer<typeof createDeckSchema>;

/**
 * Schema für Deck-Update
 */
export const updateDeckSchema = z.object({
  name: z
    .string()
    .min(1, "Deckname muss mindestens 1 Zeichen lang sein")
    .max(100, "Deckname darf maximal 100 Zeichen lang sein")
    .trim()
    .optional(),
  description: z.string().max(500, "Beschreibung darf maximal 500 Zeichen lang sein").optional().nullable(),
  format: z.enum(DECK_FORMAT, {
    errorMap: () => ({ message: "Format muss TCG, OCG oder Casual sein" }),
  }).optional(),
});

export type UpdateDeckInput = z.infer<typeof updateDeckSchema>;

/**
 * Schema für Karte zu Deck hinzufügen
 */
export const addCardToDeckSchema = z.object({
  cardId: z.string().min(1, "Karten-ID ist erforderlich"),
  quantity: z
    .number()
    .int("Anzahl muss eine ganze Zahl sein")
    .min(1, "Anzahl muss mindestens 1 sein")
    .max(3, "Anzahl darf maximal 3 sein"),
  deckSection: z.enum(DECK_SECTION, {
    errorMap: () => ({ message: "Deck-Sektion muss MAIN, EXTRA oder SIDE sein" }),
  }),
});

export type AddCardToDeckInput = z.infer<typeof addCardToDeckSchema>;

/**
 * Schema für Karten-Anzahl aktualisieren
 */
export const updateCardQuantitySchema = z.object({
  cardId: z.string().min(1, "Karten-ID ist erforderlich"),
  quantity: z
    .number()
    .int("Anzahl muss eine ganze Zahl sein")
    .min(1, "Anzahl muss mindestens 1 sein")
    .max(3, "Anzahl darf maximal 3 sein"),
  deckSection: z.enum(DECK_SECTION, {
    errorMap: () => ({ message: "Deck-Sektion muss MAIN, EXTRA oder SIDE sein" }),
  }),
});

export type UpdateCardQuantityInput = z.infer<typeof updateCardQuantitySchema>;

/**
 * Schema für Karte aus Deck entfernen
 */
export const removeCardFromDeckSchema = z.object({
  cardId: z.string().min(1, "Karten-ID ist erforderlich"),
  deckSection: z.enum(DECK_SECTION, {
    errorMap: () => ({ message: "Deck-Sektion muss MAIN, EXTRA oder SIDE sein" }),
  }),
});

export type RemoveCardFromDeckInput = z.infer<typeof removeCardFromDeckSchema>;

/**
 * Deck-Validierungsregeln
 */
export const DECK_VALIDATION_RULES = {
  MAIN_DECK_MIN: 40,
  MAIN_DECK_MAX: 60,
  EXTRA_DECK_MAX: 15,
  SIDE_DECK_MAX: 15,
  MAX_COPIES_PER_CARD: 3,
} as const;

/**
 * Validiert ein Deck gegen die Yu-Gi-Oh! Regeln
 */
export interface DeckValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validiert Deck-Größen und Kartenanzahl
 * 
 * @param mainDeckCount - Anzahl Karten im Main Deck
 * @param extraDeckCount - Anzahl Karten im Extra Deck
 * @param sideDeckCount - Anzahl Karten im Side Deck
 * @returns Validierungsergebnis
 */
export function validateDeckSizes(
  mainDeckCount: number,
  extraDeckCount: number,
  sideDeckCount: number
): DeckValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Main Deck Validierung
  if (mainDeckCount < DECK_VALIDATION_RULES.MAIN_DECK_MIN) {
    errors.push(
      `Main Deck hat nur ${mainDeckCount} Karten. Mindestens ${DECK_VALIDATION_RULES.MAIN_DECK_MIN} Karten erforderlich.`
    );
  } else if (mainDeckCount > DECK_VALIDATION_RULES.MAIN_DECK_MAX) {
    errors.push(
      `Main Deck hat ${mainDeckCount} Karten. Maximal ${DECK_VALIDATION_RULES.MAIN_DECK_MAX} Karten erlaubt.`
    );
  }

  // Extra Deck Validierung
  if (extraDeckCount > DECK_VALIDATION_RULES.EXTRA_DECK_MAX) {
    errors.push(
      `Extra Deck hat ${extraDeckCount} Karten. Maximal ${DECK_VALIDATION_RULES.EXTRA_DECK_MAX} Karten erlaubt.`
    );
  }

  // Side Deck Validierung
  if (sideDeckCount > DECK_VALIDATION_RULES.SIDE_DECK_MAX) {
    errors.push(
      `Side Deck hat ${sideDeckCount} Karten. Maximal ${DECK_VALIDATION_RULES.SIDE_DECK_MAX} Karten erlaubt.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

