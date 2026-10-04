import {
  endboardSummary,
  fieldCardIds,
  lineEnds,
  missingFrom,
  interruptionsOf,
} from '@/lib/combo/endboard';
import { initialState, statesForTree, pathTo } from '@/lib/combo/state';
import type { CardData, ComboNodeData, StartState } from '@/lib/combo/state';
import { visibleSteps, comboStats } from '@/lib/combo/summary';
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
  leafId?: string;
  /** True: interruptions excludes unused saved hand cards and is calibrated when drawing. */
  calibrateHand?: boolean;
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

/** Each reference comes from one compatible path, never a mixture of branches. */
export function practiceTargets(
  combo: { id: string; title: string; startState: StartState; nodes: ComboNodeData[] },
  cards: Map<string, CardData>,
  entries: DeckEntry[]
): PracticeTarget[] {
  const { startState, nodes } = combo;
  // A fresh practice hand cannot recreate field/GY setups or an opponent's board. Cards in the
  // opponent's hand are fine: they only matter once activated, and lines with opponent steps
  // are skipped below anyway.
  if (
    startState.cards.some((c) =>
      c.owner === 'self' ? !['HAND', 'DECK', 'EXTRA'].includes(c.zone) : c.zone !== 'HAND'
    )
  )
    return [];
  const deck = new Map(entries.map((e) => [e.cardId, e.quantity]));
  const original = new Map(startState.cards.map((c) => [c.instanceId, c.cardId]));
  const states = statesForTree(nodes, startState, cards);
  const start = initialState(startState);
  return lineEnds(nodes).flatMap(({ leaf }) => {
    const line = pathTo(nodes, leaf.id);
    if (line.some((n) => n.player === 'opponent' || n.kind === 'OPPONENT')) return [];
    const touched = new Set<string>();
    const used = new Map<string, string>();
    for (const n of line) {
      if (n.instanceId) {
        touched.add(n.instanceId);
        const id = n.cardId ?? original.get(n.instanceId);
        if (id) used.set(n.instanceId, id);
      }
      for (const move of [...(n.costMoves ?? []), ...(n.resolveMoves ?? [])]) {
        if (move.owner === 'opponent') return [];
        touched.add(move.instanceId);
        const id = move.cardId ?? original.get(move.instanceId);
        if (id) used.set(move.instanceId, id);
      }
    }
    const quantities = new Map<string, number>();
    for (const id of used.values()) {
      if (cards.get(id)?.type.includes('Token')) continue;
      quantities.set(id, (quantities.get(id) ?? 0) + 1);
    }
    if ([...quantities].some(([id, quantity]) => quantity > (deck.get(id) ?? 0))) return [];
    const state = states.get(leaf.id);
    if (!state || state.warnings.length > 0) return [];
    const required = comboStats(startState, line, cards).required;
    if (
      !required.length ||
      !containsHand(
        entries
          .filter((e) => e.section === 'MAIN')
          .flatMap((e) => Array<string>(e.quantity).fill(e.cardId)),
        required
      )
    )
      return [];
    // Untouched saved hand cards are replaced by the random hand's unused cards below.
    const summary = endboardSummary(state, start, cards);
    const unused = new Set(
      startState.cards
        .filter((c) => c.zone === 'HAND' && !touched.has(c.instanceId))
        .map((c) => c.instanceId)
    );
    return [
      {
        comboId: combo.id,
        leafId: leaf.id,
        title: combo.title,
        startHand: required,
        interruptions:
          summary.interruptions -
          summary.hand
            .filter((c) => unused.has(c.placed.instanceId))
            .reduce((sum, c) => sum + c.count, 0),
        calibrateHand: true,
        field: fieldCardIds(state),
        steps: visibleSteps(line, leaf.id),
      },
    ];
  });
}

/** Put the saved path and the attempt on the same untouched hand resources. */
export function targetForHand(
  target: PracticeTarget,
  hand: string[],
  cards: Map<string, CardData>
): PracticeTarget {
  if (!target.calibrateHand) return target;
  const extras = [...hand];
  for (const id of target.startHand) {
    const index = extras.indexOf(id);
    if (index >= 0) extras.splice(index, 1);
  }
  const held = extras.reduce(
    (sum, id, index) =>
      sum +
      interruptionsOf(cards.get(id), {
        instanceId: `extra:${index}`,
        cardId: id,
        owner: 'self',
        controller: 'self',
        zone: 'HAND',
        epoch: 0,
      }),
    0
  );
  return { ...target, calibrateHand: false, interruptions: target.interruptions + held };
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
  /** Combos am Deck, auch die, aus denen keine übbare Line wurde */
  comboCount: number;
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
  random: () => number = Math.random,
  cards: Map<string, CardData> = new Map()
): PracticeHand[] {
  const usable = targets.filter((t) => t.startHand.length > 0 && t.startHand.length <= size);
  if (pool.length === 0 || usable.length === 0) return [];
  const hands: PracticeHand[] = [];
  for (let i = 0; i < DRAW_TRIES && hands.length < count; i++) {
    const hand = drawHand(pool, size, random);
    const matched = matchingTargets(hand, usable);
    if (matched.length > 0)
      hands.push({ hand, targets: matched.map((t) => targetForHand(t, hand, cards)) });
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
