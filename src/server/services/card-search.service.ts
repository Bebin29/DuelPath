import { prisma } from "@/lib/prisma/client";
import type { CardSearchFilter, CardListResult, CardSortOptions } from "@/types/card.types";
import type { Prisma } from "@prisma/client";
import { cardNameCache, archetypeCache, raceCache } from "./autocomplete-cache.service";

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

    // Baue typisierte Prisma-Filter auf
    const where: Prisma.CardWhereInput = {};
    const andConditions: Prisma.CardWhereInput[] = [];

    if (filter.name) {
      const searchTerm = filter.name.trim();
      
      if (filter.useRegex) {
        // Regex-Suche (nur für SQLite, begrenzte Unterstützung)
        // SQLite unterstützt REGEXP nur wenn sqlite3 mit Regex-Erweiterung kompiliert wurde
        // Fallback: Case-insensitive contains
        try {
          // Versuche Regex zu validieren
          new RegExp(searchTerm);
          // Wenn gültig, verwende contains als Fallback (SQLite REGEXP ist nicht zuverlässig)
          where.nameLower = {
            contains: searchTerm.toLowerCase(),
          };
        } catch {
          // Ungültiger Regex, verwende normale Suche
          where.nameLower = {
            contains: searchTerm.toLowerCase(),
          };
        }
      } else {
        // Case-insensitive Suche: Verwende nameLower für optimierte Suche
        const normalizedSearchTerm = searchTerm.toLowerCase();
        
        // Verbesserte Suche: Unterstützt mehrere Wörter
        const searchTerms = normalizedSearchTerm.split(/\s+/).filter((term) => term.length > 0);
        
        if (searchTerms.length > 1) {
          // Mehrere Suchbegriffe: Alle müssen vorkommen
          andConditions.push({
            AND: searchTerms.map((term) => ({
              nameLower: {
                contains: term,
              },
            })),
          });
        } else {
          // Einzelner Suchbegriff
          where.nameLower = {
            contains: normalizedSearchTerm,
          };
        }
      }
    }

    if (filter.type) {
      // Case-insensitive Suche für Typ
      const searchTerm = filter.type.trim();
      where.type = {
        contains: searchTerm,
      };
    }

    if (filter.race) {
      // Case-insensitive Suche für Race
      // SQLite ist standardmäßig case-insensitive für String-Vergleiche
      andConditions.push({
        race: {
          contains: filter.race.trim(),
        },
      });
    }

    if (filter.attribute) {
      where.attribute = filter.attribute;
    }

    if (filter.level !== undefined) {
      where.level = filter.level;
    }

    // ATK Filter: Exakter Wert oder Range
    if (filter.atk !== undefined) {
      where.atk = filter.atk;
    } else if (filter.atkMin !== undefined || filter.atkMax !== undefined) {
      const atkCondition: Prisma.IntFilter = {};
      if (filter.atkMin !== undefined) {
        atkCondition.gte = filter.atkMin;
      }
      if (filter.atkMax !== undefined) {
        atkCondition.lte = filter.atkMax;
      }
      where.atk = atkCondition;
    }

    // DEF Filter: Exakter Wert oder Range
    if (filter.def !== undefined) {
      where.def = filter.def;
    } else if (filter.defMin !== undefined || filter.defMax !== undefined) {
      const defCondition: Prisma.IntFilter = {};
      if (filter.defMin !== undefined) {
        defCondition.gte = filter.defMin;
      }
      if (filter.defMax !== undefined) {
        defCondition.lte = filter.defMax;
      }
      where.def = defCondition;
    }

    if (filter.archetype) {
      // Unterstützt einzelne oder mehrere Archetypes
      if (Array.isArray(filter.archetype)) {
        // Mehrere Archetypes: OR-Bedingung
        if (filter.archetype.length > 0) {
          andConditions.push({
            OR: filter.archetype
              .filter((arch) => arch && arch.trim().length > 0)
              .map((arch) => ({
                archetype: {
                  contains: arch.trim(),
                },
              })),
          });
        }
      } else {
        // Einzelner Archetype
        andConditions.push({
          archetype: {
            contains: filter.archetype.trim(),
          },
        });
      }
    }

    // Kombiniere alle AND-Bedingungen
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    if (filter.banlistInfo) {
      where.banlistInfo = filter.banlistInfo;
    }

    // Typisierte Sortierung
    const orderBy: Prisma.CardOrderByWithRelationInput = {};
    if (sortOptions) {
      const sortField = sortOptions.sortBy;
      const sortOrder = sortOptions.order;
      
      // Type-safe mapping der Sortierfelder
      if (sortField === "name" || sortField === "type" || sortField === "archetype") {
        orderBy[sortField] = sortOrder;
      } else if (sortField === "level" || sortField === "atk" || sortField === "def") {
        orderBy[sortField] = sortOrder;
      }
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
   * @param limit - Maximale Anzahl Ergebnisse (default: 5)
   * @returns Array von Kartennamen
   */
  async autocompleteCardNames(query: string, limit: number = 5): Promise<string[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    // Case-insensitive Suche für Autocomplete mit nameLower
    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `${normalizedQuery}:${limit}`;

    // Prüfe Cache
    const cached = cardNameCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const cards = await prisma.card.findMany({
      where: {
        nameLower: {
          contains: normalizedQuery,
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

    const names = cards.map((card) => card.name);
    
    // Speichere im Cache
    cardNameCache.set(cacheKey, names);
    
    return names;
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

  /**
   * Autocomplete für Race-Werte
   * 
   * @param query - Suchbegriff
   * @param limit - Maximale Anzahl Ergebnisse (default: 5)
   * @returns Array von eindeutigen Race-Werten
   */
  async autocompleteRaces(query: string, limit: number = 5): Promise<string[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `${normalizedQuery}:${limit}`;

    // Prüfe Cache
    const cached = raceCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Case-insensitive Suche für Race
    // SQLite ist standardmäßig case-insensitive für String-Vergleiche
    const cards = await prisma.card.findMany({
      where: {
        race: {
          contains: query.trim(),
          not: null,
        },
      },
      select: {
        race: true,
      },
      take: limit * 2, // Mehr holen, da wir deduplizieren
      distinct: ["race"],
      orderBy: {
        race: "asc",
      },
    });

    // Dedupliziere und normalisiere
    const races = new Set<string>();
    cards.forEach((card) => {
      if (card.race) {
        races.add(card.race);
      }
    });

    const results = Array.from(races).slice(0, limit);
    
    // Speichere im Cache
    raceCache.set(cacheKey, results);
    
    return results;
  }

  /**
   * Autocomplete für Archetype-Werte
   * 
   * @param query - Suchbegriff
   * @param limit - Maximale Anzahl Ergebnisse (default: 5)
   * @returns Array von eindeutigen Archetype-Werten
   */
  async autocompleteArchetypes(query: string, limit: number = 5): Promise<string[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `${normalizedQuery}:${limit}`;

    // Prüfe Cache
    const cached = archetypeCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Case-insensitive Suche für Archetype
    // SQLite ist standardmäßig case-insensitive für String-Vergleiche
    const cards = await prisma.card.findMany({
      where: {
        archetype: {
          contains: query.trim(),
          not: null,
        },
      },
      select: {
        archetype: true,
      },
      take: limit * 2, // Mehr holen, da wir deduplizieren
      distinct: ["archetype"],
      orderBy: {
        archetype: "asc",
      },
    });

    // Dedupliziere und normalisiere
    const archetypes = new Set<string>();
    cards.forEach((card) => {
      if (card.archetype) {
        archetypes.add(card.archetype);
      }
    });

    const results = Array.from(archetypes).slice(0, limit);
    
    // Speichere im Cache
    archetypeCache.set(cacheKey, results);
    
    return results;
  }
}


