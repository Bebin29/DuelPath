import type { Combo, ComboStep, Card } from "@prisma/client";

/**
 * Kombo mit allen Schritten
 */
export type ComboWithSteps = Combo & {
  steps: (ComboStep & {
    card: Card;
  })[];
};

/**
 * Aktionstyp für Kombo-Schritte
 */
export type ActionType =
  | "SUMMON"
  | "ACTIVATE"
  | "SET"
  | "ATTACK"
  | "DRAW"
  | "DISCARD"
  | "SPECIAL_SUMMON"
  | "TRIBUTE_SUMMON"
  | "NORMAL_SUMMON"
  | "FLIP_SUMMON"
  | "OTHER";

/**
 * Kombo-Schritt Input (für Erstellung/Bearbeitung)
 */
export interface ComboStepInput {
  cardId: string;
  actionType: ActionType;
  description?: string;
  targetCardId?: string;
  order: number;
}

/**
 * Kombo Input (für Erstellung/Bearbeitung)
 */
export interface ComboInput {
  title: string;
  description?: string;
  deckId?: string;
  steps: ComboStepInput[];
}


