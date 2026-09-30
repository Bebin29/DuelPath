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

export function comboStats(
  startState: StartState,
  nodes: ComboNodeData[],
  cards: Map<string, CardData>
): ComboStats {
  const startHand = startState.cards
    .filter((c) => c.owner === 'self' && c.zone === 'HAND')
    .map((c) => c.cardId);
  const ends = lineEnds(nodes);
  const main = ends.find((e) => e.branches.length === 0) ?? ends[0];

  let endboard: number | null = null;
  let steps = 0;
  if (main) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    for (
      let n: ComboNodeData | undefined = main.leaf;
      n;
      n = n.parentId ? byId.get(n.parentId) : undefined
    )
      if (VISIBLE(n)) steps++;
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
  const used = new Set(startHand);
  for (const n of nodes) {
    if (n.player === 'self' && n.cardId) used.add(n.cardId);
    for (const m of [...(n.costMoves ?? []), ...(n.resolveMoves ?? [])])
      if (m.cardId && n.player === 'self') used.add(m.cardId);
  }

  return {
    startHand,
    lines: ends.length,
    branches: Math.max(0, ends.length - 1),
    steps,
    endboard,
    cardIds: [...used],
  };
}
