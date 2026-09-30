import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import { effectsOf } from '@/lib/cards/effect-override';
import type { CardData } from '@/lib/combo/state';
import { jevRequest, type SuggestionInput } from '@/lib/combo/suggestions';
import { decide, jevModel } from '@/server/jev';

/**
 * Bewertet Effekt-Kandidaten mit Jev: Wahrscheinlichkeit je Kandidat, dass die Aktivierung jetzt legal ist.
 * Identische Anfragen (Modell, Zustand, Fragen) kommen aus dem Cache und kosten nichts.
 */
export async function rateCandidates(
  input: SuggestionInput
): Promise<{ probabilities: number[]; cached: boolean; cost: number }> {
  if (input.candidates.length === 0) return { probabilities: [], cached: true, cost: 0 };

  const cardIds = new Set([
    ...input.board.map((b) => b.cardId),
    ...input.candidates.map((c) => c.cardId),
    ...input.chain.flatMap((l) => (l.cardId ? [l.cardId] : [])),
  ]);
  const rows = await prisma.card.findMany({
    where: { id: { in: [...cardIds] } },
    select: { id: true, name: true, type: true, race: true, effects: true, effectsOverride: true },
  });
  const cards = new Map<string, CardData>(rows.map((r) => [r.id, { ...r, effects: effectsOf(r) }]));

  const request = jevRequest(input, cards);
  const key = createHash('sha256')
    .update(JSON.stringify({ model: jevModel(), ...request }))
    .digest('hex');

  const hit = await prisma.jevCache.findUnique({ where: { key } });
  let answers = hit?.answers as Record<string, { noul?: number }> | undefined;
  let cost = 0;
  if (!answers) {
    const decision = await decide(request.state, request.questions);
    answers = decision.answers;
    cost = decision.cost;
    await prisma.jevCache.upsert({
      where: { key },
      create: { key, answers: answers as Prisma.InputJsonValue },
      update: {},
    });
  }

  return {
    probabilities: input.candidates.map((_, i) => answers[`c${i}`]?.noul ?? 0),
    cached: !!hit,
    cost,
  };
}
