'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';
import { gameInputSchema, parseGame, type DeckGame } from '@/lib/deck/games';

/**
 * Spielprotokoll am Deck (Deckbau-Plan 3.7). Eigene Aktionen statt des Autosaves der Deckseite:
 * ein Eintrag ist kein Bearbeiten der Liste und darf von Strg+Z und vom Zurückholen einer
 * Version nicht angefasst werden. Anlegen und löschen, kein Bearbeiten.
 */

type Result<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

async function userId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function addDeckGame(
  deckId: string,
  input: unknown
): Promise<Result<DeckGame>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  const deck = await prisma.deck.findUnique({ where: { id: deckId }, select: { userId: true } });
  if (!deck || deck.userId !== uid) return { error: 'Not found' };
  const parsed = gameInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Ungültiger Eintrag' };
  const row = await prisma.deckGame.create({ data: { deckId, ...parsed.data } });
  const game = parseGame(row);
  return game ? { data: game } : { error: 'Ungültiger Eintrag' };
}

export async function deleteDeckGame(gameId: string): Promise<Result<true>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  const game = await prisma.deckGame.findUnique({
    where: { id: gameId },
    select: { deck: { select: { userId: true } } },
  });
  if (!game || game.deck.userId !== uid) return { error: 'Not found' };
  await prisma.deckGame.delete({ where: { id: gameId } });
  return { data: true };
}
