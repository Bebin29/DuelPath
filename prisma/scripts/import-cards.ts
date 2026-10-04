import { importCards } from '@/server/services/card-import.service';

/**
 * Importiert alle TCG- und OCG-Karten von YGOPRODeck
 *
 * Usage: npm run cards:import
 */
async function main() {
  console.log('Lade Karten von YGOPRODeck (englisch und deutsch)...');

  const stats = await importCards((done, total) => {
    process.stdout.write(`\rGespeichert: ${done}/${total}`);
  });

  console.log('\n\nImport abgeschlossen.');
  console.log(`Abgerufen:           ${stats.fetched}`);
  console.log(`Importiert:          ${stats.imported}`);
  console.log(`davon nur OCG:       ${stats.ocgOnly}`);
  console.log(`Übersprungen:        ${stats.skipped}`);
  console.log(`Zerlegung prüfen:    ${stats.needsReview}`);
  console.log(
    `Daten abgerufen:     ${stats.importedAt.toISOString()} (kein Banlist-Gültigkeitsdatum)`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nImport fehlgeschlagen:', error);
    process.exit(1);
  });
