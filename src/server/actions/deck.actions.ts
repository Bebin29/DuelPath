'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';
import {
  createDeckSchema,
  updateDeckSchema,
  addCardToDeckSchema,
  updateCardQuantitySchema,
  removeCardFromDeckSchema,
  batchOperationsSchema,
  type CreateDeckInput,
  type UpdateDeckInput,
  type AddCardToDeckInput,
  type UpdateCardQuantityInput,
  type RemoveCardFromDeckInput,
  type BatchOperationsInput,
  type BatchOperation,
  type DeckSection,
} from '@/lib/validations/deck.schema';
import type { Card } from '@prisma/client';

/**
 * Bestimmt die passende Deck-Sektion für eine Karte basierend auf ihrem Typ
 *
 * @param card - Karte
 * @returns Deck-Sektion (MAIN, EXTRA oder SIDE)
 */
function determineDeckSection(card: Card): DeckSection {
  const extraDeckTypes = [
    'Fusion Monster',
    'Synchro Monster',
    'XYZ Monster',
    'Link Monster',
    'Pendulum Effect Fusion Monster',
    'Pendulum Effect Synchro Monster',
    'Pendulum Effect XYZ Monster',
    'Pendulum Effect Link Monster',
    'Ritual Effect Monster',
    'Ritual Monster',
  ];

  // Prüfe ob der Kartentyp Extra Deck Karten enthält
  if (extraDeckTypes.some((type) => card.type.includes(type))) {
    return 'EXTRA';
  }

  // Standard: Main Deck
  return 'MAIN';
}

/**
 * Server Action: Erstellt ein neues Deck
 *
 * @param data - Deck-Daten
 * @returns Erstelltes Deck oder Fehler
 */
export async function createDeck(data: CreateDeckInput) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Prüfe ob User in der Datenbank existiert
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return { error: 'User not found in database. Please sign out and sign in again.' };
    }

    // Validierung
    const validatedData = createDeckSchema.parse(data);

    // Deck erstellen
    const deck = await prisma.deck.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        format: validatedData.format,
        userId: session.user.id,
      },
    });

    return { success: true, deck };
  } catch (error) {
    if (error instanceof Error) {
      // Prüfe ob es ein Foreign Key Constraint Fehler ist
      if (error.message.includes('foreign key') || error.message.includes('Foreign key')) {
        return { error: 'User not found in database. Please sign out and sign in again.' };
      }
      return { error: error.message };
    }
    return { error: 'Failed to create deck' };
  }
}

/**
 * Server Action: Aktualisiert ein Deck
 *
 * @param deckId - Deck-ID
 * @param data - Update-Daten
 * @returns Aktualisiertes Deck oder Fehler
 */
export async function updateDeck(deckId: string, data: UpdateDeckInput) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Prüfe ob Deck existiert und User berechtigt ist
    const existingDeck = await prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!existingDeck) {
      return { error: 'Deck not found' };
    }

    if (existingDeck.userId !== session.user.id) {
      return { error: 'Forbidden' };
    }

    // Validierung
    const validatedData = updateDeckSchema.parse(data);

    // Deck aktualisieren
    const deck = await prisma.deck.update({
      where: { id: deckId },
      data: validatedData,
    });

    return { success: true, deck };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Failed to update deck' };
  }
}

/**
 * Server Action: Löscht ein Deck
 *
 * @param deckId - Deck-ID
 * @returns Erfolg oder Fehler
 */
export async function deleteDeck(deckId: string) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Prüfe ob Deck existiert und User berechtigt ist
    const existingDeck = await prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!existingDeck) {
      return { error: 'Deck not found' };
    }

    if (existingDeck.userId !== session.user.id) {
      return { error: 'Forbidden' };
    }

    // Deck löschen (Cascade löscht auch DeckCards)
    await prisma.deck.delete({
      where: { id: deckId },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Failed to delete deck' };
  }
}

/**
 * Server Action: Holt alle Decks eines Users
 *
 * @returns Array von Decks
 */
export async function getUserDecks() {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Prüfe ob User in der Datenbank existiert
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return { error: 'User not found in database. Please sign in again.', decks: [] };
    }

    const decks = await prisma.deck.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        deckCards: {
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
        },
      },
    });

    return { success: true, decks };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message, decks: [] };
    }
    return { error: 'Failed to fetch decks', decks: [] };
  }
}

/**
 * Server Action: Holt ein einzelnes Deck mit Karten
 *
 * @param deckId - Deck-ID
 * @param options - Optionale Parameter für Pagination
 * @returns Deck mit Karten oder Fehler
 */
