import { importTcgCards } from '@/server/services/card-import.service';

/**
 * Importiert alle TCG-Karten von YGOPRODeck
 *
 * Usage: npm run cards:import
 */
async function main() {
  console.log('Lade Karten von YGOPRODeck (englisch und deutsch)...');

  const stats = await importTcgCards((done, total) => {
    process.stdout.write(`\rGespeichert: ${done}/${total}`);
  });

  console.log('\n\nImport abgeschlossen.');
  console.log(`Abgerufen:           ${stats.fetched}`);
  console.log(`Importiert (TCG):    ${stats.imported}`);
  console.log(`Übersprungen (OCG):  ${stats.skippedNonTcg}`);
  console.log(`Zerlegung prüfen:    ${stats.needsReview}`);
  console.log(`Banlist Stand:       ${stats.banlistDate.toLocaleDateString('de-DE')}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nImport fehlgeschlagen:', error);
    process.exit(1);
  });
