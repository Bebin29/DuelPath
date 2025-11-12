"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma/client";
import {
  createDeckSchema,
  updateDeckSchema,
  addCardToDeckSchema,
  updateCardQuantitySchema,
  removeCardFromDeckSchema,
  type CreateDeckInput,
  type UpdateDeckInput,
  type AddCardToDeckInput,
  type UpdateCardQuantityInput,
  type RemoveCardFromDeckInput,
} from "@/lib/validations/deck.schema";

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
      return { error: "Unauthorized" };
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
      return { error: error.message };
    }
    return { error: "Failed to create deck" };
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
      return { error: "Unauthorized" };
    }

    // Prüfe ob Deck existiert und User berechtigt ist
    const existingDeck = await prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!existingDeck) {
      return { error: "Deck not found" };
    }

    if (existingDeck.userId !== session.user.id) {
      return { error: "Forbidden" };
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
    return { error: "Failed to update deck" };
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
      return { error: "Unauthorized" };
    }

    // Prüfe ob Deck existiert und User berechtigt ist
    const existingDeck = await prisma.deck.findUnique({
      where: { id: deckId },
    });

    if (!existingDeck) {
      return { error: "Deck not found" };
    }

    if (existingDeck.userId !== session.user.id) {
      return { error: "Forbidden" };
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
    return { error: "Failed to delete deck" };
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
      return { error: "Unauthorized" };
    }

    const decks = await prisma.deck.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: {
            deckCards: true,
          },
        },
      },
    });

    return { success: true, decks };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to fetch decks" };
  }
}

/**
 * Server Action: Holt ein einzelnes Deck mit Karten
 * 
 * @param deckId - Deck-ID
 * @returns Deck mit Karten oder Fehler
 */
export async function getDeckById(deckId: string) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "Unauthorized" };
    }

    const deck = await prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        deckCards: {
          include: {
            card: true,
          },
          orderBy: [
            { deckSection: "asc" },
            { card: { name: "asc" } },
          ],
        },
      },
    });

    if (!deck) {
      return { error: "Deck not found" };
    }

    if (deck.userId !== session.user.id) {
      return { error: "Forbidden" };
    }

    return { success: true, deck };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to fetch deck" };
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

    // Prüfe ob Karte existiert
    const card = await prisma.card.findUnique({
      where: { id: data.cardId },
    });

    if (!card) {
      return { error: "Card not found" };
    }

    // Validierung
    const validatedData = addCardToDeckSchema.parse(data);

    // Prüfe ob Karte bereits im Deck ist
    const existingDeckCard = await prisma.deckCard.findUnique({
      where: {
        deckId_cardId_deckSection: {
          deckId,
          cardId: validatedData.cardId,
          deckSection: validatedData.deckSection,
        },
      },
    });

    if (existingDeckCard) {
      // Aktualisiere Anzahl (mit Max-Limit)
      const newQuantity = Math.min(
        existingDeckCard.quantity + validatedData.quantity,
        3
      );

      const updated = await prisma.deckCard.update({
        where: { id: existingDeckCard.id },
        data: { quantity: newQuantity },
      });

      return { success: true, deckCard: updated };
    } else {
      // Erstelle neuen Eintrag
      const deckCard = await prisma.deckCard.create({
        data: {
          deckId,
          cardId: validatedData.cardId,
          quantity: validatedData.quantity,
          deckSection: validatedData.deckSection,
        },
        include: {
          card: true,
        },
      });

      return { success: true, deckCard };
    }
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to add card to deck" };
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

    // Validierung
    const validatedData = updateCardQuantitySchema.parse(data);

    // Finde DeckCard
    const deckCard = await prisma.deckCard.findUnique({
      where: {
        deckId_cardId_deckSection: {
          deckId,
          cardId: validatedData.cardId,
          deckSection: validatedData.deckSection,
        },
      },
    });

    if (!deckCard) {
      return { error: "Card not found in deck" };
    }

    // Aktualisiere Anzahl
    const updated = await prisma.deckCard.update({
      where: { id: deckCard.id },
      data: { quantity: validatedData.quantity },
      include: {
        card: true,
      },
    });

    return { success: true, deckCard: updated };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to update card quantity" };
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

    // Validierung
    const validatedData = removeCardFromDeckSchema.parse(data);

    // Finde und lösche DeckCard
    const deckCard = await prisma.deckCard.findUnique({
      where: {
        deckId_cardId_deckSection: {
          deckId,
          cardId: validatedData.cardId,
          deckSection: validatedData.deckSection,
        },
      },
    });

    if (!deckCard) {
      return { error: "Card not found in deck" };
    }

    await prisma.deckCard.delete({
      where: { id: deckCard.id },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to remove card from deck" };
  }
}

