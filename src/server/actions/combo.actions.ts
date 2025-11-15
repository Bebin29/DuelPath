"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma/client";
import {
  createComboSchema,
  updateComboSchema,
  createComboStepSchema,
  updateComboStepSchema,
  comboStepOrderSchema,
  batchComboStepOperationsSchema,
  type CreateComboInput,
  type UpdateComboInput,
  type CreateComboStepInput,
  type UpdateComboStepInput,
  type ComboStepOrderInput,
  type BatchComboStepOperationsInput,
} from "@/lib/validations/combo.schema";
import type { ComboWithSteps } from "@/types/combo.types";

/**
 * Validiert ob Card-IDs existieren
 * 
 * @param cardIds - Array von Card-IDs zu validieren
 * @returns Objekt mit existingCardIds Set und missingCardIds Array
 */
async function validateCardIds(cardIds: string[]): Promise<{
  existingCardIds: Set<string>;
  missingCardIds: string[];
}> {
  if (cardIds.length === 0) {
    return { existingCardIds: new Set(), missingCardIds: [] };
  }

  // Filtere ungültige Platzhalter-IDs
  const validCardIds = cardIds.filter((id) => id && id !== "00000000");

  if (validCardIds.length === 0) {
    return { existingCardIds: new Set(), missingCardIds: [] };
  }

  const existingCards = await prisma.card.findMany({
    where: {
      id: {
        in: validCardIds,
      },
    },
    select: {
      id: true,
    },
  });

  const existingCardIds = new Set(existingCards.map((card) => card.id));
  const missingCardIds = validCardIds.filter((id) => !existingCardIds.has(id));

  return { existingCardIds, missingCardIds };
}

/**
 * Server Action: Erstellt eine neue Kombo
 * 
 * @param data - Kombo-Daten inkl. Steps
 * @returns Erstellte Kombo oder Fehler
 */
export async function createCombo(data: CreateComboInput) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Prüfe ob User in der Datenbank existiert
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return { error: "User not found in database. Please sign out and sign in again." };
    }

    // Validierung
    const validatedData = createComboSchema.parse(data);

    // Prüfe ob Deck existiert und User berechtigt ist (falls deckId angegeben)
    if (validatedData.deckId) {
      const deck = await prisma.deck.findUnique({
        where: { id: validatedData.deckId },
      });

      if (!deck) {
        return { error: "Deck not found" };
      }

      if (deck.userId !== session.user.id) {
        return { error: "Forbidden: You don't have access to this deck" };
      }
    }

    // Validiere dass alle cardIds existieren (nur wenn Steps vorhanden sind)
    if (validatedData.steps && validatedData.steps.length > 0) {
      const cardIds = [
        ...validatedData.steps.map((step) => step.cardId),
        ...validatedData.steps
          .map((step) => step.targetCardId)
          .filter((id): id is string => !!id),
      ];
      const uniqueCardIds = [...new Set(cardIds)];

      // Prüfe ob ungültige Platzhalter-IDs verwendet werden
      const hasInvalidPlaceholder = uniqueCardIds.some((id) => id === "00000000");
      if (hasInvalidPlaceholder) {
        return {
          error: "Bitte wähle eine gültige Karte aus. Platzhalter-Karten sind nicht erlaubt.",
        };
      }

      // Validiere Card-IDs mit gemeinsamer Funktion
      const { missingCardIds } = await validateCardIds(uniqueCardIds);

      if (missingCardIds.length > 0) {
        return {
          error: `Invalid card IDs: ${missingCardIds.join(", ")}`,
        };
      }
    }

    // Kombo mit Steps erstellen (Transaction)
    const combo = await prisma.$transaction(async (tx) => {
      // Erstelle Kombo
      const newCombo = await tx.combo.create({
        data: {
          title: validatedData.title,
          description: validatedData.description || null,
          deckId: validatedData.deckId || null,
          userId: session.user.id,
        },
      });

      // Erstelle Steps (nur wenn vorhanden)
      const steps = validatedData.steps && validatedData.steps.length > 0
        ? await Promise.all(
            validatedData.steps.map((step) =>
              tx.comboStep.create({
                data: {
                  comboId: newCombo.id,
                  cardId: step.cardId,
                  actionType: step.actionType,
                  description: step.description || null,
                  targetCardId: step.targetCardId || null,
                  order: step.order,
                },
              })
            )
          )
        : [];

      return { ...newCombo, steps };
    });

    return { success: true, combo };
  } catch (error) {
    if (error instanceof Error) {
      // Prüfe ob es ein Foreign Key Constraint Fehler ist
      if (error.message.includes("foreign key") || error.message.includes("Foreign key")) {
        return { error: "Invalid card or deck reference" };
      }
      return { error: error.message };
    }
    return { error: "Failed to create combo" };
  }
}

