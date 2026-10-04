'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';
import { lineThrough } from '@/lib/combo/lines';
import { parseStatus, type ComboStatus } from '@/lib/combo/library';
import { headlineWords, type StressWord } from '@/lib/combo/start-words';
import { record, type Tally } from '@/lib/deck/games';
import { comboContext, stressView } from '@/server/api/combo-api';

/** Daten der Startseite (UI-Plan 7.5.1), die über die Bibliothek hinausgehen */

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Stresstest der Hauptline für die Startseite: wo welcher Staple die Line stoppt (headlineWords) */
export async function startStress(comboId: string): Promise<StressWord[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  // Die Antwort ist Schmuck der Headline: scheitert die Simulation, bleibt die Startseite stehen
  // und zeigt die allgemeinen Wörter; der Fehler landet im Log statt auf einer Fehlerseite
  try {
    const ctx = await comboContext(userId, comboId);
    return headlineWords(
      lineThrough(ctx.combo.nodes, null),
      ctx.staples.map((s) => s.staple),
      stressView(ctx, null, false)
    );
  } catch (error) {
    console.error('startStress', comboId, error);
    return [];
  }
}

/** Ein Deck am Tisch: seine Combos auf dem Weg zum Turnier und die Bilanz aus dem Spielprotokoll */
export interface TableRow {
  id: string;
  name: string;
  combos: { id: string; title: string; status: ComboStatus }[];
  record: Tally;
}

const TABLE_DECKS = 4;

/**
 * Die zuletzt bearbeiteten Decks für „Dein Tisch“. Ohne Parameter: eine Server-Action ist ein
 * öffentlicher Endpunkt, eine Anzahl käme dort ungeprüft vom Client.
 */
export async function startTable(): Promise<TableRow[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const decks = await prisma.deck.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: TABLE_DECKS,
    select: {
      id: true,
      name: true,
      combos: { select: { id: true, title: true, status: true }, orderBy: { createdAt: 'asc' } },
      games: { select: { result: true } },
    },
  });
  return decks.map((d) => ({
    id: d.id,
    name: d.name,
    combos: d.combos.map((c) => ({ ...c, status: parseStatus(c.status) })),
    record: record(d.games.map((g) => g.result)),
  }));
}
