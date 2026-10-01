/**
 * Hand-Tester (UX-Plan 7.3): Hände aus dem Main Deck ziehen, passende Combos finden und die
 * Abdeckung über viele simulierte Hände schätzen. Karten sind Passcodes, je Kopie ein Eintrag.
 */

export interface DeckCount {
  cardId: string;
  quantity: number;
}

export interface ComboStarter {
  id: string;
  /** Passcodes der Starthand, Kopien mehrfach */
  startHand: string[];
}

export const HAND_SIZE = { first: 5, second: 6 } as const;
export const COVERAGE_RUNS = 2000;

/** Main Deck als Liste einzelner Kopien */
export function expandDeck(entries: DeckCount[]): string[] {
  return entries.flatMap((e) => Array<string>(Math.max(0, e.quantity)).fill(e.cardId));
}

/** Zieht ohne Zurücklegen (partielles Fisher-Yates) */
export function drawHand(pool: string[], size: number, random: () => number = Math.random) {
  const deck = [...pool];
  const n = Math.min(size, deck.length);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(random() * (deck.length - i));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, n);
}

/** Enthält die Hand die Starthand, Kopien mitgezählt? */
export function containsHand(hand: string[], starter: string[]): boolean {
  if (starter.length === 0) return false;
  const left = new Map<string, number>();
  for (const id of hand) left.set(id, (left.get(id) ?? 0) + 1);
  for (const id of starter) {
    const n = left.get(id) ?? 0;
    if (n === 0) return false;
    left.set(id, n - 1);
  }
  return true;
}

export function matchingCombos<T extends ComboStarter>(hand: string[], combos: T[]): T[] {
  return combos.filter((c) => containsHand(hand, c.startHand));
}

/**
 * Wiederholbarer Zufall (LCG): gleiche Abdeckung auf Server und im Browser und bei jedem Rendern,
 * damit die Zahl nicht springt, solange sich das Deck nicht ändert.
 */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Anteil der Hände, für die es mindestens eine gespeicherte Line gibt */
export function coverage(
  pool: string[],
  combos: ComboStarter[],
  size: number,
  runs = COVERAGE_RUNS,
  random: () => number = Math.random
): number {
  const usable = combos.filter((c) => c.startHand.length > 0 && c.startHand.length <= size);
  if (pool.length === 0 || usable.length === 0) return 0;
  let hits = 0;
  for (let i = 0; i < runs; i++) {
    const hand = drawHand(pool, size, random);
    if (usable.some((c) => containsHand(hand, c.startHand))) hits++;
  }
  return hits / runs;
}

export type HandRole = 'starter' | 'handtrap' | 'extender';

/**
 * Rolle jeder Karte der Hand: Teil einer passenden Starthand, sonst Handtrap (aus der Staple-Liste)
 * oder möglicher Extender. Pro Kopie genau eine Rolle.
 */
export function handRoles(
  hand: string[],
  matched: ComboStarter[],
  handtraps: Set<string>
): HandRole[] {
  const starter = new Map<string, number>();
  for (const c of matched) {
    const counts = new Map<string, number>();
    for (const id of c.startHand) counts.set(id, (counts.get(id) ?? 0) + 1);
    for (const [id, n] of counts) starter.set(id, Math.max(starter.get(id) ?? 0, n));
  }
  return hand.map((id) => {
    const n = starter.get(id) ?? 0;
    if (n > 0) {
      starter.set(id, n - 1);
      return 'starter';
    }
    return handtraps.has(id) ? 'handtrap' : 'extender';
  });
}

/** Titelvorschlag wie „Aluber 2-Card“ (UX-Plan 7.1) */
export function suggestTitle(names: string[]): string {
  if (names.length === 0) return '';
  const short = names[0].split(/,| the | of | & /)[0].trim();
  return `${short} ${names.length}-Card`;
}