/**
 * Server Action: Aktualisiert eine Kombo
 * 
 * @param comboId - Kombo-ID
 * @param data - Update-Daten
 * @returns Aktualisierte Kombo oder Fehler
 */
export async function updateCombo(comboId: string, data: UpdateComboInput) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Prüfe ob Kombo existiert und User berechtigt ist
    const existingCombo = await prisma.combo.findUnique({
      where: { id: comboId },
    });

    if (!existingCombo) {
      return { error: "Combo not found" };
    }

    if (existingCombo.userId !== session.user.id) {
      return { error: "Forbidden" };
    }

    // Prüfe ob Deck existiert und User berechtigt ist (falls deckId geändert wird)
    if (data.deckId !== undefined) {
      if (data.deckId) {
        const deck = await prisma.deck.findUnique({
          where: { id: data.deckId },
        });

        if (!deck) {
          return { error: "Deck not found" };
        }

        if (deck.userId !== session.user.id) {
          return { error: "Forbidden: You don't have access to this deck" };
        }
      }
    }

    // Validierung
    const validatedData = updateComboSchema.parse(data);

    // Kombo aktualisieren
    const combo = await prisma.combo.update({
      where: { id: comboId },
      data: validatedData,
    });

    return { success: true, combo };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to update combo" };
  }
}

/**
 * Server Action: Löscht eine Kombo
 * 
 * @param comboId - Kombo-ID
 * @returns Erfolg oder Fehler
 */
export async function deleteCombo(comboId: string) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Prüfe ob Kombo existiert und User berechtigt ist
    const existingCombo = await prisma.combo.findUnique({
      where: { id: comboId },
    });

    if (!existingCombo) {
      return { error: "Combo not found" };
    }

    if (existingCombo.userId !== session.user.id) {
      return { error: "Forbidden" };
    }

    // Kombo löschen (Steps werden durch Cascade automatisch gelöscht)
    await prisma.combo.delete({
      where: { id: comboId },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to delete combo" };
  }
}

/**
 * Server Action: Lädt eine einzelne Kombo mit allen Steps
 * 
 * @param comboId - Kombo-ID
 * @returns Kombo mit Steps oder Fehler
 */
export async function getCombo(comboId: string): Promise<
  | { success: true; combo: ComboWithSteps }
  | { error: string }
