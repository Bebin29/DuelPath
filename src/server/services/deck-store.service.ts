import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import type { Section } from '@/lib/deck/deck-rules';

/**
 * Deckinhalt schreiben: Karten-IDs je Abschnitt, höchstens drei Kopien je Karte. Ersetzt den
 * bisherigen Inhalt. YDK-Import im Browser und REST-API nutzen denselben Weg.
 */
export async function writeDeckCards(
  deckId: string,
  sections: Record<Section, string[]>
): Promise<{ imported: number }> {
  const rows: Prisma.DeckCardCreateManyInput[] = [];
  for (const [deckSection, cardIds] of Object.entries(sections)) {
    const counts = new Map<string, number>();
    for (const id of cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    for (const [cardId, count] of counts)
      rows.push({ deckId, cardId, deckSection, quantity: Math.min(count, 3) });
  }
  await prisma.$transaction([
    prisma.deckCard.deleteMany({ where: { deckId } }),
    prisma.deckCard.createMany({ data: rows }),
    prisma.deck.update({ where: { id: deckId }, data: { updatedAt: new Date() } }),
  ]);
  return { imported: rows.reduce((sum, r) => sum + (r.quantity ?? 1), 0) };
}

/** Passcodes zu Karten-IDs; manche Programme schreiben Passcodes mit führenden Nullen */
export async function idsForPasscodes(passcodes: string[]) {
  const normalize = (p: string) => String(Number(p));
  const all = [...new Set(passcodes.map(normalize))];
  const cards = await prisma.card.findMany({
    where: { passcode: { in: all } },
    select: { id: true, passcode: true },
  });
  const byPasscode = new Map(cards.map((c) => [c.passcode, c.id]));
  return {
    map: (list: string[]) =>
      list.map(normalize).flatMap((p) => (byPasscode.has(p) ? [byPasscode.get(p)!] : [])),
    missing: all.filter((p) => !byPasscode.has(p)),
  };
}
