import { endboardSummary, fieldCardIds, lineEnds, missingFrom } from '@/lib/combo/endboard';
import { initialState, statesForTree } from '@/lib/combo/state';
import type { CardData, ComboNodeData, StartState } from '@/lib/combo/state';
import { visibleSteps } from '@/lib/combo/summary';
import type { ComboCard } from '@/lib/combo/cards';
import type { DeckEntry } from '@/lib/combo/deck';
import { containsHand, drawHand } from './hand-tester';

/**
 * Übungsmodus (UX-Plan 7.3, Lücke L2): eine Zufallshand ziehen, die Line selbst an der Werkbank
 * spielen und danach gegen die gespeicherte Line messen. Hier steht nur die Rechnung; gezogen wird
 * mit demselben Weg wie im Hand-Tester, verglichen wie beim Endboard-Vergleich der Branches.
 */

/** Eine gespeicherte Line als Vorbild: was sie aus der Hand braucht und wo sie endet */
export interface PracticeTarget {
  comboId: string;
  title: string;
  /** Passcodes, die die Line aus der Starthand einsetzt; Kopien mehrfach */
  startHand: string[];
  /** Unterbrechungen am besten bekannten Ende der Combo */
  interruptions: number;
  /** Eigene Karten auf dem Feld an diesem Ende, Kopien mehrfach */
  field: string[];
  /** Sichtbare Schritte bis dorthin */
  steps: number;
}

/** Ein Ende einer gespeicherten Line */
export interface LineOutcome {
  interruptions: number;
  /** Eigene Karten auf dem Feld, Kopien mehrfach */
  field: string[];
  steps: number;
}

/**
 * Bestes bekanntes Ende einer Combo: das Line-Ende mit den meisten Unterbrechungen. Bei
 * Gleichstand gewinnt die Hauptline, die in `lineEnds` zuerst steht. Ein Branch endet oft kurz
 * nach einer Unterbrechung des Gegners und kommt dann auf dieselbe Zahl, obwohl fast alles davon
 * noch auf der Hand liegt; als Vorbild zum Üben taugt er damit nicht.
 */
export function bestKnownEnd(
  startState: StartState,
  nodes: ComboNodeData[],
  cards: Map<string, CardData>
): LineOutcome | null {
  const ends = lineEnds(nodes);
  if (ends.length === 0) return null;
  const states = statesForTree(nodes, startState, cards);
  const start = initialState(startState);
  let best: LineOutcome | null = null;
  for (const { leaf } of ends) {
    const state = states.get(leaf.id);
    if (!state) continue;
    const { interruptions } = endboardSummary(state, start, cards, leaf.interruptions);
    if (best && interruptions <= best.interruptions) continue;
    best = { interruptions, field: fieldCardIds(state), steps: visibleSteps(nodes, leaf.id) };
  }
  return best;
}

/** Alles, was ein Übungslauf über das Deck braucht; der Server stellt es einmal zusammen */
export interface PracticeSetup {
  deckId: string;
  deckName: string;
  /** Main Deck als einzelne Kopien, für den Zufallszug */
  pool: string[];
  /** Main und Extra Deck für den Startzustand der Werkbank */
  entries: DeckEntry[];
  cards: ComboCard[];
  /** Gespeicherte Lines mit ihrem besten bekannten Ende */
  targets: PracticeTarget[];
}

/** Eine Übungshand und die Lines, die darauf passen. Im Lauf bleiben die Lines verborgen. */
export interface PracticeHand {
  hand: string[];
  targets: PracticeTarget[];
}

/** Was der Nutzer am Ende der Hand tatsächlich stehen hat */
export interface ReachedBoard {
  interruptions: number;
  /** Eigene Karten auf dem Feld, Kopien mehrfach */
  field: string[];
}

export type PracticeVerdict = 'short' | 'equal' | 'ahead';

export interface PracticeScore {
  interruptions: number;
  /** Unterbrechungen des besten bekannten Endes */
  best: number;
  /** Karten des Vorbilds, die auf dem eigenen Feld fehlen */
  missing: string[];
  verdict: PracticeVerdict;
}

