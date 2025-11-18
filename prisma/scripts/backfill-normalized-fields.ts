import { prisma } from "@/lib/prisma/client";

/**
 * Backfill-Script für normalisierte Suchfelder (typeLower, raceLower, archetypeLower)
 * 
 * Füllt die normalisierten Felder für alle bestehenden Karten
 * Usage: tsx prisma/scripts/backfill-normalized-fields.ts
 */
async function main() {
  console.log("Starting normalized fields backfill...");
  
  try {
    // Hole alle Karten
    const cards = await prisma.card.findMany({
      select: {
        id: true,
        type: true,
        race: true,
        archetype: true,
        typeLower: true,
        raceLower: true,
        archetypeLower: true,
      },
    });

    console.log(`Found ${cards.length} cards to check`);

    // Filtere Karten die Updates benötigen
    const cardsToUpdate = cards.filter(
      (card) =>
        !card.typeLower ||
        (card.race && !card.raceLower) ||
        (card.archetype && !card.archetypeLower)
    );

    console.log(`Found ${cardsToUpdate.length} cards that need updates`);

    // Update in Batches
    const batchSize = 100;
    let updated = 0;

    for (let i = 0; i < cardsToUpdate.length; i += batchSize) {
      const batch = cardsToUpdate.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map((card) => {
          const updateData: {
            typeLower?: string;
            raceLower?: string | null;
            archetypeLower?: string | null;
          } = {};

          if (!card.typeLower) {
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

          return prisma.card.update({
            where: { id: card.id },
            data: updateData,
          });
        })
      );

      updated += batch.length;
      process.stdout.write(`\rProgress: ${updated}/${cardsToUpdate.length}`);
    }

    console.log("\n\nBackfill completed!");
    console.log(`Updated ${updated} cards`);
    
    process.exit(0);
  } catch (error) {
    console.error("\n\nBackfill failed:", error);
    process.exit(1);
  }
}

main();



