import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import {
  createDeck,
  updateDeck,
  deleteDeck,
  getUserDecks,
  getDeckById,
  addCardToDeck,
  updateCardQuantity,
  removeCardFromDeck,
} from '@/server/actions/deck.actions';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';

// Mock dependencies
vi.mock('@/lib/auth/auth');
vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    deck: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    card: {
      findUnique: vi.fn(),
    },
    deckCard: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

describe('Deck Actions', () => {
  const mockUserId = 'user-123';
  const mockSession = {
    user: {
      id: mockUserId,
      email: 'test@example.com',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as { user: { id: string; email: string; name: string } });
  });

  describe('createDeck', () => {
    it('should create a deck successfully', async () => {
      const deckData = {
        name: 'Test Deck',
        description: 'A test deck',
        format: 'TCG' as const,
      };

      const mockDeck = {
        id: 'deck-123',
        ...deckData,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.deck.create.mockResolvedValue(mockDeck as Prisma.Deck);

      const result = await createDeck(deckData);

      expect(result.success).toBe(true);
      expect(result.deck).toEqual(mockDeck);
      expect(mockPrisma.deck.create).toHaveBeenCalledWith({
        data: {
          ...deckData,
          userId: mockUserId,
        },
      });
    });

    it('should return error if unauthorized', async () => {
      mockAuth.mockResolvedValue(null);

      const result = await createDeck({
        name: 'Test Deck',
        format: 'TCG',
      });

      expect(result.error).toBe('Unauthorized');
      expect(mockPrisma.deck.create).not.toHaveBeenCalled();
    });
  });

  describe('updateDeck', () => {
    it('should update a deck successfully', async () => {
      const existingDeck = {
        id: 'deck-123',
        name: 'Old Name',
        userId: mockUserId,
        format: 'TCG',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = {
        name: 'New Name',
      };

      const updatedDeck = {
        ...existingDeck,
        ...updateData,
        updatedAt: new Date(),
      };

      mockPrisma.deck.findUnique.mockResolvedValue(existingDeck as Prisma.Deck);
      mockPrisma.deck.update.mockResolvedValue(updatedDeck as Prisma.Deck);

      const result = await updateDeck('deck-123', updateData);

      expect(result.success).toBe(true);
      expect(result.deck).toEqual(updatedDeck);
    });

    it('should return error if deck not found', async () => {
      mockPrisma.deck.findUnique.mockResolvedValue(null);

      const result = await updateDeck('deck-123', { name: 'New Name' });

      expect(result.error).toBe('Deck not found');
    });

    it('should return error if user is not owner', async () => {
      const existingDeck = {
        id: 'deck-123',
        name: 'Old Name',
        userId: 'other-user',
        format: 'TCG',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.deck.findUnique.mockResolvedValue(existingDeck as Prisma.Deck);

      const result = await updateDeck('deck-123', { name: 'New Name' });

      expect(result.error).toBe('Forbidden');
    });
  });

  describe('deleteDeck', () => {
    it('should delete a deck successfully', async () => {
      const existingDeck = {
        id: 'deck-123',
        name: 'Test Deck',
        userId: mockUserId,
        format: 'TCG',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.deck.findUnique.mockResolvedValue(existingDeck as Prisma.Deck);
      mockPrisma.deck.delete.mockResolvedValue(existingDeck as Prisma.Deck);

      const result = await deleteDeck('deck-123');

      expect(result.success).toBe(true);
      expect(mockPrisma.deck.delete).toHaveBeenCalledWith({
        where: { id: 'deck-123' },
      });
    });
  });

  describe('getUserDecks', () => {
    it('should return user decks', async () => {
      const mockDecks = [
        {
          id: 'deck-1',
          name: 'Deck 1',
          userId: mockUserId,
          format: 'TCG',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { deckCards: 40 },
        },
        {
          id: 'deck-2',
          name: 'Deck 2',
          userId: mockUserId,
          format: 'OCG',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { deckCards: 45 },
        },
      ];

      mockPrisma.deck.findMany.mockResolvedValue(mockDecks as Prisma.Deck[]);

      const result = await getUserDecks();

      expect(result.success).toBe(true);
      expect(result.decks).toEqual(mockDecks);
      expect(mockPrisma.deck.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: {
            select: {
              deckCards: true,
            },
          },
        },
      });
    });
  });

  describe('getDeckById', () => {
    it('should return deck with cards', async () => {
      const mockDeck = {
        id: 'deck-123',
        name: 'Test Deck',
        userId: mockUserId,
        format: 'TCG',
        createdAt: new Date(),
        updatedAt: new Date(),
        deckCards: [
          {
            id: 'deckcard-1',
            deckId: 'deck-123',
            cardId: 'card-1',
            quantity: 3,
            deckSection: 'MAIN',
            card: {
              id: 'card-1',
              name: 'Test Card',
              type: 'Effect Monster',
            },
          },
        ],
      };

      mockPrisma.deck.findUnique.mockResolvedValue(mockDeck as Prisma.Deck);

      const result = await getDeckById('deck-123');

      expect(result.success).toBe(true);
      expect(result.deck).toEqual(mockDeck);
    });
  });

  describe('addCardToDeck', () => {
    it('should add a new card to deck', async () => {
      const mockDeck = {
        id: 'deck-123',
        userId: mockUserId,
        format: 'TCG',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCard = {
        id: 'card-1',
        name: 'Test Card',
        type: 'Effect Monster',
      };

      const mockDeckCard = {
        id: 'deckcard-1',
        deckId: 'deck-123',
        cardId: 'card-1',
        quantity: 1,
        deckSection: 'MAIN',
        card: mockCard,
      };

      mockPrisma.deck.findUnique.mockResolvedValue(mockDeck as Prisma.Deck);
      mockPrisma.card.findUnique.mockResolvedValue(mockCard as Prisma.Card);
      mockPrisma.deckCard.findUnique.mockResolvedValue(null);
      mockPrisma.deckCard.create.mockResolvedValue(mockDeckCard as Prisma.DeckCard);

      const result = await addCardToDeck('deck-123', {
        cardId: 'card-1',
        quantity: 1,
        deckSection: 'MAIN',
      });

      expect(result.success).toBe(true);
      expect(result.deckCard).toEqual(mockDeckCard);
    });

    it('should update quantity if card already exists', async () => {
      const mockDeck = {
        id: 'deck-123',
        userId: mockUserId,
        format: 'TCG',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockCard = {
        id: 'card-1',
        name: 'Test Card',
        type: 'Effect Monster',
      };

      const existingDeckCard = {
        id: 'deckcard-1',
        deckId: 'deck-123',
        cardId: 'card-1',
        quantity: 1,
        deckSection: 'MAIN',
      };

      const updatedDeckCard = {
        ...existingDeckCard,
        quantity: 2,
      };

      mockPrisma.deck.findUnique.mockResolvedValue(mockDeck as Prisma.Deck);
      mockPrisma.card.findUnique.mockResolvedValue(mockCard as Prisma.Card);
      mockPrisma.deckCard.findUnique.mockResolvedValue(existingDeckCard as Prisma.DeckCard);
      mockPrisma.deckCard.update.mockResolvedValue(updatedDeckCard as Prisma.DeckCard);

      const result = await addCardToDeck('deck-123', {
        cardId: 'card-1',
        quantity: 1,
        deckSection: 'MAIN',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.deckCard.update).toHaveBeenCalled();
    });
  });

  describe('updateCardQuantity', () => {
    it('should update card quantity', async () => {
      const mockDeck = {
        id: 'deck-123',
        userId: mockUserId,
        format: 'TCG',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingDeckCard = {
        id: 'deckcard-1',
        deckId: 'deck-123',
        cardId: 'card-1',
        quantity: 1,
        deckSection: 'MAIN',
      };

      const updatedDeckCard = {
        ...existingDeckCard,
        quantity: 2,
        card: {
          id: 'card-1',
          name: 'Test Card',
        },
      };

      mockPrisma.deck.findUnique.mockResolvedValue(mockDeck as Prisma.Deck);
      mockPrisma.deckCard.findUnique.mockResolvedValue(existingDeckCard as Prisma.DeckCard);
      mockPrisma.deckCard.update.mockResolvedValue(updatedDeckCard as Prisma.DeckCard);

      const result = await updateCardQuantity('deck-123', {
        cardId: 'card-1',
        quantity: 2,
        deckSection: 'MAIN',
      });

      expect(result.success).toBe(true);
      expect(result.deckCard).toEqual(updatedDeckCard);
    });
  });

  describe('removeCardFromDeck', () => {
    it('should remove card from deck', async () => {
      const mockDeck = {
        id: 'deck-123',
        userId: mockUserId,
        format: 'TCG',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingDeckCard = {
        id: 'deckcard-1',
        deckId: 'deck-123',
        cardId: 'card-1',
        quantity: 1,
        deckSection: 'MAIN',
      };

      mockPrisma.deck.findUnique.mockResolvedValue(mockDeck as Prisma.Deck);
      mockPrisma.deckCard.findUnique.mockResolvedValue(existingDeckCard as Prisma.DeckCard);
      mockPrisma.deckCard.delete.mockResolvedValue(existingDeckCard as Prisma.DeckCard);

      const result = await removeCardFromDeck('deck-123', {
        cardId: 'card-1',
        deckSection: 'MAIN',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.deckCard.delete).toHaveBeenCalledWith({
        where: { id: 'deckcard-1' },
      });
    });
  });
});
