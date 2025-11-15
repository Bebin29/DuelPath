import { prisma } from "@/lib/prisma/client";
import type { CardSearchFilter, CardListResult, CardSortOptions } from "@/types/card.types";

/**
 * Service für die Kartensuche
 * 
 * Unterstützt:
 * - Filterung nach verschiedenen Kriterien
 * - Pagination
 * - Sortierung
 * - Autocomplete für Kartennamen
 */
export class CardSearchService {
  /**
   * Sucht Karten mit Filtern und Pagination
   * 
   * @param filter - Suchfilter
   * @param page - Seitennummer (1-basiert)
   * @param pageSize - Anzahl Karten pro Seite
   * @param sortOptions - Sortier-Optionen (optional)
   * @returns Liste von Karten mit Pagination-Info
   */
  async searchCards(
    filter: CardSearchFilter = {},
    page: number = 1,
    pageSize: number = 50,
    sortOptions?: CardSortOptions
  ): Promise<CardListResult> {
    // Validiere Pagination-Parameter
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(100, Math.max(1, pageSize)); // Max 100 pro Seite
    const skip = (validPage - 1) * validPageSize;

    // Baue Prisma-Filter auf
    const where: any = {};

    if (filter.name) {
      // Für SQLite: Verwende contains mit case-insensitive Suche
      // Für PostgreSQL könnte hier FTS verwendet werden
      const searchTerm = filter.name.trim();
      
      // Verbesserte Suche: Unterstützt mehrere Wörter
      const searchTerms = searchTerm.split(/\s+/).filter((term) => term.length > 0);
      
      if (searchTerms.length > 1) {
        // Mehrere Suchbegriffe: Alle müssen vorkommen
        where.AND = searchTerms.map((term) => ({
          name: {
            contains: term,
            mode: "insensitive" as const,
          },
        }));
      } else {
        // Einzelner Suchbegriff
        where.name = {
          contains: searchTerm,
          mode: "insensitive" as const,
        };
      }
    }

    if (filter.type) {
      where.type = {
        contains: filter.type,
        mode: "insensitive" as const,
      };
    }

    if (filter.race) {
      where.race = {
        contains: filter.race,
        mode: "insensitive" as const,
      };
    }

    if (filter.attribute) {
      where.attribute = filter.attribute;
    }

    if (filter.level !== undefined) {
      where.level = filter.level;
    }

    if (filter.atk !== undefined) {
      where.atk = filter.atk;
    }

    if (filter.def !== undefined) {
      where.def = filter.def;
    }

    if (filter.archetype) {
      where.archetype = {
        contains: filter.archetype,
        mode: "insensitive" as const,
      };
    }

    if (filter.banlistInfo) {
      where.banlistInfo = filter.banlistInfo;
    }

    // Sortierung
    const orderBy: any = {};
    if (sortOptions) {
      orderBy[sortOptions.sortBy] = sortOptions.order;
    } else {
      // Default: Sortierung nach Name
      orderBy.name = "asc";
    }

    // Führe Abfrage aus
    const [cards, total] = await Promise.all([
      prisma.card.findMany({
        where,
        skip,
        take: validPageSize,
        orderBy,
      }),
      prisma.card.count({ where }),
    ]);

    const totalPages = Math.ceil(total / validPageSize);

    return {
      cards,
      total,
      page: validPage,
      pageSize: validPageSize,
      totalPages,
    };
  }

  /**
   * Autocomplete für Kartennamen
   * 
   * @param query - Suchbegriff
   * @param limit - Maximale Anzahl Ergebnisse (default: 10)
   * @returns Array von Kartennamen
   */
  async autocompleteCardNames(query: string, limit: number = 10): Promise<string[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const cards = await prisma.card.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: {
        name: true,
      },
      take: limit,
      orderBy: {
        name: "asc",
      },
    });

    return cards.map((card) => card.name);
  }

  /**
   * Holt eine Karte nach ID
   * 
   * @param cardId - Karten-ID (Passcode)
   * @returns Karte oder null
   */
  async getCardById(cardId: string) {
    return prisma.card.findUnique({
      where: { id: cardId },
    });
  }

  /**
   * Holt mehrere Karten nach IDs
   * 
   * @param cardIds - Array von Karten-IDs
   * @returns Array von Karten
   */
  async getCardsByIds(cardIds: string[]) {
    return prisma.card.findMany({
      where: {
        id: {
          in: cardIds,
        },
      },
    });
  }
}