export async function getDeckById(deckId: string, options?: { skip?: number; take?: number }) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Prüfe zuerst ob Deck existiert und User berechtigt ist
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      select: {
        id: true,
        name: true,
        description: true,
        format: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!deck) {
      return { error: 'Deck not found' };
    }

    if (deck.userId !== session.user.id) {
      return { error: 'Forbidden' };
    }

    // Hole DeckCards mit optionaler Pagination
    // Für große Decks (>100 Karten) verwende Pagination
    const totalCards = await prisma.deckCard.count({
      where: { deckId },
    });

    const shouldPaginate = totalCards > 100 && options?.take;
    const skip = shouldPaginate ? options.skip || 0 : undefined;
    const take = shouldPaginate ? options.take || 100 : undefined;

    const deckCards = await prisma.deckCard.findMany({
      where: { deckId },
      skip,
      take,
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
            // desc wird nicht geladen, da es für Deck-Liste nicht benötigt wird
          },
        },
      },
      orderBy: [{ deckSection: 'asc' }, { card: { name: 'asc' } }],
    });

    return {
      success: true,
      deck: {
        ...deck,
        deckCards,
        _meta: shouldPaginate
          ? {
              totalCards,
              hasMore: (skip || 0) + (take || 0) < totalCards,
              skip: skip || 0,
              take: take || 0,
            }
          : undefined,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Failed to fetch deck' };
  }
}

/**
 * Server Action: Fügt eine Karte zu einem Deck hinzu
 *
 * @param deckId - Deck-ID
 * @param data - Karten-Daten
 * @returns Erfolg oder Fehler
 */
