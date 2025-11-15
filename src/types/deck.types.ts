import type { Deck, DeckCard, Card } from "@prisma/client";

/**
 * Deck mit allen zugehörigen Karten
 */
export type DeckWithCards = Deck & {
  deckCards: (DeckCard & {
    card: Card;
  })[];
};

/**
 * Deck-Sektion Typ
 */
export type DeckSection = "MAIN" | "EXTRA" | "SIDE";

/**
 * Deck-Format Typ
 */
export type DeckFormat = "TCG" | "OCG" | "Casual";

/**
 * Deck-Validierungs-Ergebnis
 */
export interface DeckValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Deck-Statistiken
 */
export interface DeckStats {
  mainDeckCount: number;
  extraDeckCount: number;
  sideDeckCount: number;
  totalCount: number;
}




