import { prisma } from "@/lib/prisma/client";

/**
 * YGOPRODeck API Card Response Interface
 */
interface YGOPRODeckCard {
  id: number;
  name: string;
  type: string;
  race?: string;
  attribute?: string;
  level?: number;
  atk?: number;
  def?: number;
  desc?: string;
  archetype?: string;
  banlist_info?: string;
  card_images?: Array<{
    id: number;
    image_url: string;
    image_url_small: string;
  }>;
}

interface YGOPRODeckResponse {
  data: YGOPRODeckCard[];
}

/**
 * Import-Statistiken
 */
export interface ImportStats {
  total: number;
  created: number;
  updated: number;
  errors: number;
  skipped: number;
}

/**
 * Service für den Import von Yu-Gi-Oh! Karten von der YGOPRODeck API
 * 
 * Features:
 * - Batch-Import aller Karten
 * - Upsert-Logik (neue Karten einfügen, bestehende aktualisieren)
 * - Fehlerbehandlung und Retry-Logik
 * - Rate-Limiting (20 Requests/Sekunde)
 */
export class CardImportService {
  private readonly API_BASE_URL = "https://db.ygoprodeck.com/api/v7";
  private readonly RATE_LIMIT_DELAY = 50; // 50ms = 20 Requests/Sekunde
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 Sekunde

  /**
   * Lädt alle Karten von der YGOPRODeck API
   * 
   * @returns Array von Karten-Daten
   * @throws Error bei API-Fehlern
   */
  private async fetchAllCards(): Promise<YGOPRODeckCard[]> {
    const url = `${this.API_BASE_URL}/cardinfo.php?misc=yes`;
    
    let retries = 0;
    while (retries < this.MAX_RETRIES) {
      try {
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data: YGOPRODeckResponse = await response.json();
        
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error("Invalid API response format");
        }

        return data.data;
      } catch (error) {
        retries++;
        if (retries >= this.MAX_RETRIES) {
          throw new Error(
            `Failed to fetch cards after ${this.MAX_RETRIES} retries: ${error instanceof Error ? error.message : String(error)}`
          );
        }
        
        // Exponential backoff
        await this.delay(this.RETRY_DELAY * retries);
      }
    }

    throw new Error("Unexpected error in fetchAllCards");
  }

  /**
   * Konvertiert YGOPRODeck API-Daten in Prisma Card-Format
   * 
   * @param apiCard - Karte von der API
   * @returns Prisma Card-Daten
   */
  private mapApiCardToPrisma(apiCard: YGOPRODeckCard) {
    const imageUrl = apiCard.card_images?.[0]?.image_url || null;
    const imageSmall = apiCard.card_images?.[0]?.image_url_small || null;
    const passcode = apiCard.id.toString();

    return {
      id: passcode, // Verwende Passcode als ID
      name: apiCard.name,
      type: apiCard.type,
      race: apiCard.race || null,
      attribute: apiCard.attribute || null,
      level: apiCard.level ?? null,
      atk: apiCard.atk ?? null,
      def: apiCard.def ?? null,
      desc: apiCard.desc || null,
      archetype: apiCard.archetype || null,
      banlistInfo: apiCard.banlist_info || null,
      imageUrl,
      imageSmall,
      passcode,
    };
  }

  /**
   * Verzögerung für Rate-Limiting
   * 
   * @param ms - Millisekunden
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Importiert eine einzelne Karte (Upsert)
   * 
   * @param apiCard - Karte von der API
   * @returns true wenn erstellt, false wenn aktualisiert
   */
  private async importCard(apiCard: YGOPRODeckCard): Promise<"created" | "updated" | "skipped"> {
    try {
      const cardData = this.mapApiCardToPrisma(apiCard);

      // Prüfe ob Karte bereits existiert
      const existingCard = await prisma.card.findUnique({
        where: { id: cardData.id },
      });

      if (existingCard) {
        // Update bestehende Karte
        await prisma.card.update({
          where: { id: cardData.id },
          data: cardData,
        });
        return "updated";
      } else {
        // Erstelle neue Karte
        await prisma.card.create({
          data: cardData,
        });
        return "created";
      }
    } catch (error) {
      // Bei Fehlern (z.B. Constraint-Verletzungen) überspringen
      console.error(`Error importing card ${apiCard.name} (ID: ${apiCard.id}):`, error);
      return "skipped";
    }
  }

  /**
   * Importiert alle Karten von der YGOPRODeck API
   * 
   * @param onProgress - Callback für Fortschritts-Updates (optional)
   * @returns Import-Statistiken
   */
  async importAllCards(
    onProgress?: (current: number, total: number) => void
  ): Promise<ImportStats> {
    const stats: ImportStats = {
      total: 0,
      created: 0,
      updated: 0,
      errors: 0,
      skipped: 0,
    };

    try {
      // Lade alle Karten von der API
      const apiCards = await this.fetchAllCards();
      stats.total = apiCards.length;

      // Importiere Karten in Batches (mit Rate-Limiting)
      for (let i = 0; i < apiCards.length; i++) {
        const apiCard = apiCards[i];
        
        // Rate-Limiting: Warte zwischen Requests
        if (i > 0) {
          await this.delay(this.RATE_LIMIT_DELAY);
        }

        const result = await this.importCard(apiCard);
        
        switch (result) {
          case "created":
            stats.created++;
            break;
          case "updated":
            stats.updated++;
            break;
          case "skipped":
            stats.skipped++;
            stats.errors++;
            break;
        }

        // Progress-Callback aufrufen
        if (onProgress) {
          onProgress(i + 1, stats.total);
        }
      }

      return stats;
    } catch (error) {
      throw new Error(
        `Card import failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Importiert Karten in Batches (für große Imports)
   * 
   * @param batchSize - Anzahl Karten pro Batch
   * @param onProgress - Callback für Fortschritts-Updates (optional)
   * @returns Import-Statistiken
   */
  async importCardsInBatches(
    batchSize: number = 100,
    onProgress?: (current: number, total: number) => void
  ): Promise<ImportStats> {
    const stats: ImportStats = {
      total: 0,
      created: 0,
      updated: 0,
      errors: 0,
      skipped: 0,
    };

    try {
      // Lade alle Karten von der API
      const apiCards = await this.fetchAllCards();
      stats.total = apiCards.length;

      // Teile in Batches auf
      for (let i = 0; i < apiCards.length; i += batchSize) {
        const batch = apiCards.slice(i, i + batchSize);

        // Importiere Batch
        for (const apiCard of batch) {
          const result = await this.importCard(apiCard);
          
          switch (result) {
            case "created":
              stats.created++;
              break;
            case "updated":
              stats.updated++;
              break;
            case "skipped":
              stats.skipped++;
              stats.errors++;
              break;
          }
        }

        // Progress-Callback aufrufen
        if (onProgress) {
          onProgress(Math.min(i + batchSize, stats.total), stats.total);
        }

        // Rate-Limiting zwischen Batches
        if (i + batchSize < apiCards.length) {
          await this.delay(this.RATE_LIMIT_DELAY * 10); // Längere Pause zwischen Batches
        }
      }

      return stats;
    } catch (error) {
      throw new Error(
        `Card import failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

