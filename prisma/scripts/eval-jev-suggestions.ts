import { prisma } from '@/lib/prisma/client';
import type { ParsedEffects } from '@/lib/cards/effects';
import { initialState, spellSpeedOf, type CardData } from '@/lib/combo/state';
import { candidateEffects, toSuggestionInput } from '@/lib/combo/suggestions';
import { rateCandidates } from '@/server/services/suggestion.service';
import { CASES } from './jev-suggestion-cases';

/**
 * Misst die komplette Vorschlags-Pipeline (Vorfilter, dann Jev) am Testset
 * und zeigt, bei welcher Schwelle die Vorschläge taugen.
 *
 * Usage: npm run jev:eval
 */
const THRESHOLDS = [0.5, 0.6, 0.7, 0.8, 0.9];

async function main() {
  const names = [
    ...new Set(
      CASES.flatMap((c) => [
        c.ask.name,
        ...c.board.map((b) => b.name),
        ...(c.chain ?? []).map((l) => l.name),
      ])
    ),
  ];
  const rows = await prisma.card.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true, type: true, race: true, effects: true },
  });
  const cards = new Map<string, CardData>(
    rows.map((r) => [
      r.id,
      { ...r, effects: (r.effects as unknown as ParsedEffects).effects ?? [] },
    ])
  );
  const byName = new Map([...cards.values()].map((c) => [c.name, c]));
  const missing = names.filter((n) => !byName.has(n));
  if (missing.length) throw new Error(`Karten fehlen in der Datenbank: ${missing.join(', ')}`);

  const results: { label: string; expected: boolean; p: number; filtered: boolean }[] = [];
  let cost = 0;
  for (const c of CASES) {
    const asked = byName.get(c.ask.name)!;
    const state = initialState({
      cards: [...c.board, c.ask].map((b, i) => ({
        instanceId: `i${i}`,
        cardId: byName.get(b.name)!.id,
        owner: b.player,
        zone: b.zone,
        position: b.position,
      })),
    });
    state.chain = (c.chain ?? []).map((l, i) => {
      const card = byName.get(l.name)!;
      return {
        nodeId: `chain${i}`,
        player: l.player,
        cardId: card.id,
        effectIndex: 0,
        spellSpeed: spellSpeedOf(card, 0, card.effects[0]),
        cardActivation: false,
        optKeys: [],
      };
    });

    // Wie im Editor: erst der Vorfilter, dann Jev für die übrigen Kandidaten
    const candidates = candidateEffects(state, c.ask.player, cards).filter(
      (k) => k.cardId === asked.id && k.instanceId === `i${c.board.length}`
    );
    if (candidates.length === 0) {
      results.push({ label: c.label, expected: c.expected, p: 0, filtered: true });
      continue;
    }
    const rating = await rateCandidates(toSuggestionInput(state, candidates.slice(0, 1)));
    cost += rating.cost;
    results.push({
      label: c.label,
      expected: c.expected,
      p: rating.probabilities[0],
      filtered: false,
    });
  }

  for (const r of results) {
    const source = r.filtered ? 'Vorfilter' : 'Jev';
    console.log(
      `${r.expected ? 'JA  ' : 'NEIN'}  ${r.p.toFixed(2)}  ${source.padEnd(9)}  ${r.label}`
    );
  }
  console.log('\nSchwelle  Genauigkeit  Präzision  Trefferquote');
  for (const t of THRESHOLDS) {
    const tp = results.filter((r) => r.p >= t && r.expected).length;
    const fp = results.filter((r) => r.p >= t && !r.expected).length;
    const fn = results.filter((r) => r.p < t && r.expected).length;
    const accuracy = results.filter((r) => r.p >= t === r.expected).length / results.length;
    const precision = tp + fp ? tp / (tp + fp) : 1;
    const recall = tp + fn ? tp / (tp + fn) : 1;
    console.log(
      `${t.toFixed(1)}       ${pct(accuracy)}         ${pct(precision)}       ${pct(recall)}`
    );
  }
  console.log(`\nKosten: $${cost.toFixed(5)} (Cache-Treffer kosten nichts)`);
}

const pct = (x: number) => `${Math.round(x * 100)} %`.padStart(5);

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
