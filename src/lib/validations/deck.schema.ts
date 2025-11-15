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
 * Schema für Batch-Operationen
 */
export const batchOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("add"),
    cardId: z.string().min(1),
    quantity: z.number().int().min(1).max(3),
    deckSection: z.enum(DECK_SECTION),
  }),
  z.object({
    type: z.literal("update"),
    cardId: z.string().min(1),
    quantity: z.number().int().min(1).max(3),
    deckSection: z.enum(DECK_SECTION),
  }),
  z.object({
    type: z.literal("remove"),
    cardId: z.string().min(1),
    deckSection: z.enum(DECK_SECTION),
  }),
  z.object({
    type: z.literal("move"),
    cardId: z.string().min(1),
    fromSection: z.enum(DECK_SECTION),
    toSection: z.enum(DECK_SECTION),
  }),
]);

export type BatchOperation = z.infer<typeof batchOperationSchema>;

export const batchOperationsSchema = z.object({
  operations: z.array(batchOperationSchema).min(1).max(50), // Max 50 Operationen pro Batch
});

export type BatchOperationsInput = z.infer<typeof batchOperationsSchema>;

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
 * @param deckCards - Optional: Alle Deck-Karten für detaillierte Validierung
 * @returns Validierungsergebnis
 */
export function validateDeckSizes(
  mainDeckCount: number,
  extraDeckCount: number,
  sideDeckCount: number,
  deckCards?: Array<{ cardId: string; quantity: number; deckSection: string }>
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

  // Detaillierte Validierung: Prüfe auf zu viele Kopien pro Karte
  if (deckCards) {
    const cardCounts = new Map<string, number>();
    const cardNames = new Map<string, string>();
    
    deckCards.forEach((dc) => {
      const currentCount = cardCounts.get(dc.cardId) || 0;
      cardCounts.set(dc.cardId, currentCount + dc.quantity);
    });

    cardCounts.forEach((totalQuantity, cardId) => {
      if (totalQuantity > DECK_VALIDATION_RULES.MAX_COPIES_PER_CARD) {
        const cardName = cardNames.get(cardId) || cardId;
        errors.push(
          `Karte "${cardName}" hat ${totalQuantity} Kopien. Maximal ${DECK_VALIDATION_RULES.MAX_COPIES_PER_CARD} Kopien pro Karte erlaubt.`
        );
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validiert eine einzelne Karte im Deck
 * 
 * @param cardId - ID der Karte
 * @param quantity - Anzahl der Kopien
 * @param allDeckCards - Alle Deck-Karten
 * @returns Validierungsergebnis für diese Karte
 */
export function validateCardInDeck(
  cardId: string,
  quantity: number,
  allDeckCards: Array<{ cardId: string; quantity: number }>
): { isValid: boolean; error?: string; warning?: string } {
  // Zähle alle Kopien dieser Karte im gesamten Deck
  const totalQuantity = allDeckCards
    .filter((dc) => dc.cardId === cardId)
    .reduce((sum, dc) => sum + dc.quantity, 0);

  if (totalQuantity > DECK_VALIDATION_RULES.MAX_COPIES_PER_CARD) {
    return {
      isValid: false,
      error: `Zu viele Kopien: ${totalQuantity}/${DECK_VALIDATION_RULES.MAX_COPIES_PER_CARD}`,
    };
  }

  if (totalQuantity === DECK_VALIDATION_RULES.MAX_COPIES_PER_CARD) {
    return {
      isValid: true,
      warning: `Maximum erreicht: ${totalQuantity}/${DECK_VALIDATION_RULES.MAX_COPIES_PER_CARD}`,
    };
  }

  return { isValid: true };
}



