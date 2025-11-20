import type { ComboStep, Card } from '@prisma/client';
import type { ComboWithSteps } from '@/types/combo.types';

/**
 * Combo Step mit Card-Informationen
 */
export type ComboStepWithCard = ComboStep & {
  card: Card;
};

/**
 * Sortiert Combo-Steps nach ihrer Reihenfolge (order)
 *
 * @param steps - Array von Combo-Steps
 * @returns Sortiertes Array von Steps
 */
export function sortComboSteps<T extends { order: number }>(steps: T[]): T[] {
  return [...steps].sort((a, b) => a.order - b.order);
}

/**
 * Ordnet Steps neu an (verschiebt einen Step von einer Position zu einer anderen)
 *
 * @param steps - Array von Combo-Steps
 * @param fromIndex - Index des zu verschiebenden Steps
 * @param toIndex - Ziel-Index
 * @returns Neues Array mit neu angeordneten Steps
 */
export function reorderSteps<T extends { order: number }>(
  steps: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  const sorted = sortComboSteps(steps);
  const result = [...sorted];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);

  // Aktualisiere order-Werte
  return result.map((step, index) => ({
    ...step,
    order: index + 1,
  }));
}

/**
 * Validiert Combo-Steps
 *
 * @param steps - Array von Combo-Steps
 * @returns Validierungsergebnis
 */
