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
  type DeckSection,
} from "@/lib/validations/deck.schema";
import type { Card } from "@prisma/client";

/**
 * Bestimmt die passende Deck-Sektion für eine Karte basierend auf ihrem Typ
 * 
 * @param card - Karte
 * @returns Deck-Sektion (MAIN, EXTRA oder SIDE)
 */
function determineDeckSection(card: Card): DeckSection {
  const extraDeckTypes = [
    "Fusion Monster",
    "Synchro Monster",
    "XYZ Monster",
    "Link Monster",
    "Pendulum Effect Fusion Monster",
    "Pendulum Effect Synchro Monster",
    "Pendulum Effect XYZ Monster",
    "Pendulum Effect Link Monster",
    "Ritual Effect Monster",
    "Ritual Monster",
  ];

  // Prüfe ob der Kartentyp Extra Deck Karten enthält
  if (extraDeckTypes.some((type) => card.type.includes(type))) {
    return "EXTRA";
  }

  // Standard: Main Deck
  return "MAIN";
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

    // Automatische Deck-Sektion-Zuordnung, falls MAIN angegeben oder nicht explizit gesetzt
    let deckSection = validatedData.deckSection;
    if (deckSection === "MAIN") {
      // Prüfe ob die Karte automatisch ins Extra Deck gehört
      const suggestedSection = determineDeckSection(card);
      if (suggestedSection === "EXTRA") {
        deckSection = "EXTRA";
      }
    }

    // Prüfe ob Karte bereits im Deck ist
    const existingDeckCard = await prisma.deckCard.findUnique({
      where: {
        deckId_cardId_deckSection: {
          deckId,
          cardId: validatedData.cardId,
          deckSection: deckSection,
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
          deckSection: deckSection,
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

    // Finde DeckCard in der Quell-Sektion
    const sourceDeckCard = await prisma.deckCard.findUnique({
      where: {
        deckId_cardId_deckSection: {
          deckId,
          cardId: data.cardId,
          deckSection: data.fromSection,
        },
      },
    });

    if (!sourceDeckCard) {
      return { error: "Card not found in source section" };
    }

    // Prüfe ob Karte bereits in Ziel-Sektion existiert
    const targetDeckCard = await prisma.deckCard.findUnique({
      where: {
        deckId_cardId_deckSection: {
          deckId,
          cardId: data.cardId,
          deckSection: data.toSection,
        },
      },
    });

    if (targetDeckCard) {
      // Karte existiert bereits in Ziel-Sektion: Aktualisiere Anzahl
      const newQuantity = Math.min(
        targetDeckCard.quantity + sourceDeckCard.quantity,
        3
      );

      await prisma.deckCard.update({
        where: { id: targetDeckCard.id },
        data: { quantity: newQuantity },
      });

      // Lösche Quell-Eintrag
      await prisma.deckCard.delete({
        where: { id: sourceDeckCard.id },
      });
    } else {
      // Verschiebe Karte zur neuen Sektion
      await prisma.deckCard.update({
        where: { id: sourceDeckCard.id },
        data: { deckSection: data.toSection },
      });
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to move card between sections" };
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

