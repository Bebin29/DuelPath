import { NextRequest, NextResponse } from "next/server";
import { CardSearchService } from "@/server/services/card-search.service";
import type { CardSearchFilter, CardSortOptions } from "@/types/card.types";
import { createHash } from "crypto";

/**
 * GET /api/cards
 * 
 * Sucht Karten mit Filtern, Pagination und Sortierung
 * 
 * Query-Parameter:
 * - name: Kartennamen-Suche (teilweise Übereinstimmung)
 * - type: Kartentyp-Filter
 * - race: Monster-Typ oder Spell/Trap-Kategorie
 * - attribute: Attribut (LIGHT, DARK, etc.)
 * - level: Level/Rang/Linkzahl
 * - atk: Angriffspunkte
 * - def: Verteidigungspunkte
 * - archetype: Archetype-Name
 * - banlistInfo: Banlist-Status
 * - page: Seitennummer (default: 1)
 * - limit: Anzahl pro Seite (default: 50, max: 100)
 * - sortBy: Sortierfeld (name, type, level, atk, def, archetype)
 * - order: Sortierreihenfolge (asc, desc)
 * - autocomplete: Wenn "true", gibt nur Kartennamen zurück
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Einzelne Karte nach ID holen
    const cardId = searchParams.get("id");
    if (cardId) {
      const searchService = new CardSearchService();
      const card = await searchService.getCardById(cardId);
      if (!card) {
        return NextResponse.json(
          { error: "Card not found" },
          { status: 404 }
        );
      }
      
      // ETag für Caching generieren
      const etag = createHash("md5").update(JSON.stringify(card)).digest("hex");
      const ifNoneMatch = request.headers.get("if-none-match");
      
      if (ifNoneMatch === `"${etag}"`) {
        return new NextResponse(null, { status: 304 });
      }
      
      const response = NextResponse.json({ card });
      response.headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
      response.headers.set("ETag", `"${etag}"`);
      return response;
    }

    // Mehrere Karten nach IDs holen (Batch-Request)
    const cardIds = searchParams.get("ids");
    if (cardIds) {
      const ids = cardIds.split(",").filter((id) => id.trim().length > 0);
      if (ids.length > 0) {
        const searchService = new CardSearchService();
        const cards = await searchService.getCardsByIds(ids);
        
        // ETag für Caching generieren
        const etag = createHash("md5").update(JSON.stringify(cards)).digest("hex");
        const ifNoneMatch = request.headers.get("if-none-match");
        
        if (ifNoneMatch === `"${etag}"`) {
          return new NextResponse(null, { status: 304 });
        }
        
        const response = NextResponse.json({ cards });
        response.headers.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
        response.headers.set("ETag", `"${etag}"`);
        return response;
      }
      return NextResponse.json({ cards: [] });
    }
    
    // Autocomplete-Modus für Kartennamen
    if (searchParams.get("autocomplete") === "true") {
      const query = searchParams.get("query") || "";
      const limit = Math.min(parseInt(searchParams.get("limit") || "5", 10), 10); // Max 10, default 5
      
      const searchService = new CardSearchService();
      const names = await searchService.autocompleteCardNames(query, limit);
      
      // ETag für Caching generieren
      const etag = createHash("md5").update(JSON.stringify(names)).digest("hex");
      const ifNoneMatch = request.headers.get("if-none-match");
      
      if (ifNoneMatch === `"${etag}"`) {
        return new NextResponse(null, { status: 304 });
      }
      
      const response = NextResponse.json({ names });
      response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600"); // 5 Minuten Cache
      response.headers.set("ETag", `"${etag}"`);
      return response;
    }

    // Kombinierter Autocomplete-Modus für Race und Archetype
    if (searchParams.get("autocompleteFilter") === "true") {
      const raceQuery = searchParams.get("race") || "";
      const archetypeQuery = searchParams.get("archetype") || "";
      const limit = parseInt(searchParams.get("limit") || "10", 10);
      
      const searchService = new CardSearchService();
      const [races, archetypes] = await Promise.all([
        raceQuery ? searchService.autocompleteRaces(raceQuery, limit) : Promise.resolve([]),
        archetypeQuery ? searchService.autocompleteArchetypes(archetypeQuery, limit) : Promise.resolve([]),
      ]);
      
      return NextResponse.json({ races, archetypes });
    }

    // Normale Suche
    const filter: CardSearchFilter = {};
    
    const name = searchParams.get("name");
    if (name) filter.name = name;

    const type = searchParams.get("type");
    if (type) filter.type = type;

    const race = searchParams.get("race");
    if (race) filter.race = race;

    const attribute = searchParams.get("attribute");
    if (attribute) filter.attribute = attribute;

    const level = searchParams.get("level");
    if (level) {
      const levelNum = parseInt(level, 10);
      if (!isNaN(levelNum)) filter.level = levelNum;
    }

    const atk = searchParams.get("atk");
    if (atk) {
      const atkNum = parseInt(atk, 10);
      if (!isNaN(atkNum)) filter.atk = atkNum;
    }

    const atkMin = searchParams.get("atkMin");
    if (atkMin) {
      const atkMinNum = parseInt(atkMin, 10);
      if (!isNaN(atkMinNum)) filter.atkMin = atkMinNum;
    }

    const atkMax = searchParams.get("atkMax");
    if (atkMax) {
      const atkMaxNum = parseInt(atkMax, 10);
      if (!isNaN(atkMaxNum)) filter.atkMax = atkMaxNum;
    }

    const def = searchParams.get("def");
    if (def) {
      const defNum = parseInt(def, 10);
      if (!isNaN(defNum)) filter.def = defNum;
    }

    const defMin = searchParams.get("defMin");
    if (defMin) {
      const defMinNum = parseInt(defMin, 10);
      if (!isNaN(defMinNum)) filter.defMin = defMinNum;
    }

    const defMax = searchParams.get("defMax");
    if (defMax) {
      const defMaxNum = parseInt(defMax, 10);
      if (!isNaN(defMaxNum)) filter.defMax = defMaxNum;
    }

    const useRegex = searchParams.get("useRegex");
    if (useRegex === "true") {
      filter.useRegex = true;
    }

    // Unterstützt mehrere Archetypes (z.B. ?archetype=hero&archetype=blue-eyes)
    const archetypeParams = searchParams.getAll("archetype");
    if (archetypeParams.length > 0) {
      filter.archetype = archetypeParams.length === 1 ? archetypeParams[0] : archetypeParams;
    }

    const banlistInfo = searchParams.get("banlistInfo");
    if (banlistInfo) filter.banlistInfo = banlistInfo;

    // Pagination
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Sortierung
    let sortOptions: CardSortOptions | undefined;
    const sortBy = searchParams.get("sortBy");
    const order = searchParams.get("order") as "asc" | "desc" | null;
    
    if (sortBy && order) {
      sortOptions = {
        sortBy: sortBy as CardSortOptions["sortBy"],
        order: order === "desc" ? "desc" : "asc",
      };
    }

    // Suche ausführen
    const searchService = new CardSearchService();
    const result = await searchService.searchCards(filter, page, limit, sortOptions);

    // ETag für Caching generieren (basierend auf Query-Params und Ergebnis)
    const cacheKey = JSON.stringify({ filter, page, limit, sortOptions, total: result.total });
    const etag = createHash("md5").update(cacheKey).digest("hex");
    const ifNoneMatch = request.headers.get("if-none-match");
    
    if (ifNoneMatch === `"${etag}"`) {
      return new NextResponse(null, { status: 304 });
    }
    
    const response = NextResponse.json(result);
    // Kürzere Cache-Zeit für Suchen (5 Minuten), da sich Daten ändern können
    response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    response.headers.set("ETag", `"${etag}"`);
    return response;
  } catch (error) {
    console.error("Card search error:", error);
    
    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}