export interface PracticeAttempt {
  /** Nummer der Hand im Lauf, 1-basiert */
  number: number;
  hand: PracticeHand;
  /** Line, an der gemessen wurde */
  target: PracticeTarget;
  /** Was am Ende der Hand stand */
  reached: ReachedBoard;
  score: PracticeScore;
  /** Gebrauchte Zeit in Millisekunden */
  ms: number;
}

export interface PracticeTotals {
  played: number;
  short: number;
  equal: number;
  ahead: number;
  /** Summe der gebrauchten Zeit in Millisekunden */
  ms: number;
  /** Durchschnitt je Hand in Millisekunden */
  perHand: number;
}

/** Hände eines Laufs (Erfolgsbedingung: zehn hintereinander) */
export const PRACTICE_HANDS = 10;
/**
 * Höchstens so viele Züge für den ganzen Lauf; ein Deck ohne passende Line soll nicht endlos
 * ziehen. Reichlich bemessen, weil eine Abdeckung von 10 Prozent im Schnitt schon hundert Züge
 * für zehn Hände braucht.
 */
const DRAW_TRIES = 2000;

/** Lines, deren Starthand in der gezogenen Hand steckt */
export function matchingTargets(hand: string[], targets: PracticeTarget[]): PracticeTarget[] {
  return targets.filter((t) => t.startHand.length > 0 && containsHand(hand, t.startHand));
}

/** Bestes bekanntes Ende: die meisten Unterbrechungen, bei Gleichstand die kürzere Line */
export function bestTarget(targets: PracticeTarget[]): PracticeTarget | null {
  return targets.reduce<PracticeTarget | null>((best, t) => {
    if (!best) return t;
    if (t.interruptions !== best.interruptions)
      return t.interruptions > best.interruptions ? t : best;
    return t.steps < best.steps ? t : best;
  }, null);
}

/**
 * Hände für einen Lauf. Geübt wird nur, wozu es eine gespeicherte Line gibt, sonst gibt es nichts
 * zu vergleichen. Findet das Deck nicht genug solche Hände, kommen eben weniger zurück.
 */
export function practiceHands(
  pool: string[],
  targets: PracticeTarget[],
  count = PRACTICE_HANDS,
  size = 5,
  random: () => number = Math.random
): PracticeHand[] {
  const usable = targets.filter((t) => t.startHand.length > 0 && t.startHand.length <= size);
  if (pool.length === 0 || usable.length === 0) return [];
  const hands: PracticeHand[] = [];
  for (let i = 0; i < DRAW_TRIES && hands.length < count; i++) {
    const hand = drawHand(pool, size, random);
    const matched = matchingTargets(hand, usable);
    if (matched.length > 0) hands.push({ hand, targets: matched });
  }
  return hands;
}

/** Erreichtes Endboard gegen das Vorbild */
export function scoreHand(reached: ReachedBoard, target: PracticeTarget): PracticeScore {
  return {
    interruptions: reached.interruptions,
    best: target.interruptions,
    missing: missingFrom(target.field, reached.field),
    verdict:
      reached.interruptions < target.interruptions
        ? 'short'
        : reached.interruptions > target.interruptions
          ? 'ahead'
          : 'equal',
  };
}

export function totals(attempts: PracticeAttempt[]): PracticeTotals {
  const ms = attempts.reduce((sum, a) => sum + a.ms, 0);
  const count = (verdict: PracticeVerdict) =>
    attempts.filter((a) => a.score.verdict === verdict).length;
  return {
    played: attempts.length,
    short: count('short'),
    equal: count('equal'),
    ahead: count('ahead'),
    ms,
    perHand: attempts.length ? Math.round(ms / attempts.length) : 0,
  };
}

/** Zeit als „1:07“; ab einer Stunde „1:02:03“ */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, '0');
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(total % 60)}`
    : `${minutes}:${pad(total % 60)}`;
}
