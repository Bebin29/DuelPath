import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CardSearchService } from '@/server/services/card-search.service';
import { prisma } from '@/lib/prisma/client';
import type { CardSearchFilter, CardSortOptions } from '@/types/card.types';

// Mock Prisma
vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    card: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const mockPrisma = vi.mocked(prisma);

describe('CardSearchService', () => {
  let service: CardSearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CardSearchService();
  });

  describe('searchCards', () => {
    it('should search cards with name filter', async () => {
      const mockCards = [
        {
          id: '1',
          name: 'Blue-Eyes White Dragon',
          type: 'Normal Monster',
          attribute: 'LIGHT',
          level: 8,
          atk: 3000,
          def: 2500,
        },
      ];

      mockPrisma.card.findMany.mockResolvedValue(mockCards as Prisma.Card[]);
      mockPrisma.card.count.mockResolvedValue(1);

      const filter: CardSearchFilter = { name: 'Blue-Eyes' };
      const result = await service.searchCards(filter, 1, 50);

      expect(result.cards).toEqual(mockCards);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(mockPrisma.card.findMany).toHaveBeenCalled();
    });

    it('should search cards with type filter', async () => {
      const mockCards = [
        {
          id: '1',
          name: 'Dark Magician',
          type: 'Normal Monster',
        },
      ];

      mockPrisma.card.findMany.mockResolvedValue(mockCards as Prisma.Card[]);
      mockPrisma.card.count.mockResolvedValue(1);

      const filter: CardSearchFilter = { type: 'Normal Monster' };
      const result = await service.searchCards(filter, 1, 50);

      expect(result.cards).toEqual(mockCards);
      expect(mockPrisma.card.findMany).toHaveBeenCalled();
    });

    it('should search cards with attribute filter', async () => {
      const mockCards = [
        {
          id: '1',
          name: 'Blue-Eyes White Dragon',
          attribute: 'LIGHT',
        },
      ];

      mockPrisma.card.findMany.mockResolvedValue(mockCards as Prisma.Card[]);
      mockPrisma.card.count.mockResolvedValue(1);

      const filter: CardSearchFilter = { attribute: 'LIGHT' };
      const result = await service.searchCards(filter, 1, 50);

      expect(result.cards).toEqual(mockCards);
    });

    it('should search cards with level filter', async () => {
      const mockCards = [
        {
          id: '1',
          name: 'Blue-Eyes White Dragon',
          level: 8,
        },
      ];

      mockPrisma.card.findMany.mockResolvedValue(mockCards as Prisma.Card[]);
      mockPrisma.card.count.mockResolvedValue(1);

      const filter: CardSearchFilter = { level: 8 };
      const result = await service.searchCards(filter, 1, 50);

      expect(result.cards).toEqual(mockCards);
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.card.findMany.mockResolvedValue([]);
      mockPrisma.card.count.mockResolvedValue(100);

      const result = await service.searchCards({}, 2, 20);

      expect(result.total).toBe(100);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(20);
      expect(result.totalPages).toBe(5);
      expect(mockPrisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 20,
        })
      );
    });

    it('should handle sorting', async () => {
      mockPrisma.card.findMany.mockResolvedValue([]);
      mockPrisma.card.count.mockResolvedValue(0);

      const sortOptions: CardSortOptions = {
        sortBy: 'name',
        order: 'asc',
      };

      await service.searchCards({}, 1, 50, sortOptions);

      expect(mockPrisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            name: 'asc',
          },
        })
      );
    });

    it('should use default sorting by name if no sort options provided', async () => {
      mockPrisma.card.findMany.mockResolvedValue([]);
      mockPrisma.card.count.mockResolvedValue(0);

      await service.searchCards({}, 1, 50);

      expect(mockPrisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            name: 'asc',
          },
        })
      );
    });

    it('should limit page size to 100', async () => {
      mockPrisma.card.findMany.mockResolvedValue([]);
      mockPrisma.card.count.mockResolvedValue(0);

      await service.searchCards({}, 1, 200);

      expect(mockPrisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
        })
      );
    });

    it('should handle multiple filters', async () => {
      mockPrisma.card.findMany.mockResolvedValue([]);
      mockPrisma.card.count.mockResolvedValue(0);

      const filter: CardSearchFilter = {
        name: 'Dragon',
        type: 'Effect Monster',
        attribute: 'LIGHT',
        level: 4,
      };

      await service.searchCards(filter, 1, 50);

      expect(mockPrisma.card.findMany).toHaveBeenCalled();
      const callArgs = mockPrisma.card.findMany.mock.calls[0][0];
      expect(callArgs.where).toMatchObject({
        name: expect.objectContaining({ contains: 'Dragon' }),
        type: expect.objectContaining({ contains: 'Effect Monster' }),
        attribute: 'LIGHT',
        level: 4,
      });
    });
  });

  describe('autocompleteCardNames', () => {
    it('should return card names for autocomplete', async () => {
      const mockCards = [
        { name: 'Blue-Eyes White Dragon' },
        { name: 'Blue-Eyes Alternative White Dragon' },
      ];

      mockPrisma.card.findMany.mockResolvedValue(mockCards as Prisma.Card[]);

      const result = await service.autocompleteCardNames('Blue-Eyes', 10);

      expect(result).toEqual(['Blue-Eyes White Dragon', 'Blue-Eyes Alternative White Dragon']);
      expect(mockPrisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            name: {
              contains: 'Blue-Eyes',
              mode: 'insensitive',
            },
          },
          select: {
            name: true,
          },
          take: 10,
        })
      );
    });

    it('should return empty array for empty query', async () => {
      const result = await service.autocompleteCardNames('', 10);

      expect(result).toEqual([]);
      expect(mockPrisma.card.findMany).not.toHaveBeenCalled();
    });

    it('should return empty array for query shorter than 2 characters', async () => {
      const result = await service.autocompleteCardNames('B', 10);

      expect(result).toEqual([]);
      expect(mockPrisma.card.findMany).not.toHaveBeenCalled();
    });

    it('should respect limit parameter', async () => {
      const mockCards = Array.from({ length: 20 }, (_, i) => ({
        name: `Card ${i}`,
      }));

      mockPrisma.card.findMany.mockResolvedValue(mockCards as Prisma.Card[]);

      const result = await service.autocompleteCardNames('Card', 5);

      expect(result.length).toBeLessThanOrEqual(5);
      expect(mockPrisma.card.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });
  });

  describe('getCardById', () => {
    it('should return a card by ID', async () => {
      const mockCard = {
        id: '12345',
        name: 'Test Card',
        type: 'Effect Monster',
      };

      mockPrisma.card.findUnique = vi.fn().mockResolvedValue(mockCard as Prisma.Card);

      const result = await service.getCardById('12345');

      expect(result).toEqual(mockCard);
      expect(mockPrisma.card.findUnique).toHaveBeenCalledWith({
        where: { id: '12345' },
      });
    });

    it('should return null if card not found', async () => {
      mockPrisma.card.findUnique = vi.fn().mockResolvedValue(null);

      const result = await service.getCardById('99999');

      expect(result).toBeNull();
    });
  });

  describe('getCardsByIds', () => {
    it('should return multiple cards by IDs', async () => {
      const mockCards = [
        { id: '1', name: 'Card 1' },
        { id: '2', name: 'Card 2' },
      ];

      mockPrisma.card.findMany = vi.fn().mockResolvedValue(mockCards as Prisma.Card[]);

      const result = await service.getCardsByIds(['1', '2']);

      expect(result).toEqual(mockCards);
      expect(mockPrisma.card.findMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: ['1', '2'],
          },
        },
      });
    });

    it('should return empty array for empty IDs', async () => {
      mockPrisma.card.findMany = vi.fn().mockResolvedValue([]);

      const result = await service.getCardsByIds([]);

      expect(result).toEqual([]);
    });
  });
});
