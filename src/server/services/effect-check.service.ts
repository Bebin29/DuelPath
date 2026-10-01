import { prisma } from '@/lib/prisma/client';
import { decide, type NoulQuestion } from '@/server/jev';
import type { ParsedEffects } from '@/lib/cards/effects';

/**
 * Jev prüft, ob die heuristische Effektzerlegung plausibel ist, und speichert die Bewertung
 * in `Card.effectsJev`. Zur manuellen Prüfung gehören Karten mit `effectsReview` (Parser)
 * oder `effectsJev < JEV_REVIEW_THRESHOLD`.
 *
 * Schwelle aus einem Test mit 20 Karten und absichtlich verfälschten Zerlegungen:
 * korrekt im Schnitt 0,66, zusammengelegt 0,25, zerteilt 0,08.
 */
export const JEV_REVIEW_THRESHOLD = 0.3;

const SPLIT_QUESTION = {
  type: 'noul',
  instructions:
    'The card text is split into a list of effects. Is every separate effect of the card its own list entry, with no two effects merged into one entry and no single effect cut into several entries? Bullet points (●) that are options of one effect belong to that effect.',
  criteria: {
    true: 'Each list entry is exactly one complete effect of the card text.',
    false: 'At least one entry contains two effects, or one effect is cut into several entries.',
  },
} as const satisfies NoulQuestion;

export async function checkEffectSplits({
  all = false,
  concurrency = 8,
  onProgress,
}: {
  /** auch bereits bewertete Karten neu prüfen (nach Parser-Änderungen oder Errata) */
  all?: boolean;
  concurrency?: number;
  onProgress?: (done: number, total: number, cost: number) => void;
} = {}) {
  // ponytail: ein Neuimport behält alte Bewertungen; nach Parser-Änderungen mit all=true neu prüfen
  const cards = await prisma.card.findMany({
    where: { desc: { not: null }, ...(all ? {} : { effectsJev: null }) },
    select: { id: true, name: true, desc: true, effects: true },
  });
  const todo = cards.filter((c) => (c.effects as unknown as ParsedEffects)?.effects?.length > 0);

  let cost = 0;
  let done = 0;
  for (let i = 0; i < todo.length; i += concurrency) {
    await Promise.all(
      todo.slice(i, i + concurrency).map(async (card) => {
        const effects = (card.effects as unknown as ParsedEffects).effects.map((e) => e.text);
        const decision = await decide(
          { card: card.name, text: card.desc, effects },
          { split_ok: SPLIT_QUESTION }
        );
        cost += decision.cost;
        await prisma.card.update({
          where: { id: card.id },
          data: { effectsJev: decision.answers.split_ok.noul },
        });
        onProgress?.(++done, todo.length, cost);
      })
    );
  }

  const flagged = await prisma.card.count({
    where: { OR: [{ effectsReview: true }, { effectsJev: { lt: JEV_REVIEW_THRESHOLD } }] },
  });
  return { checked: todo.length, cost, flagged };
}
