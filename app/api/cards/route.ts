import { NextRequest, NextResponse } from "next/server";
import { CardSearchService } from "@/server/services/card-search.service";
import type { CardSearchFilter, CardSortOptions } from "@/types/card.types";

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
    
    // Autocomplete-Modus
    if (searchParams.get("autocomplete") === "true") {
      const query = searchParams.get("query") || "";
      const limit = parseInt(searchParams.get("limit") || "10", 10);
      
      const searchService = new CardSearchService();
      const names = await searchService.autocompleteCardNames(query, limit);
      
      return NextResponse.json({ names });
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

    const def = searchParams.get("def");
    if (def) {
      const defNum = parseInt(def, 10);
      if (!isNaN(defNum)) filter.def = defNum;
    }

    const archetype = searchParams.get("archetype");
    if (archetype) filter.archetype = archetype;

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

    return NextResponse.json(result);
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



