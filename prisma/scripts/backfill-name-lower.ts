import { prisma } from '@/lib/prisma/client';

/**
 * Backfill-Script für nameLower Spalte
 *
 * Füllt die nameLower Spalte für alle bestehenden Karten
 * Usage: tsx prisma/scripts/backfill-name-lower.ts
 */
async function main() {
  console.log('Starting nameLower backfill...');

  try {
    // Hole alle Karten ohne nameLower
    const cards = await prisma.card.findMany({
      where: {
        OR: [{ nameLower: null }, { nameLower: '' }],
      },
      select: {
        id: true,
        name: true,
      },
    });

    console.log(`Found ${cards.length} cards to update`);

    // Update in Batches
    const batchSize = 100;
    let updated = 0;

    for (let i = 0; i < cards.length; i += batchSize) {
      const batch = cards.slice(i, i + batchSize);

      await Promise.all(
        batch.map((card) =>
          prisma.card.update({
            where: { id: card.id },
            data: { nameLower: card.name.toLowerCase() },
          })
        )
      );

      updated += batch.length;
      process.stdout.write(`\rProgress: ${updated}/${cards.length}`);
    }

    console.log('\n\nBackfill completed!');
    console.log(`Updated ${updated} cards`);

    process.exit(0);
  } catch (error) {
    console.error('\n\nBackfill failed:', error);
    process.exit(1);
  }
}

main();
