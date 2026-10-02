/**
 * Exakte Wahrscheinlichkeiten für Starthände (Deckbau-Plan 3.2, 3.3): hypergeometrisch über
 * Klassen von Karten, jede Hand als Multimenge aufgezählt. Kein Zufall, keine springenden Zahlen.
 */

// Binomialkoeffizienten bis 64, reicht für 60 Karten plus eine Kopie im Was-wäre-wenn
const MAX_N = 64;
const BINOM: number[][] = [];
for (let n = 0; n <= MAX_N; n++) {
  BINOM[n] = [1];
  for (let k = 1; k <= n; k++) BINOM[n][k] = BINOM[n - 1][k - 1] + (BINOM[n - 1][k] ?? 0);
}
export const binom = (n: number, k: number) =>
  k < 0 || n < 0 || k > n ? 0 : n <= MAX_N ? BINOM[n][k] : 0;

/**
 * Wahrscheinlichkeit je Bedingung, dass eine Hand der Größe `size` sie erfüllt. `counts` teilt das
 * Deck vollständig in Klassen auf; jede Bedingung bekommt, wie viele Karten je Klasse gezogen wurden.
 */
export function handOdds(
  counts: number[],
  size: number,
  tests: ((drawn: number[]) => boolean)[]
): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  const n = Math.min(size, total);
  const result = tests.map(() => 0);
  if (n === 0) return result;
  const drawn = counts.map(() => 0);
  const visit = (i: number, left: number, weight: number) => {
    if (i === counts.length - 1) {
      if (left > counts[i]) return;
      drawn[i] = left;
      const w = weight * binom(counts[i], left);
      tests.forEach((test, t) => {
        if (test(drawn)) result[t] += w;
      });
      return;
    }
    for (let k = 0; k <= Math.min(left, counts[i]); k++) {
      drawn[i] = k;
      visit(i + 1, left - k, weight * binom(counts[i], k));
    }
  };
  visit(0, n, 1);
  const all = binom(total, n);
  return result.map((r) => r / all);
}

/** Wahrscheinlichkeit, mindestens `k` von `hits` Karten in `size` aus `total` zu ziehen */
export const atLeast = (total: number, hits: number, size: number, k = 1) =>
  handOdds([hits, total - hits], size, [(d) => d[0] >= k])[0];

export interface CoverageOdds {
  /** Anteil der Hände mit mindestens einer gespeicherten Line */
  base: number;
  /** Abdeckung mit einer Kopie mehr bzw. weniger; fehlt, wenn die Änderung nicht geht */
  card: Map<string, { plus?: number; minus?: number }>;
  /** dasselbe für jede Karte, die in keiner Starthand steht (alle gleich) */
  rest: { plus?: number; minus?: number };
}

/**
 * Exakte Abdeckung durch die eigenen Combos samt Grenznutzen je Karte. Karten außerhalb aller
 * Starthände sind dafür gleichwertig und bilden eine Klasse; aufgezählt werden nur die Teilhände
 * aus Starthand-Karten, einmal für alle Was-wäre-wenn-Fälle.
 *
 * ponytail: Aufwand wächst mit der Zahl verschiedener Starthand-Karten (bei 25 und 6 Karten rund
 * 700.000 Teilhände pro Fall); bei mehr zuerst die Teilhände nach Summe gruppieren.
 */
export function coverageOdds(
  counts: Map<string, number>,
  combos: string[][],
  size: number
): CoverageOdds {
  const empty: CoverageOdds = { base: 0, card: new Map(), rest: {} };
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  // Ein Fall mit einer Karte weniger muss noch eine volle Hand hergeben
  if (total <= size) return empty;

  const needs = combos
    .filter((c) => c.length > 0 && c.length <= size)
    .map((c) => {
      const need = new Map<string, number>();
      for (const id of c) need.set(id, (need.get(id) ?? 0) + 1);
      return need;
    })
    .filter((need) => [...need.values()].every((n) => n <= 3));
  if (needs.length === 0) return empty;

  const ids = [...new Set(needs.flatMap((need) => [...need.keys()]))];
  const index = new Map(ids.map((id, i) => [id, i]));
  const have = ids.map((id) => counts.get(id) ?? 0);
  const caps = have.map((c) => Math.min(c + 1, size));
  const req = needs.map((need) => [...need].map(([id, n]) => [index.get(id)!, n] as const));

  // Teilhände über die Starthand-Karten, die eine Line erlauben; der Rest kommt aus der Klasse
  const covered: number[][] = [];
  const drawn = ids.map(() => 0);
  const visit = (i: number, left: number) => {
    if (i === ids.length) {
      if (req.some((r) => r.every(([j, n]) => drawn[j] >= n))) covered.push([...drawn]);
      return;
    }
    for (let k = 0; k <= Math.min(left, caps[i]); k++) {
      drawn[i] = k;
      visit(i + 1, left - k);
    }
    drawn[i] = 0;
  };
  visit(0, size);
  const sums = covered.map((v) => v.reduce((a, b) => a + b, 0));

  const rest = total - have.reduce((a, b) => a + b, 0);
  const odds = (c: number[], other: number) => {
    const all = binom(other + c.reduce((a, b) => a + b, 0), size);
    let p = 0;
    covered.forEach((v, h) => {
      let w = binom(other, size - sums[h]);
      for (let i = 0; i < v.length && w; i++) w *= binom(c[i], v[i]);
      p += w;
    });
    return p / all;
  };
  const shifted = (i: number, d: number) => have.map((c, j) => (j === i ? c + d : c));

  const card = new Map<string, { plus?: number; minus?: number }>();
  ids.forEach((id, i) => {
    if (!counts.has(id)) return;
    card.set(id, {
      ...(have[i] < 3 && { plus: odds(shifted(i, 1), rest) }),
      ...(have[i] > 0 && { minus: odds(shifted(i, -1), rest) }),
    });
  });
  return {
    base: odds(have, rest),
    card,
    rest: { plus: odds(have, rest + 1), ...(rest > 0 && { minus: odds(have, rest - 1) }) },
  };
}