export async function addCardToDeck(deckId: string, data: AddCardToDeckInput) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Validierung
    const validatedData = addCardToDeckSchema.parse(data);

    // Kombiniere Queries: Prüfe Deck, Card und existingDeckCard parallel
    const [deck, card, existingDeckCard] = await Promise.all([
      prisma.deck.findUnique({
        where: { id: deckId },
      }),
      prisma.card.findUnique({
        where: { id: data.cardId },
      }),
      prisma.deckCard.findUnique({
        where: {
          deckId_cardId_deckSection: {
            deckId,
            cardId: validatedData.cardId,
            deckSection: validatedData.deckSection,
          },
        },
      }),
    ]);

    if (!deck) {
      return { error: 'Deck not found' };
    }

    if (deck.userId !== session.user.id) {
      return { error: 'Forbidden' };
    }

    if (!card) {
      return { error: 'Card not found' };
    }

    // Automatische Deck-Sektion-Zuordnung, falls MAIN angegeben oder nicht explizit gesetzt
    let deckSection = validatedData.deckSection;
    if (deckSection === 'MAIN') {
      // Prüfe ob die Karte automatisch ins Extra Deck gehört
      const suggestedSection = determineDeckSection(card);
      if (suggestedSection === 'EXTRA') {
        deckSection = 'EXTRA';
        // Prüfe nochmal ob Karte in EXTRA bereits existiert
        if (!existingDeckCard) {
          const existingInExtra = await prisma.deckCard.findUnique({
            where: {
              deckId_cardId_deckSection: {
                deckId,
                cardId: validatedData.cardId,
                deckSection: 'EXTRA',
              },
            },
          });
          if (existingInExtra) {
            // Aktualisiere Anzahl (mit Max-Limit)
            const newQuantity = Math.min(existingInExtra.quantity + validatedData.quantity, 3);

            const updated = await prisma.deckCard.update({
              where: { id: existingInExtra.id },
              data: { quantity: newQuantity },
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

            return { success: true, deckCard: updated };
          }
        }
      }
    }

    // Prüfe nochmal ob Karte in der richtigen Sektion existiert (falls deckSection geändert wurde)
    const finalExistingDeckCard =
      deckSection !== validatedData.deckSection
        ? await prisma.deckCard.findUnique({
            where: {
              deckId_cardId_deckSection: {
                deckId,
                cardId: validatedData.cardId,
                deckSection: deckSection,
              },
            },
          })
        : existingDeckCard;

    if (finalExistingDeckCard) {
      // Aktualisiere Anzahl (mit Max-Limit)
      const newQuantity = Math.min(finalExistingDeckCard.quantity + validatedData.quantity, 3);

      const updated = await prisma.deckCard.update({
        where: { id: finalExistingDeckCard.id },
        data: { quantity: newQuantity },
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

      return { success: true, deckCard: updated };
    } else {
      // Erstelle neuen Eintrag
      const deckCard = await prisma.deckCard.create({
        data: {
          deckId,
          cardId: validatedData.cardId,
          quantity: validatedData.quantity,
          deckSection: deckSection,
        },
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

      return { success: true, deckCard };
    }
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Failed to add card to deck' };
  }
}

/**
 * Server Action: Aktualisiert die Anzahl einer Karte im Deck
 *
 * @param deckId - Deck-ID
 * @param data - Update-Daten
 * @returns Erfolg oder Fehler
 */
export async function updateCardQuantity(deckId: string, data: UpdateCardQuantityInput) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Validierung
    const validatedData = updateCardQuantitySchema.parse(data);

    // Kombiniere Queries: Prüfe Deck und DeckCard parallel
    const [deck, deckCard] = await Promise.all([
      prisma.deck.findUnique({
        where: { id: deckId },
      }),
      prisma.deckCard.findUnique({
        where: {
          deckId_cardId_deckSection: {
            deckId,
            cardId: validatedData.cardId,
            deckSection: validatedData.deckSection,
          },
        },
      }),
    ]);

    if (!deck) {
      return { error: 'Deck not found' };
    }

    if (deck.userId !== session.user.id) {
      return { error: 'Forbidden' };
    }

    if (!deckCard) {
      return { error: 'Card not found in deck' };
    }

    // Aktualisiere Anzahl
    const updated = await prisma.deckCard.update({
      where: { id: deckCard.id },
      data: { quantity: validatedData.quantity },
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

    return { success: true, deckCard: updated };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Failed to update card quantity' };
  }
}

/**
 * Server Action: Verschiebt eine Karte zwischen Deck-Sektionen
 *
 * @param deckId - Deck-ID
 * @param data - Karten-Daten mit neuer Sektion
 * @returns Erfolg oder Fehler
 */
export async function moveCardBetweenSections(
  deckId: string,
  data: { cardId: string; fromSection: DeckSection; toSection: DeckSection }
) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Kombiniere Queries: Prüfe Deck, sourceDeckCard und targetDeckCard parallel
    const [deck, sourceDeckCard, targetDeckCard] = await Promise.all([
      prisma.deck.findUnique({
        where: { id: deckId },
      }),
      prisma.deckCard.findUnique({
        where: {
          deckId_cardId_deckSection: {
            deckId,
            cardId: data.cardId,
            deckSection: data.fromSection,
          },
        },
      }),
      prisma.deckCard.findUnique({
        where: {
          deckId_cardId_deckSection: {
            deckId,
            cardId: data.cardId,
            deckSection: data.toSection,
          },
        },
      }),
    ]);

    if (!deck) {
      return { error: 'Deck not found' };
    }

    if (deck.userId !== session.user.id) {
      return { error: 'Forbidden' };
    }

    if (!sourceDeckCard) {
      return { error: 'Card not found in source section' };
    }

    if (targetDeckCard) {
      // Karte existiert bereits in Ziel-Sektion: Aktualisiere Anzahl
      const newQuantity = Math.min(targetDeckCard.quantity + sourceDeckCard.quantity, 3);

      const updated = await prisma.deckCard.update({
        where: { id: targetDeckCard.id },
        data: { quantity: newQuantity },
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

      // Lösche Quell-Eintrag
      await prisma.deckCard.delete({
        where: { id: sourceDeckCard.id },
      });

      return {
        success: true,
        deckCard: updated,
        removedCardId: sourceDeckCard.cardId,
        removedSection: data.fromSection,
      };
    } else {
      // Verschiebe Karte zur neuen Sektion
      const updated = await prisma.deckCard.update({
        where: { id: sourceDeckCard.id },
        data: { deckSection: data.toSection },
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

      return { success: true, deckCard: updated, removedCardId: null, removedSection: null };
    }
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Failed to move card between sections' };
  }
}

/**
 * Server Action: Entfernt eine Karte aus einem Deck
 *
 * @param deckId - Deck-ID
 * @param data - Karten-Daten
 * @returns Erfolg oder Fehler
 */
export async function removeCardFromDeck(deckId: string, data: RemoveCardFromDeckInput) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Validierung
    const validatedData = removeCardFromDeckSchema.parse(data);

    // Kombiniere Queries: Prüfe Deck und DeckCard parallel
    const [deck, deckCard] = await Promise.all([
      prisma.deck.findUnique({
        where: { id: deckId },
      }),
      prisma.deckCard.findUnique({
        where: {
          deckId_cardId_deckSection: {
            deckId,
            cardId: validatedData.cardId,
            deckSection: validatedData.deckSection,
          },
        },
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
      }),
    ]);

    if (!deck) {
      return { error: 'Deck not found' };
    }

    if (deck.userId !== session.user.id) {
      return { error: 'Forbidden' };
    }

    if (!deckCard) {
      return { error: 'Card not found in deck' };
    }

    await prisma.deckCard.delete({
      where: { id: deckCard.id },
    });

    return { success: true, removedDeckCard: deckCard };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Failed to remove card from deck' };
  }
}

/**
 * Server Action: Führt mehrere Deck-Operationen in einem Batch aus
 *
 * @param deckId - Deck-ID
 * @param data - Batch-Operationen
 * @returns Ergebnisse der Operationen
 */
export async function batchDeckOperations(deckId: string, data: BatchOperationsInput) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Prüfe ob Deck existiert und User berechtigt ist
    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!deck) {
      return { error: 'Deck not found' };
    }

    if (deck.userId !== session.user.id) {
      return { error: 'Forbidden' };
    }

    // Validierung
    const validatedData = batchOperationsSchema.parse(data);

    const results: Array<{
      success: boolean;
      operation: BatchOperation;
      error?: string;
      deckCard?: any;
    }> = [];

    // Führe alle Operationen in einer Transaktion aus
    await prisma.$transaction(async (tx) => {
      for (const operation of validatedData.operations) {
        try {
          switch (operation.type) {
            case 'add': {
              const card = await tx.card.findUnique({ where: { id: operation.cardId } });
              if (!card) {
                results.push({ success: false, operation, error: 'Card not found' });
                continue;
              }

              let deckSection = operation.deckSection;
              if (deckSection === 'MAIN') {
                const suggestedSection = determineDeckSection(card);
                if (suggestedSection === 'EXTRA') {
                  deckSection = 'EXTRA';
                }
              }

              const existing = await tx.deckCard.findUnique({
                where: {
                  deckId_cardId_deckSection: {
                    deckId,
                    cardId: operation.cardId,
                    deckSection,
                  },
                },
              });

              if (existing) {
                const newQuantity = Math.min(existing.quantity + operation.quantity, 3);
                const updated = await tx.deckCard.update({
                  where: { id: existing.id },
                  data: { quantity: newQuantity },
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
                results.push({ success: true, operation, deckCard: updated });
              } else {
                const created = await tx.deckCard.create({
                  data: {
                    deckId,
                    cardId: operation.cardId,
                    quantity: operation.quantity,
                    deckSection,
                  },
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
                results.push({ success: true, operation, deckCard: created });
              }
              break;
            }
            case 'update': {
              const existing = await tx.deckCard.findUnique({
                where: {
                  deckId_cardId_deckSection: {
                    deckId,
                    cardId: operation.cardId,
                    deckSection: operation.deckSection,
                  },
                },
              });

              if (!existing) {
                results.push({ success: false, operation, error: 'Card not found in deck' });
                continue;
              }

              const updated = await tx.deckCard.update({
                where: { id: existing.id },
                data: { quantity: operation.quantity },
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
              results.push({ success: true, operation, deckCard: updated });
              break;
            }
            case 'remove': {
              const existing = await tx.deckCard.findUnique({
                where: {
                  deckId_cardId_deckSection: {
                    deckId,
                    cardId: operation.cardId,
                    deckSection: operation.deckSection,
                  },
                },
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

              if (!existing) {
                results.push({ success: false, operation, error: 'Card not found in deck' });
                continue;
              }

              await tx.deckCard.delete({ where: { id: existing.id } });
              results.push({ success: true, operation, deckCard: existing });
              break;
            }
            case 'move': {
              const existing = await tx.deckCard.findUnique({
                where: {
                  deckId_cardId_deckSection: {
                    deckId,
                    cardId: operation.cardId,
                    deckSection: operation.fromSection,
                  },
                },
              });

              if (!existing) {
                results.push({ success: false, operation, error: 'Card not found in deck' });
                continue;
              }

              const targetExisting = await tx.deckCard.findUnique({
                where: {
                  deckId_cardId_deckSection: {
                    deckId,
                    cardId: operation.cardId,
                    deckSection: operation.toSection,
                  },
                },
              });

              if (targetExisting) {
                const newQuantity = Math.min(targetExisting.quantity + existing.quantity, 3);
                await tx.deckCard.update({
                  where: { id: targetExisting.id },
                  data: { quantity: newQuantity },
                });
                await tx.deckCard.delete({ where: { id: existing.id } });
                const updated = await tx.deckCard.findUnique({
                  where: { id: targetExisting.id },
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
                results.push({ success: true, operation, deckCard: updated });
              } else {
                const updated = await tx.deckCard.update({
                  where: { id: existing.id },
                  data: { deckSection: operation.toSection },
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
                results.push({ success: true, operation, deckCard: updated });
              }
              break;
            }
          }
        } catch (opError) {
          results.push({
            success: false,
            operation,
            error: opError instanceof Error ? opError.message : 'Operation failed',
          });
        }
      }
    });

    return { success: true, results };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: 'Failed to execute batch operations' };
  }
}
