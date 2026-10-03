import type { CardData, ComboNodeData, StartState } from '@/lib/combo/state';
import { initialState, statesForTree } from '@/lib/combo/state';
import { endboardSummary, lineEnds } from '@/lib/combo/endboard';

/**
 * Kennzahlen einer Combo für Bibliothek und Start (UX-Plan 7.2, UI-Plan 7.5.1 und 7.5.2):
 * Starthand, Lines, Branches, Endboard der Hauptline und alle vorkommenden Karten für die Suche.
 */
export interface ComboStats {
  /** Passcodes der eigenen Starthand in Reihenfolge */
  startHand: string[];
  /**
   * Karten der Starthand, die eine Line tatsächlich einsetzt („1-Card-Combo“); Grundlage für den
   * Hand-Tester. Ohne Schritte die ganze Starthand.
   */
  required: string[];
  lines: number;
  branches: number;
  /** Sichtbare Schritte der Hauptline */
  steps: number;
  /** Unterbrechungen am Ende der Hauptline; null ohne Schritte */
  endboard: number | null;
  /** Alle Karten aus Startzustand und Knoten, für „Wo benutze ich …?“ */
  cardIds: string[];
}

const VISIBLE = (n: ComboNodeData) => n.kind !== 'RESOLVE' && n.kind !== 'OPPONENT';

/** Sichtbare Schritte vom Start bis zu diesem Knoten; Kettenauflösung und Gegnerzüge zählen nicht */
export function visibleSteps(nodes: ComboNodeData[], leafId: string): number {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  let steps = 0;
  for (
    let n: ComboNodeData | undefined = byId.get(leafId);
    n;
    n = n.parentId ? byId.get(n.parentId) : undefined
  )
    if (VISIBLE(n)) steps++;
  return steps;
}

export function comboStats(
  startState: StartState,
  nodes: ComboNodeData[],
  cards: Map<string, CardData>
): ComboStats {
  const hand = startState.cards.filter((c) => c.owner === 'self' && c.zone === 'HAND');
  const startHand = hand.map((c) => c.cardId);
  const touched = new Set<string>();
  for (const n of nodes) {
    if (n.player !== 'self') continue;
    if (n.instanceId) touched.add(n.instanceId);
    for (const m of [...(n.costMoves ?? []), ...(n.resolveMoves ?? [])]) touched.add(m.instanceId);
  }
  const used = hand.filter((c) => touched.has(c.instanceId)).map((c) => c.cardId);
  const required = used.length ? used : startHand;
  const ends = lineEnds(nodes);
  const main = ends.find((e) => e.branches.length === 0) ?? ends[0];

  let endboard: number | null = null;
  let steps = 0;
  if (main) {
    steps = visibleSteps(nodes, main.leaf.id);
    const states = statesForTree(nodes, startState, cards);
    const state = states.get(main.leaf.id);
    if (state)
      endboard = endboardSummary(
        state,
        initialState(startState),
        cards,
        main.leaf.interruptions
      ).interruptions;
  }

  // Karten, die der Spieler selbst einsetzt: Starthand, Aktivierungen und bewegte Karten
  const cardIds = new Set(startHand);
  for (const n of nodes) {
    if (n.player === 'self' && n.cardId) cardIds.add(n.cardId);
    for (const m of [...(n.costMoves ?? []), ...(n.resolveMoves ?? [])])
      if (m.cardId && n.player === 'self') cardIds.add(m.cardId);
  }

  return {
    startHand,
    required,
    lines: ends.length,
    branches: Math.max(0, ends.length - 1),
    steps,
    endboard,
    cardIds: [...cardIds],
  };
}
