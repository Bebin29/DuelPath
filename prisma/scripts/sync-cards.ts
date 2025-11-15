import { CardImportService } from "@/server/services/card-import.service";
import { prisma } from "@/lib/prisma/client";

/**
 * Intelligentes Sync-Script für Karten
 * 
 * Features:
 * - Prüft, welche Karten bereits in der Datenbank vorhanden sind
 * - Importiert nur fehlende Karten von der YGOPRODeck API
 * - Setzt normalisierte Felder direkt beim Import
 * - Füllt fehlende normalisierte Felder bei bestehenden Karten auf
 * 
 * Usage: tsx prisma/scripts/sync-cards.ts
 */
async function main() {
  console.log("Starting intelligent card sync...\n");

  try {
    // Schritt 1: Prüfe, welche Karten bereits vorhanden sind
    console.log("Step 1: Checking existing cards in database...");
    const existingCards = await prisma.card.findMany({
      select: {
        id: true,
        passcode: true,
        name: true,
        nameLower: true,
        type: true,
        typeLower: true,
        race: true,
        raceLower: true,
        archetype: true,
        archetypeLower: true,
      },
    });

    const existingPasscodes = new Set(
      existingCards.map((card) => card.passcode).filter((p): p is string => p !== null)
    );
    console.log(`Found ${existingCards.length} existing cards in database\n`);

    // Schritt 2: Hole alle Karten von der API
    console.log("Step 2: Fetching all cards from YGOPRODeck API...");
    const importService = new CardImportService();
    
    // Verwende die private Methode über einen Workaround
    // Da fetchAllCards private ist, müssen wir die API direkt aufrufen
    const API_BASE_URL = "https://db.ygoprodeck.com/api/v7";
    const url = `${API_BASE_URL}/cardinfo.php?misc=yes`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid API response format");
    }

    const apiCards = data.data;
    console.log(`Fetched ${apiCards.length} cards from API\n`);

    // Schritt 3: Filtere fehlende Karten
    console.log("Step 3: Filtering missing cards...");
    const missingCards = apiCards.filter((apiCard: { id: number }) => {
      const passcode = apiCard.id.toString();
      return !existingPasscodes.has(passcode);
    });

    console.log(`Found ${missingCards.length} missing cards to import`);
    console.log(`Skipping ${apiCards.length - missingCards.length} existing cards\n`);

    // Schritt 4: Importiere nur fehlende Karten
    let importStats = {
      total: missingCards.length,
      created: 0,
      updated: 0,
      errors: 0,
      skipped: 0,
    };

    if (missingCards.length > 0) {
      console.log("Step 4: Importing missing cards...");
      
      const batchSize = 100;
      for (let i = 0; i < missingCards.length; i += batchSize) {
        const batch = missingCards.slice(i, i + batchSize);
        
        for (const apiCard of batch) {
          try {
            // Verwende die private importCard Methode über einen Workaround
            // Da sie private ist, müssen wir die Logik duplizieren
            const imageUrl = apiCard.card_images?.[0]?.image_url || null;
            const imageSmall = apiCard.card_images?.[0]?.image_url_small || null;
            const passcode = apiCard.id.toString();

            let banlistInfo: string | null = null;
            if (apiCard.banlist_info) {
              if (typeof apiCard.banlist_info === "string") {
                banlistInfo = apiCard.banlist_info;
              } else if (typeof apiCard.banlist_info === "object") {
                banlistInfo = JSON.stringify(apiCard.banlist_info);
              }
            }

            const cardData = {
              id: passcode,
              name: apiCard.name,
              nameLower: apiCard.name.toLowerCase(),
              type: apiCard.type,
              typeLower: apiCard.type.toLowerCase(),
              race: apiCard.race || null,
              raceLower: apiCard.race ? apiCard.race.toLowerCase() : null,
              attribute: apiCard.attribute || null,
              level: apiCard.level ?? null,
              atk: apiCard.atk ?? null,
              def: apiCard.def ?? null,
              desc: apiCard.desc || null,
              archetype: apiCard.archetype || null,
              archetypeLower: apiCard.archetype ? apiCard.archetype.toLowerCase() : null,
              banlistInfo,
              imageUrl,
              imageSmall,
              passcode,
            };

            await prisma.card.create({
              data: cardData,
            });

            importStats.created++;
          } catch (error) {
            console.error(`Error importing card ${apiCard.name} (ID: ${apiCard.id}):`, error);
            importStats.skipped++;
            importStats.errors++;
          }
        }

        const percentage = Math.round(((i + batch.length) / missingCards.length) * 100);
        process.stdout.write(`\rProgress: ${i + batch.length}/${missingCards.length} (${percentage}%)`);
      }
      console.log("\n");
    } else {
      console.log("Step 4: No missing cards to import\n");
    }

    // Schritt 5: Fülle fehlende normalisierte Felder bei bestehenden Karten auf
    console.log("Step 5: Backfilling missing normalized fields...");
    const cardsNeedingUpdate = existingCards.filter(
      (card) =>
        !card.nameLower ||
        !card.typeLower ||
        (card.race !== null && !card.raceLower) ||
        (card.archetype !== null && !card.archetypeLower)
    );

    if (cardsNeedingUpdate.length > 0) {
      console.log(`Found ${cardsNeedingUpdate.length} cards needing normalized field updates`);

      const batchSize = 100;
      let updated = 0;

      for (let i = 0; i < cardsNeedingUpdate.length; i += batchSize) {
        const batch = cardsNeedingUpdate.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (card) => {
            const updateData: {
              nameLower?: string;
              typeLower?: string;
              raceLower?: string | null;
              archetypeLower?: string | null;
            } = {};

            if (!card.nameLower && card.name) {
              updateData.nameLower = card.name.toLowerCase();
            }
            if (!card.typeLower && card.type) {
              updateData.typeLower = card.type.toLowerCase();
            }
            if (card.race && !card.raceLower) {
              updateData.raceLower = card.race.toLowerCase();
            } else if (!card.race) {
              updateData.raceLower = null;
            }
            if (card.archetype && !card.archetypeLower) {
              updateData.archetypeLower = card.archetype.toLowerCase();
            } else if (!card.archetype) {
              updateData.archetypeLower = null;
            }

            if (Object.keys(updateData).length > 0) {
              await prisma.card.update({
                where: { id: card.id },
                data: updateData,
              });
              updated++;
            }
          })
        );

        process.stdout.write(`\rProgress: ${Math.min(i + batchSize, cardsNeedingUpdate.length)}/${cardsNeedingUpdate.length}`);
      }

      console.log(`\nUpdated ${updated} cards with normalized fields\n`);
    } else {
      console.log("All existing cards already have normalized fields\n");
    }

    // Zusammenfassung
    console.log("=".repeat(50));
    console.log("Sync completed!");
    console.log("=".repeat(50));
    console.log(`Total cards in database: ${existingCards.length + importStats.created}`);
    console.log(`New cards imported: ${importStats.created}`);
    console.log(`Cards skipped (errors): ${importStats.skipped}`);
    console.log(`Cards with normalized fields updated: ${cardsNeedingUpdate.length > 0 ? cardsNeedingUpdate.length : 0}`);
    console.log("=".repeat(50));

    process.exit(0);
  } catch (error) {
    console.error("\n\nSync failed:", error);
    process.exit(1);
  }
}

main();

