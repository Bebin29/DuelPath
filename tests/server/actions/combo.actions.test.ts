import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createCombo,
  updateCombo,
  deleteCombo,
  getCombo,
  getCombosByUser,
  getCombosByDeck,
  addComboStep,
  updateComboStep,
  deleteComboStep,
  reorderComboSteps,
} from "@/server/actions/combo.actions";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/prisma/client";

// Mock dependencies
vi.mock("@/lib/auth/auth");
vi.mock("@/lib/prisma/client", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    combo: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      $transaction: vi.fn(),
    },
    comboStep: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    deck: {
      findUnique: vi.fn(),
    },
    card: {
      findUnique: vi.fn(),
    },
  },
}));

const mockAuth = vi.mocked(auth);
const mockPrisma = vi.mocked(prisma);

describe("Combo Actions", () => {
  const mockUserId = "user-123";
  const mockSession = {
    user: {
      id: mockUserId,
      email: "test@example.com",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession as any);
  });

  describe("createCombo", () => {
    it("should create a combo successfully", async () => {
      const comboData = {
        title: "Test Combo",
        description: "A test combo",
        deckId: "deck-123",
        steps: [
          {
            cardId: "card-1",
            actionType: "NORMAL_SUMMON" as const,
            order: 1,
            description: "Summon card",
          },
        ],
      };

      const mockCombo = {
        id: "combo-123",
        title: comboData.title,
        description: comboData.description,
        deckId: comboData.deckId,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockStep = {
        id: "step-1",
        comboId: "combo-123",
        cardId: "card-1",
        actionType: "NORMAL_SUMMON",
        order: 1,
        description: "Summon card",
        targetCardId: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: mockUserId } as any);
      mockPrisma.deck.findUnique.mockResolvedValue({
        id: "deck-123",
        userId: mockUserId,
      } as any);
      mockPrisma.combo.$transaction.mockImplementation(async (callback) => {
        return callback({
          combo: {
            create: vi.fn().mockResolvedValue(mockCombo),
          },
          comboStep: {
            create: vi.fn().mockResolvedValue(mockStep),
          },
        } as any);
      });

      const result = await createCombo(comboData);

      expect(result.success).toBe(true);
      expect(result.combo).toBeDefined();
    });

    it("should return error if unauthorized", async () => {
      mockAuth.mockResolvedValue(null);

      const result = await createCombo({
        title: "Test Combo",
        steps: [
          {
            cardId: "card-1",
            actionType: "NORMAL_SUMMON",
            order: 1,
          },
        ],
      });

      expect(result.error).toBe("Unauthorized");
    });

    it("should return error if deck not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: mockUserId } as any);
      mockPrisma.deck.findUnique.mockResolvedValue(null);

      const result = await createCombo({
        title: "Test Combo",
        deckId: "deck-123",
        steps: [
          {
            cardId: "card-1",
            actionType: "NORMAL_SUMMON",
            order: 1,
          },
        ],
      });

      expect(result.error).toBe("Deck not found");
    });
  });

  describe("updateCombo", () => {
    it("should update a combo successfully", async () => {
      const mockCombo = {
        id: "combo-123",
        title: "Old Title",
        userId: mockUserId,
      };

      mockPrisma.combo.findUnique.mockResolvedValue(mockCombo as any);
      mockPrisma.combo.update.mockResolvedValue({
        ...mockCombo,
        title: "New Title",
      } as any);

      const result = await updateCombo("combo-123", { title: "New Title" });

      expect(result.success).toBe(true);
      expect(result.combo?.title).toBe("New Title");
    });

    it("should return error if combo not found", async () => {
      mockPrisma.combo.findUnique.mockResolvedValue(null);

      const result = await updateCombo("combo-123", { title: "New Title" });

      expect(result.error).toBe("Combo not found");
    });

    it("should return error if forbidden", async () => {
      mockPrisma.combo.findUnique.mockResolvedValue({
        id: "combo-123",
        userId: "other-user",
      } as any);

      const result = await updateCombo("combo-123", { title: "New Title" });

      expect(result.error).toBe("Forbidden");
    });
  });

  describe("deleteCombo", () => {
    it("should delete a combo successfully", async () => {
      const mockCombo = {
        id: "combo-123",
        userId: mockUserId,
      };

      mockPrisma.combo.findUnique.mockResolvedValue(mockCombo as any);
      mockPrisma.combo.delete.mockResolvedValue(mockCombo as any);

      const result = await deleteCombo("combo-123");

      expect(result.success).toBe(true);
      expect(mockPrisma.combo.delete).toHaveBeenCalledWith({
        where: { id: "combo-123" },
      });
    });

    it("should return error if combo not found", async () => {
      mockPrisma.combo.findUnique.mockResolvedValue(null);

      const result = await deleteCombo("combo-123");

      expect(result.error).toBe("Combo not found");
    });
  });

  describe("getCombo", () => {
    it("should get a combo successfully", async () => {
      const mockCombo = {
        id: "combo-123",
        title: "Test Combo",
        userId: mockUserId,
        steps: [
          {
            id: "step-1",
            order: 1,
            card: { id: "card-1", name: "Test Card" },
          },
        ],
      };

      mockPrisma.combo.findUnique.mockResolvedValue(mockCombo as any);

      const result = await getCombo("combo-123");

      expect(result.success).toBe(true);
      expect(result.combo).toEqual(mockCombo);
    });

    it("should return error if combo not found", async () => {
      mockPrisma.combo.findUnique.mockResolvedValue(null);

      const result = await getCombo("combo-123");

      expect(result.error).toBe("Combo not found");
    });
  });

  describe("getCombosByUser", () => {
    it("should get combos by user successfully", async () => {
      const mockCombos = [
        {
          id: "combo-1",
          title: "Combo 1",
          userId: mockUserId,
          steps: [],
        },
        {
          id: "combo-2",
          title: "Combo 2",
          userId: mockUserId,
          steps: [],
        },
      ];

      mockPrisma.combo.findMany.mockResolvedValue(mockCombos as any);

      const result = await getCombosByUser();

      expect(result.success).toBe(true);
      expect(result.combos).toEqual(mockCombos);
    });

    it("should filter by deckId if provided", async () => {
      mockPrisma.combo.findMany.mockResolvedValue([]);

      await getCombosByUser("deck-123");

      expect(mockPrisma.combo.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          deckId: "deck-123",
        },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });
  });

  describe("addComboStep", () => {
    it("should add a step successfully", async () => {
      const mockCombo = {
        id: "combo-123",
        userId: mockUserId,
      };

      const mockStep = {
        id: "step-1",
        comboId: "combo-123",
        cardId: "card-1",
        actionType: "NORMAL_SUMMON",
        order: 1,
        description: null,
        targetCardId: null,
        card: { id: "card-1", name: "Test Card" },
      };

      mockPrisma.combo.findUnique.mockResolvedValue(mockCombo as any);
      mockPrisma.comboStep.findUnique.mockResolvedValue(null);
      mockPrisma.card.findUnique.mockResolvedValue({ id: "card-1" } as any);
      mockPrisma.comboStep.create.mockResolvedValue(mockStep as any);

      const result = await addComboStep("combo-123", {
        cardId: "card-1",
        actionType: "NORMAL_SUMMON",
        order: 1,
      });

      expect(result.success).toBe(true);
      expect(result.step).toEqual(mockStep);
    });

    it("should return error if step order already exists", async () => {
      const mockCombo = {
        id: "combo-123",
        userId: mockUserId,
      };

      mockPrisma.combo.findUnique.mockResolvedValue(mockCombo as any);
      mockPrisma.comboStep.findUnique.mockResolvedValue({
        id: "existing-step",
      } as any);

      const result = await addComboStep("combo-123", {
        cardId: "card-1",
        actionType: "NORMAL_SUMMON",
        order: 1,
      });

      expect(result.error).toBe("A step with this order already exists");
    });
  });

  describe("updateComboStep", () => {
    it("should update a step successfully", async () => {
      const mockStep = {
        id: "step-1",
        comboId: "combo-123",
        combo: {
          userId: mockUserId,
        },
      };

      const updatedStep = {
        ...mockStep,
        description: "Updated description",
        card: { id: "card-1", name: "Test Card" },
      };

      mockPrisma.comboStep.findUnique.mockResolvedValue(mockStep as any);
      mockPrisma.comboStep.findUnique.mockResolvedValueOnce(mockStep as any).mockResolvedValueOnce(null);
      mockPrisma.comboStep.update.mockResolvedValue(updatedStep as any);

      const result = await updateComboStep("step-1", {
        description: "Updated description",
      });

      expect(result.success).toBe(true);
      expect(result.step?.description).toBe("Updated description");
    });
  });

  describe("deleteComboStep", () => {
    it("should delete a step successfully", async () => {
      const mockStep = {
        id: "step-1",
        comboId: "combo-123",
        combo: {
          userId: mockUserId,
        },
      };

      mockPrisma.comboStep.findUnique.mockResolvedValue(mockStep as any);
      mockPrisma.comboStep.delete.mockResolvedValue(mockStep as any);

      const result = await deleteComboStep("step-1");

      expect(result.success).toBe(true);
      expect(mockPrisma.comboStep.delete).toHaveBeenCalledWith({
        where: { id: "step-1" },
      });
    });
  });

  describe("reorderComboSteps", () => {
    it("should reorder steps successfully", async () => {
      const mockCombo = {
        id: "combo-123",
        userId: mockUserId,
      };

      const mockSteps = [
        { id: "step-1", comboId: "combo-123" },
        { id: "step-2", comboId: "combo-123" },
      ];

      mockPrisma.combo.findUnique.mockResolvedValue(mockCombo as any);
      mockPrisma.comboStep.findMany.mockResolvedValue(mockSteps as any);
      mockPrisma.comboStep.update.mockResolvedValue({} as any);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          comboStep: {
            update: vi.fn().mockResolvedValue({}),
          },
        } as any);
      });

      const result = await reorderComboSteps("combo-123", ["step-2", "step-1"]);

      expect(result.success).toBe(true);
    });

    it("should return error if some steps don't belong to combo", async () => {
      const mockCombo = {
        id: "combo-123",
        userId: mockUserId,
      };

      mockPrisma.combo.findUnique.mockResolvedValue(mockCombo as any);
      mockPrisma.comboStep.findMany.mockResolvedValue([
        { id: "step-1", comboId: "combo-123" },
      ] as any);

      const result = await reorderComboSteps("combo-123", ["step-1", "step-2"]);

      expect(result.error).toBe("Some steps don't belong to this combo");
    });
  });
});