> {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Lade Kombo mit Steps und Karten (nur benötigte Card-Felder)
    const combo = await prisma.combo.findUnique({
      where: { id: comboId },
      include: {
        steps: {
          include: {
            card: {
              select: {
                id: true,
                name: true,
                imageSmall: true,
                type: true,
              },
            },
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!combo) {
      return { error: "Combo not found" };
    }

    // Prüfe ob User berechtigt ist
    if (combo.userId !== session.user.id) {
      return { error: "Forbidden" };
    }

    return { success: true, combo: combo as ComboWithSteps };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to get combo" };
  }
}

/**
 * Server Action: Lädt alle Kombos des aktuellen Users
 * 
 * @param deckId - Optional: Filter nach Deck-ID
 * @param options - Optional: Pagination-Optionen
 * @returns Liste von Kombos oder Fehler
 */
export async function getCombosByUser(deckId?: string, options?: { skip?: number; take?: number }) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Lade Kombos
    const where: { userId: string; deckId?: string } = {
      userId: session.user.id,
    };

    if (deckId) {
      where.deckId = deckId;
    }

    const combos = await prisma.combo.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      include: {
        _count: {
          select: {
            steps: true, // Aggregation für Step-Count statt einzelne Steps zu laden
          },
        },
        deck: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const totalCount = options?.skip !== undefined || options?.take !== undefined
      ? await prisma.combo.count({ where })
      : combos.length;

    // Transformiere Ergebnis: Ersetze _count.steps durch steps Array für Kompatibilität
    const combosWithStepCount = combos.map((combo) => {
      const { _count, ...rest } = combo;
      return {
        ...rest,
        steps: Array(_count.steps).fill({ order: 0 }), // Kompatibilität mit ComboWithPreview Type
      };
    });

    return { 
      success: true, 
      combos: combosWithStepCount,
      totalCount,
      hasMore: options?.skip !== undefined && options?.take !== undefined
        ? (options.skip + options.take) < totalCount
        : false,
    };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to get combos" };
  }
}

/**
 * Server Action: Lädt alle Kombos eines Decks
 * 
 * @param deckId - Deck-ID
 * @returns Liste von Kombos oder Fehler
 */
export async function getCombosByDeck(deckId: string) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Prüfe ob Deck existiert und User berechtigt ist
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      return { error: "Deck not found" };
    }

    if (deck.userId !== session.user.id) {
      return { error: "Forbidden" };
    }

    // Lade Kombos
    const combos = await prisma.combo.findMany({
      where: {
        deckId,
        userId: session.user.id,
      },
      include: {
        steps: {
          orderBy: {
            order: "asc",
          },
          take: 1, // Nur ersten Step für Vorschau
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return { success: true, combos };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to get combos" };
  }
}

/**
 * Server Action: Fügt einen Step zu einer Kombo hinzu
 * 
 * @param comboId - Kombo-ID
 * @param step - Step-Daten
 * @returns Erstellter Step oder Fehler
 */
export async function addComboStep(comboId: string, step: CreateComboStepInput) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Prüfe ob Kombo existiert und User berechtigt ist
    const existingCombo = await prisma.combo.findUnique({
      where: { id: comboId },
    });

    if (!existingCombo) {
      return { error: "Combo not found" };
    }

    if (existingCombo.userId !== session.user.id) {
      return { error: "Forbidden" };
    }

    // Prüfe ob order bereits existiert
    const existingStep = await prisma.comboStep.findUnique({
      where: {
        comboId_order: {
          comboId,
          order: step.order,
        },
      },
    });

    if (existingStep) {
      return { error: "A step with this order already exists" };
    }

    // Validierung
    const validatedStep = createComboStepSchema.parse(step);

    // Prüfe ob Karten existieren
    const cardIds = [
      validatedStep.cardId,
      validatedStep.targetCardId,
    ].filter((id): id is string => !!id);

    const { missingCardIds } = await validateCardIds(cardIds);

    if (missingCardIds.length > 0) {
      return {
        error: `Invalid card IDs: ${missingCardIds.join(", ")}`,
      };
    }

    // Step erstellen
    const newStep = await prisma.comboStep.create({
      data: {
        comboId,
        cardId: validatedStep.cardId,
        actionType: validatedStep.actionType,
        description: validatedStep.description || null,
        targetCardId: validatedStep.targetCardId || null,
        order: validatedStep.order,
      },
      include: {
        card: true,
      },
    });

    return { success: true, step: newStep };
  } catch (error) {
    if (error instanceof Error) {
      // Prüfe ob es ein Unique Constraint Fehler ist
      if (error.message.includes("Unique constraint") || error.message.includes("unique constraint")) {
        return { error: "A step with this order already exists" };
      }
      return { error: error.message };
    }
    return { error: "Failed to add step" };
  }
}

/**
 * Server Action: Aktualisiert einen Step
 * 
 * @param stepId - Step-ID
 * @param step - Update-Daten
 * @returns Aktualisierter Step oder Fehler
 */
export async function updateComboStep(stepId: string, step: UpdateComboStepInput) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Prüfe ob Step existiert und User berechtigt ist
    const existingStep = await prisma.comboStep.findUnique({
      where: { id: stepId },
      include: {
        combo: true,
      },
    });

    if (!existingStep) {
      return { error: "Step not found" };
    }

    if (existingStep.combo.userId !== session.user.id) {
      return { error: "Forbidden" };
    }

    // Prüfe ob order geändert wird und bereits existiert
    if (step.order !== undefined && step.order !== existingStep.order) {
      const conflictingStep = await prisma.comboStep.findUnique({
        where: {
          comboId_order: {
            comboId: existingStep.comboId,
            order: step.order,
          },
        },
      });

      if (conflictingStep) {
        return { error: "A step with this order already exists" };
      }
    }

    // Validierung
    const validatedStep = updateComboStepSchema.parse(step);

    // Prüfe ob Karten existieren (falls geändert)
    const cardIds = [
      validatedStep.cardId,
      validatedStep.targetCardId,
    ].filter((id): id is string => !!id);

    if (cardIds.length > 0) {
      const { missingCardIds } = await validateCardIds(cardIds);

      if (missingCardIds.length > 0) {
        return {
          error: `Invalid card IDs: ${missingCardIds.join(", ")}`,
        };
      }
    }

    // Step aktualisieren
    const updatedStep = await prisma.comboStep.update({
      where: { id: stepId },
      data: validatedStep,
      include: {
        card: true,
      },
    });

    return { success: true, step: updatedStep };
  } catch (error) {
    if (error instanceof Error) {
      // Prüfe ob es ein Unique Constraint Fehler ist
      if (error.message.includes("Unique constraint") || error.message.includes("unique constraint")) {
        return { error: "A step with this order already exists" };
      }
      return { error: error.message };
    }
    return { error: "Failed to update step" };
  }
}

