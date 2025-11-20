import { describe, it, expect } from 'vitest';
import {
  createDeckSchema,
  updateDeckSchema,
  addCardToDeckSchema,
  updateCardQuantitySchema,
  removeCardFromDeckSchema,
  validateDeckSizes,
  DECK_VALIDATION_RULES,
} from '@/lib/validations/deck.schema';

describe('Deck Validation Schemas', () => {
  describe('createDeckSchema', () => {
    it('should validate valid deck data', () => {
      const validData = {
        name: 'Test Deck',
        description: 'A test deck',
        format: 'TCG' as const,
      };

      const result = createDeckSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        format: 'TCG' as const,
      };

      const result = createDeckSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const invalidData = {
        name: 'a'.repeat(101),
        format: 'TCG' as const,
      };

      const result = createDeckSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid format', () => {
      const invalidData = {
        name: 'Test Deck',
        format: 'INVALID' as string,
      };

      const result = createDeckSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('addCardToDeckSchema', () => {
    it('should validate valid card data', () => {
      const validData = {
        cardId: '12345',
        quantity: 2,
        deckSection: 'MAIN' as const,
      };

      const result = addCardToDeckSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject quantity less than 1', () => {
      const invalidData = {
        cardId: '12345',
        quantity: 0,
        deckSection: 'MAIN' as const,
      };

      const result = addCardToDeckSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject quantity greater than 3', () => {
      const invalidData = {
        cardId: '12345',
        quantity: 4,
        deckSection: 'MAIN' as const,
      };

      const result = addCardToDeckSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('validateDeckSizes', () => {
    it('should validate a valid deck', () => {
      const result = validateDeckSizes(40, 0, 0);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject main deck with too few cards', () => {
      const result = validateDeckSizes(35, 0, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Mindestens');
    });

    it('should reject main deck with too many cards', () => {
      const result = validateDeckSizes(65, 0, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Maximal');
    });

    it('should reject extra deck with too many cards', () => {
      const result = validateDeckSizes(40, 16, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Extra Deck');
    });

    it('should reject side deck with too many cards', () => {
      const result = validateDeckSizes(40, 0, 16);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Side Deck');
    });

    it('should validate deck with exactly 60 main deck cards', () => {
      const result = validateDeckSizes(60, 15, 15);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate deck with exactly 40 main deck cards', () => {
      const result = validateDeckSizes(40, 0, 0);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject deck with 0 main deck cards', () => {
      const result = validateDeckSizes(0, 0, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Mindestens');
    });

    it('should reject deck with 61 main deck cards', () => {
      const result = validateDeckSizes(61, 0, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Maximal');
    });

    it('should reject deck with 16 extra deck cards', () => {
      const result = validateDeckSizes(40, 16, 0);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Extra Deck');
    });

    it('should validate deck with 15 extra deck cards', () => {
      const result = validateDeckSizes(40, 15, 0);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate deck with 15 side deck cards', () => {
      const result = validateDeckSizes(40, 0, 15);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle multiple validation errors', () => {
      const result = validateDeckSizes(35, 16, 16);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should validate deck with all sections at maximum', () => {
      const result = validateDeckSizes(60, 15, 15);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
