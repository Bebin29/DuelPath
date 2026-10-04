'use server';

import { auth } from '@/lib/auth/auth';
import { lineThrough } from '@/lib/combo/lines';
import { stopsLine, stressWords, type StressWord } from '@/lib/combo/start-words';
import { comboContext, stressView } from '@/server/api/combo-api';

/** Daten der Startseite (UI-Plan 7.5.1), die über die Bibliothek hinausgehen */

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Stresstest der Hauptline für die Startseite: wo welcher Staple die Line stoppt. Leer, wenn es
 * nichts Belastbares zu sagen gibt: ohne Schritte, oder wenn die Hauptline schon eine
 * Unterbrechung enthält (dann prüft der Stresstest nicht weiter, alles wäre fälschlich „gar nicht“).
 */
export async function startStress(comboId: string): Promise<StressWord[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  const ctx = await comboContext(userId, comboId);
  const line = lineThrough(ctx.combo.nodes, null);
  if (!line.length || line.some((n) => n.kind === 'ACTIVATE' && n.player === 'opponent')) {
    return [];
  }
  const stoppers = ctx.staples.filter((s) => stopsLine(s.staple)).map((s) => s.staple.short);
  return stressWords(
    stoppers,
    stressView(ctx, null, false)
      .filter((h) => h.short && stoppers.includes(h.short) && stopsLine({ hits: [h.pattern] }))
      .map((h) => ({ word: h.short ?? h.staple, step: h.step }))
  );
}
