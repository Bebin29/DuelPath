import { CardImportService } from "@/server/services/card-import.service";

/**
 * CLI-Script für initialen Batch-Import aller Karten
 * 
 * Usage: tsx prisma/scripts/import-cards.ts
 */
async function main() {
  console.log("Starting card import from YGOPRODeck API...");
  
  const importService = new CardImportService();
  
  try {
    const stats = await importService.importCardsInBatches(100, (current, total) => {
      const percentage = Math.round((current / total) * 100);
      process.stdout.write(`\rProgress: ${current}/${total} (${percentage}%)`);
    });
    
    console.log("\n\nImport completed!");
    console.log(`Total cards: ${stats.total}`);
    console.log(`Created: ${stats.created}`);
    console.log(`Updated: ${stats.updated}`);
    console.log(`Skipped/Errors: ${stats.skipped}`);
    
    process.exit(0);
  } catch (error) {
    console.error("\n\nImport failed:", error);
    process.exit(1);
  }
}

main();