/**
 * Server Action: Löscht einen Step
 * 
 * @param stepId - Step-ID
 * @returns Erfolg oder Fehler
 */
export async function deleteComboStep(stepId: string) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Prüfe ob Step existiert und User berechtigt ist
    const existingStep = await prisma.comboStep.findUnique({
      where: { id: stepId },
      include: {
        combo: true,
      },
    });

    if (!existingStep) {
      return { error: "Step not found" };
    }

    if (existingStep.combo.userId !== session.user.id) {
      return { error: "Forbidden" };
    }

    // Step löschen
    await prisma.comboStep.delete({
      where: { id: stepId },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to delete step" };
  }
}

/**
 * Server Action: Sortiert Steps einer Kombo neu
 * 
 * @param comboId - Kombo-ID
 * @param stepIds - Array von Step-IDs in neuer Reihenfolge
 * @returns Erfolg oder Fehler
 */
export async function reorderComboSteps(comboId: string, stepIds: string[]) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Prüfe ob Kombo existiert und User berechtigt ist
    const existingCombo = await prisma.combo.findUnique({
      where: { id: comboId },
    });

    if (!existingCombo) {
      return { error: "Combo not found" };
    }

    if (existingCombo.userId !== session.user.id) {
      return { error: "Forbidden" };
    }

    // Validierung
    const validatedData = comboStepOrderSchema.parse({ stepIds });

    // Prüfe ob alle Steps zur Kombo gehören
    const steps = await prisma.comboStep.findMany({
      where: {
        id: { in: validatedData.stepIds },
        comboId,
      },
    });

    if (steps.length !== validatedData.stepIds.length) {
      return { error: "Some steps don't belong to this combo" };
    }

    // Optimiertes Bulk-Update mit CASE-Statement für bessere Performance
    // Erstelle CASE-Statement für jeden Step
    const caseStatements = validatedData.stepIds
      .map((stepId, index) => `WHEN '${stepId}' THEN ${index + 1}`)
      .join(" ");

    // Führe Bulk-Update in einer Transaction aus
    await prisma.$transaction(async (tx) => {
      // Verwende Raw-Query für effizientes Bulk-Update
      await tx.$executeRawUnsafe(
        `UPDATE ComboStep 
         SET "order" = CASE id ${caseStatements} END 
         WHERE id IN (${validatedData.stepIds.map((id) => `'${id}'`).join(", ")})`
      );
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to reorder steps" };
  }
}

