'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';

export interface PaletteIndex {
  combos: { id: string; title: string; deckName: string | null }[];
  decks: { id: string; name: string }[];
}

/** Combos und Decks für die Befehlspalette (UI-Plan 7.4.3); klein genug, um einmal zu laden */
export async function paletteIndex(): Promise<PaletteIndex> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { combos: [], decks: [] };
  const [combos, decks] = await Promise.all([
    prisma.combo.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, deck: { select: { name: true } } },
    }),
    prisma.deck.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, name: true },
    }),
  ]);
  return {
    combos: combos.map((c) => ({ id: c.id, title: c.title, deckName: c.deck?.name ?? null })),
    decks,
  };
}
