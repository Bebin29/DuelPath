import { checkEffectSplits, JEV_REVIEW_THRESHOLD } from '@/server/services/effect-check.service';

/**
 * Lässt Jev die Effektzerlegung aller noch nicht bewerteten Karten prüfen
 *
 * Usage: npm run cards:check-effects [-- --all]
 */
async function main() {
  const all = process.argv.includes('--all');
  console.log(`Prüfe Effektzerlegung mit Jev${all ? ' (alle Karten)' : ''}...`);

  const stats = await checkEffectSplits({
    all,
    onProgress: (done, total, cost) =>
      process.stdout.write(`\rGeprüft: ${done}/${total}  Kosten: $${cost.toFixed(4)}`),
  });

  console.log('\n\nPrüfung abgeschlossen.');
  console.log(`Geprüft:                          ${stats.checked}`);
  console.log(`Kosten:                           $${stats.cost.toFixed(4)}`);
  console.log(`Zur Prüfung (Parser oder < ${JEV_REVIEW_THRESHOLD}):  ${stats.flagged}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\nPrüfung fehlgeschlagen:', error);
    process.exit(1);
  });
