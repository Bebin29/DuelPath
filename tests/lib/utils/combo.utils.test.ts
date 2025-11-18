/**
 * Unit-Tests für Combo-Utilities
 */

import { describe, it, expect } from "vitest";
import {
  sortComboSteps,
  reorderSteps,
  validateComboSteps,
  getComboStats,
  isCardInDeck,
  validateComboCardsInDeck,
  createTemporaryStepId,
  isTemporaryStepId,
} from "@/lib/utils/combo.utils";
import type { ComboWithSteps } from "@/types/combo.types";

describe("combo.utils", () => {
  describe("sortComboSteps", () => {
    it("should sort steps by order", () => {
      const steps = [
        { order: 3, id: "step-3" },
        { order: 1, id: "step-1" },
        { order: 2, id: "step-2" },
      ];

      const sorted = sortComboSteps(steps);

      expect(sorted[0].order).toBe(1);
      expect(sorted[1].order).toBe(2);
      expect(sorted[2].order).toBe(3);
    });

    it("should handle empty array", () => {
      const sorted = sortComboSteps([]);
      expect(sorted).toEqual([]);
    });
  });

  describe("reorderSteps", () => {
    it("should reorder steps correctly", () => {
      const steps = [
        { order: 1, id: "step-1" },
        { order: 2, id: "step-2" },
        { order: 3, id: "step-3" },
      ];

      const reordered = reorderSteps(steps, 0, 2);

      expect(reordered[0].id).toBe("step-2");
      expect(reordered[1].id).toBe("step-3");
      expect(reordered[2].id).toBe("step-1");
      expect(reordered[0].order).toBe(1);
      expect(reordered[1].order).toBe(2);
      expect(reordered[2].order).toBe(3);
    });

    it("should update order values sequentially", () => {
      const steps = [
        { order: 1, id: "step-1" },
        { order: 2, id: "step-2" },
      ];

      const reordered = reorderSteps(steps, 1, 0);

      expect(reordered[0].order).toBe(1);
      expect(reordered[1].order).toBe(2);
    });
  });

  describe("validateComboSteps", () => {
    it("should validate correct steps", () => {
      const steps = [
        { cardId: "card-1", actionType: "NORMAL_SUMMON", order: 1 },
        { cardId: "card-2", actionType: "ACTIVATE", order: 2 },
      ];

      const result = validateComboSteps(steps);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect duplicate orders", () => {
      const steps = [
        { cardId: "card-1", actionType: "NORMAL_SUMMON", order: 1 },
        { cardId: "card-2", actionType: "ACTIVATE", order: 1 },
      ];

      const result = validateComboSteps(steps);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Reihenfolge-Werte müssen eindeutig sein");
    });

    it("should detect non-sequential orders", () => {
      const steps = [
        { cardId: "card-1", actionType: "NORMAL_SUMMON", order: 1 },
        { cardId: "card-2", actionType: "ACTIVATE", order: 3 },
      ];

      const result = validateComboSteps(steps);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should detect missing cardId", () => {
      const steps = [
        { cardId: "", actionType: "NORMAL_SUMMON", order: 1 },
      ];

      const result = validateComboSteps(steps);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("Karten-ID"))).toBe(true);
    });

    it("should detect too many steps", () => {
      const steps = Array.from({ length: 101 }, (_, i) => ({
        cardId: `card-${i}`,
        actionType: "NORMAL_SUMMON" as const,
        order: i + 1,
      }));

      const result = validateComboSteps(steps);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("100"))).toBe(true);
    });
  });

  describe("getComboStats", () => {
    it("should calculate stats correctly", () => {
      const combo: ComboWithSteps = {
        id: "combo-1",
        title: "Test Combo",
        description: null,
        userId: "user-1",
        deckId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [
          {
            id: "step-1",
            comboId: "combo-1",
            order: 1,
            cardId: "card-1",
            actionType: "NORMAL_SUMMON",
            description: null,
            targetCardId: null,
            card: {
              id: "card-1",
              name: "Card 1",
              type: "Effect Monster",
              race: "Warrior",
              attribute: "LIGHT",
              level: 4,
              atk: 1800,
              def: 1200,
              desc: null,
              archetype: null,
              banlistInfo: null,
              imageUrl: null,
              imageSmall: null,
              passcode: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          {
            id: "step-2",
            comboId: "combo-1",
            order: 2,
            cardId: "card-1",
            actionType: "ACTIVATE",
            description: null,
            targetCardId: null,
            card: {
              id: "card-1",
              name: "Card 1",
              type: "Effect Monster",
              race: "Warrior",
              attribute: "LIGHT",
              level: 4,
              atk: 1800,
              def: 1200,
              desc: null,
              archetype: null,
              banlistInfo: null,
              imageUrl: null,
              imageSmall: null,
              passcode: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      };

      const stats = getComboStats(combo);

      expect(stats.totalSteps).toBe(2);
      expect(stats.uniqueCards).toBe(1);
      expect(stats.cardCounts.get("card-1")).toBe(2);
      expect(stats.actionTypeCounts.get("NORMAL_SUMMON")).toBe(1);
      expect(stats.actionTypeCounts.get("ACTIVATE")).toBe(1);
    });
  });

  describe("isCardInDeck", () => {
    it("should return true if card is in deck", () => {
      const deckCards = [
        { cardId: "card-1" },
        { cardId: "card-2" },
      ];

      expect(isCardInDeck("card-1", deckCards)).toBe(true);
    });

    it("should return false if card is not in deck", () => {
      const deckCards = [
        { cardId: "card-1" },
        { cardId: "card-2" },
      ];

      expect(isCardInDeck("card-3", deckCards)).toBe(false);
    });
  });

  describe("validateComboCardsInDeck", () => {
    it("should validate cards in deck correctly", () => {
      const combo: ComboWithSteps = {
        id: "combo-1",
        title: "Test Combo",
        description: null,
        userId: "user-1",
        deckId: "deck-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [
          {
            id: "step-1",
            comboId: "combo-1",
            order: 1,
            cardId: "card-1",
            actionType: "NORMAL_SUMMON",
            description: null,
            targetCardId: null,
            card: {
              id: "card-1",
              name: "Card 1",
              type: "Effect Monster",
              race: "Warrior",
              attribute: "LIGHT",
              level: 4,
              atk: 1800,
              def: 1200,
              desc: null,
              archetype: null,
              banlistInfo: null,
              imageUrl: null,
              imageSmall: null,
              passcode: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      };

      const deckCards = [{ cardId: "card-1" }];

      const result = validateComboCardsInDeck(combo, deckCards);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing cards", () => {
      const combo: ComboWithSteps = {
        id: "combo-1",
        title: "Test Combo",
        description: null,
        userId: "user-1",
        deckId: "deck-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [
          {
            id: "step-1",
            comboId: "combo-1",
            order: 1,
            cardId: "card-1",
            actionType: "NORMAL_SUMMON",
            description: null,
            targetCardId: null,
            card: {
              id: "card-1",
              name: "Card 1",
              type: "Effect Monster",
              race: "Warrior",
              attribute: "LIGHT",
              level: 4,
              atk: 1800,
              def: 1200,
              desc: null,
              archetype: null,
              banlistInfo: null,
              imageUrl: null,
              imageSmall: null,
              passcode: null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        ],
      };

      const deckCards = [{ cardId: "card-2" }];

      const result = validateComboCardsInDeck(combo, deckCards);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should return warning if no deck assigned", () => {
      const combo: ComboWithSteps = {
        id: "combo-1",
        title: "Test Combo",
        description: null,
        userId: "user-1",
        deckId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        steps: [],
      };

      const result = validateComboCardsInDeck(combo, []);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("createTemporaryStepId", () => {
    it("should create a temporary step ID", () => {
      const id = createTemporaryStepId();
      expect(id).toMatch(/^temp-/);
    });

    it("should create unique IDs", () => {
      const id1 = createTemporaryStepId();
      const id2 = createTemporaryStepId();
      expect(id1).not.toBe(id2);
    });
  });

  describe("isTemporaryStepId", () => {
    it("should return true for temporary IDs", () => {
      expect(isTemporaryStepId("temp-1234567890-abc123")).toBe(true);
    });

    it("should return false for regular IDs", () => {
      expect(isTemporaryStepId("step-123")).toBe(false);
      expect(isTemporaryStepId("combo-123")).toBe(false);
    });
  });
});