export function validateComboSteps(
  steps: Array<{ cardId: string; actionType: string; order: number }>
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Prüfe Mindestanzahl
  if (steps.length < 1) {
    errors.push('Eine Kombo muss mindestens einen Schritt haben');
  }

  // Prüfe Maximalanzahl
  if (steps.length > 100) {
    errors.push('Eine Kombo darf maximal 100 Schritte haben');
  }

  // Prüfe ob order-Werte eindeutig und sequenziell sind
  const orders = steps.map((step) => step.order).sort((a, b) => a - b);
  const uniqueOrders = new Set(orders);

  if (uniqueOrders.size !== orders.length) {
    errors.push('Reihenfolge-Werte müssen eindeutig sein');
  }

  // Prüfe Sequenzialität
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) {
      errors.push(
        `Reihenfolge-Werte müssen sequenziell sein. Erwartet ${i + 1}, gefunden ${orders[i]}`
      );
      break;
    }
  }

  // Prüfe ob alle Steps eine gültige cardId haben
  steps.forEach((step, index) => {
    if (!step.cardId || step.cardId.trim().length === 0) {
      errors.push(`Step ${index + 1} hat keine gültige Karten-ID`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Berechnet Statistiken für eine Kombo
 *
 * @param combo - Kombo mit Steps
 * @returns Statistiken
 */
export function getComboStats(combo: ComboWithSteps): {
  totalSteps: number;
  uniqueCards: number;
  cardCounts: Map<string, number>;
  actionTypeCounts: Map<string, number>;
} {
  const cardCounts = new Map<string, number>();
  const actionTypeCounts = new Map<string, number>();
  const uniqueCardIds = new Set<string>();

  combo.steps.forEach((step) => {
    // Zähle Karten
    const currentCount = cardCounts.get(step.cardId) || 0;
    cardCounts.set(step.cardId, currentCount + 1);
    uniqueCardIds.add(step.cardId);

    // Zähle Aktionstypen
    const currentActionCount = actionTypeCounts.get(step.actionType) || 0;
    actionTypeCounts.set(step.actionType, currentActionCount + 1);
  });

  return {
    totalSteps: combo.steps.length,
    uniqueCards: uniqueCardIds.size,
    cardCounts,
    actionTypeCounts,
  };
}

/**
 * Prüft ob eine Karte in einem Deck vorhanden ist
 *
 * @param cardId - ID der Karte
 * @param deckCards - Array von Deck-Karten
 * @returns true wenn Karte im Deck vorhanden ist
 */
export function isCardInDeck(cardId: string, deckCards: Array<{ cardId: string }>): boolean {
  return deckCards.some((dc) => dc.cardId === cardId);
}

/**
 * Validiert ob alle in einer Kombo verwendeten Karten im zugeordneten Deck vorhanden sind
 *
 * @param combo - Kombo mit Steps
 * @param deckCards - Array von Deck-Karten (optional)
 * @returns Validierungsergebnis
 */
export function validateComboCardsInDeck(
  combo: ComboWithSteps,
  deckCards?: Array<{ cardId: string }>
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Wenn kein Deck zugeordnet ist, ist Validierung nicht möglich
  if (!combo.deckId) {
    return {
      isValid: true,
      errors: [],
      warnings: ['Kein Deck zugeordnet - Karten-Validierung nicht möglich'],
    };
  }

  // Wenn keine Deck-Karten übergeben wurden, kann nicht validiert werden
  if (!deckCards || deckCards.length === 0) {
    return {
      isValid: true,
      errors: [],
      warnings: ['Deck-Karten nicht verfügbar - Karten-Validierung nicht möglich'],
    };
  }

  // Prüfe jede verwendete Karte
  const missingCards = new Set<string>();
  combo.steps.forEach((step) => {
    if (!isCardInDeck(step.cardId, deckCards)) {
      missingCards.add(step.cardId);
    }
  });

  if (missingCards.size > 0) {
    errors.push(
      `${missingCards.size} verwendete Karte(n) sind nicht im zugeordneten Deck vorhanden`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Erstellt eine neue Step-ID (für optimistische Updates)
 *
 * @returns Temporäre ID
 */
export function createTemporaryStepId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Prüft ob eine Step-ID temporär ist
 *
 * @param stepId - Step-ID
 * @returns true wenn temporär
 */
export function isTemporaryStepId(stepId: string): boolean {
  return stepId.startsWith('temp-');
}

/**
 * Exportiert eine Combo als JSON-String
 */
export function exportComboToJSON(combo: ComboWithSteps): string {
  const exportData = {
    version: '1.0',
    title: combo.title,
    description: combo.description,
    deckId: combo.deckId,
    steps: sortComboSteps(combo.steps).map((step) => ({
      cardId: step.cardId,
      cardName: step.card.name,
      actionType: step.actionType,
      description: step.description,
      targetCardId: step.targetCardId,
      order: step.order,
    })),
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Exportiert eine Combo als Text-String (lesbares Format)
 */
export function exportComboToText(combo: ComboWithSteps): string {
  const sortedSteps = sortComboSteps(combo.steps);
  let text = `${combo.title}\n`;
  text += `${'='.repeat(combo.title.length)}\n\n`;

  if (combo.description) {
    text += `${combo.description}\n\n`;
  }

  text += 'Schritte:\n';
  text += '-'.repeat(50) + '\n\n';

  sortedSteps.forEach((step, index) => {
    text += `${index + 1}. ${step.card.name}\n`;
    text += `   Aktion: ${step.actionType}\n`;
    if (step.description) {
      text += `   Beschreibung: ${step.description}\n`;
    }
    if (step.targetCardId) {
      const targetCard = sortedSteps.find((s) => s.cardId === step.targetCardId)?.card;
      if (targetCard) {
        text += `   Zielkarte: ${targetCard.name}\n`;
      }
    }
    text += '\n';
  });

  text += `\nExportiert am: ${new Date().toLocaleString('de-DE')}\n`;

  return text;
}

/**
 * Importiert eine Combo aus JSON-String
 */
export function importComboFromJSON(jsonString: string): {
  title: string;
  description?: string | null;
  deckId?: string | null;
  steps: Array<{
    cardId: string;
    actionType: string;
    description?: string | null;
    targetCardId?: string | null;
    order: number;
  }>;
} | null {
  try {
    const data = JSON.parse(jsonString);

    // Validiere grundlegende Struktur
    if (!data.title || !Array.isArray(data.steps)) {
      return null;
    }

    return {
      title: data.title,
      description: data.description || null,
      deckId: data.deckId || null,
      steps: data.steps.map((step: any, index: number) => ({
        cardId: step.cardId,
        actionType: step.actionType,
        description: step.description || null,
        targetCardId: step.targetCardId || null,
        order: step.order !== undefined ? step.order : index + 1,
      })),
    };
  } catch (error) {
    return null;
  }
}
