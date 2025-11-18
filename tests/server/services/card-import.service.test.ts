import { describe, it, expect, vi, beforeEach } from "vitest";
import { CardImportService } from "@/server/services/card-import.service";

// Mock fetch
global.fetch = vi.fn();

describe("CardImportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("mapApiCardToPrisma", () => {
    it("should map API card data to Prisma format", () => {
      const service = new CardImportService();
      const apiCard = {
        id: 12345,
        name: "Blue-Eyes White Dragon",
        type: "Normal Monster",
        race: "Dragon",
        attribute: "LIGHT",
        level: 8,
        atk: 3000,
        def: 2500,
        desc: "This legendary dragon...",
        archetype: "Blue-Eyes",
        banlist_info: "Unlimited",
        card_images: [
          {
            id: 12345,
            image_url: "https://example.com/image.jpg",
            image_url_small: "https://example.com/image_small.jpg",
          },
        ],
      };

      // Access private method via type assertion (for testing)
      const mapped = (service as any).mapApiCardToPrisma(apiCard);

      expect(mapped.id).toBe("12345");
      expect(mapped.name).toBe("Blue-Eyes White Dragon");
      expect(mapped.type).toBe("Normal Monster");
      expect(mapped.level).toBe(8);
      expect(mapped.atk).toBe(3000);
      expect(mapped.imageUrl).toBe("https://example.com/image.jpg");
      expect(mapped.imageSmall).toBe("https://example.com/image_small.jpg");
    });

    it("should handle missing optional fields", () => {
      const service = new CardImportService();
      const apiCard = {
        id: 12345,
        name: "Test Card",
        type: "Spell Card",
        card_images: [],
      };

      const mapped = (service as any).mapApiCardToPrisma(apiCard);

      expect(mapped.race).toBeNull();
      expect(mapped.attribute).toBeNull();
      expect(mapped.level).toBeNull();
      expect(mapped.imageUrl).toBeNull();
      expect(mapped.imageSmall).toBeNull();
    });
  });

  describe("fetchAllCards", () => {
    it("should fetch cards from API", async () => {
      const mockResponse = {
        data: [
          {
            id: 12345,
            name: "Test Card",
            type: "Normal Monster",
            card_images: [],
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const service = new CardImportService();
      const cards = await (service as any).fetchAllCards();

      expect(cards).toHaveLength(1);
      expect(cards[0].name).toBe("Test Card");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://db.ygoprodeck.com/api/v7/cardinfo.php?misc=yes"
      );
    });

    it("should retry on failure", async () => {
      (global.fetch as any)
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [] }),
        });

      const service = new CardImportService();
      const cards = await (service as any).fetchAllCards();

      expect(cards).toEqual([]);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});