/**
 * Server Action: Führt Batch-Operationen auf Combo-Steps aus
 * 
 * @param comboId - Kombo-ID
 * @param operations - Array von Batch-Operationen
 * @returns Ergebnisse der Operationen oder Fehler
 */
export async function batchComboStepOperations(
  comboId: string,
  input: BatchComboStepOperationsInput
) {
  try {
    // Validiere Input
    const validatedData = batchComboStepOperationsSchema.parse(input);
    const { operations } = validatedData;

    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    // Prüfe ob Kombo existiert und User berechtigt ist
    const existingCombo = await prisma.combo.findUnique({
      where: { id: comboId },
    });

    if (!existingCombo) {
      return { error: "Combo not found" };
    }

    if (existingCombo.userId !== session.user.id) {
      return { error: "Forbidden" };
    }

    // Validiere alle Step-IDs gehören zur Kombo
    const stepIds = operations.map((op) => op.stepId);
    const steps = await prisma.comboStep.findMany({
      where: {
        id: { in: stepIds },
        comboId,
      },
    });

    if (steps.length !== stepIds.length) {
      return { error: "Some steps don't belong to this combo" };
    }

    const results: Array<{ success: boolean; stepId: string; error?: string; step?: any }> = [];

    // Führe alle Operationen in einer Transaction aus
    await prisma.$transaction(async (tx) => {
      // Sammle alle Card-IDs für Validierung
      const cardIdsToValidate = new Set<string>();
      for (const operation of operations) {
        if (operation.type === "update") {
          if (operation.data.cardId) {
            cardIdsToValidate.add(operation.data.cardId);
          }
          if (operation.data.targetCardId) {
            cardIdsToValidate.add(operation.data.targetCardId);
          }
        }
      }

      // Validiere alle Cards auf einmal
      if (cardIdsToValidate.size > 0) {
        const { missingCardIds } = await validateCardIds(Array.from(cardIdsToValidate));
        if (missingCardIds.length > 0) {
          throw new Error(`Invalid card IDs: ${missingCardIds.join(", ")}`);
        }
      }

      // Führe Operationen aus
      for (const operation of operations) {
        try {
          if (operation.type === "delete") {
            await tx.comboStep.delete({
              where: { id: operation.stepId },
            });
            results.push({ success: true, stepId: operation.stepId });
          } else if (operation.type === "update") {
            // Prüfe ob order geändert wird und bereits existiert
            if (operation.data.order !== undefined) {
              const existingStep = await tx.comboStep.findUnique({
                where: { id: operation.stepId },
              });

              if (existingStep && operation.data.order !== existingStep.order) {
                const conflictingStep = await tx.comboStep.findUnique({
                  where: {
                    comboId_order: {
                      comboId,
                      order: operation.data.order,
                    },
                  },
                });

                if (conflictingStep && conflictingStep.id !== operation.stepId) {
                  results.push({
                    success: false,
                    stepId: operation.stepId,
                    error: "A step with this order already exists",
                  });
                  continue;
                }
              }
            }

            const updatedStep = await tx.comboStep.update({
              where: { id: operation.stepId },
              data: operation.data,
              include: {
                card: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    race: true,
                    attribute: true,
                    level: true,
                    atk: true,
                    def: true,
                    archetype: true,
                    imageSmall: true,
                  },
                },
              },
            });
            results.push({ success: true, stepId: operation.stepId, step: updatedStep });
          }
        } catch (error) {
          results.push({
            success: false,
            stepId: operation.stepId,
            error: error instanceof Error ? error.message : "Operation failed",
          });
        }
      }
    });

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      success: failureCount === 0,
      results,
      summary: {
        total: operations.length,
        successful: successCount,
        failed: failureCount,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to execute batch operations" };
  }
}

