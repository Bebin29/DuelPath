import {
  cardsIn,
  type CardData,
  type ComboNodeData,
  type GameState,
  type PlacedCard,
  type Player,
} from '@/lib/combo/state';
import { fusionMoves, needsDiscard, resultMoves, withMoves } from '@/lib/combo/play';
import {
  materialCandidates,
  resultCandidates,
  resultSpecs,
  type ResultSpec,
} from '@/lib/combo/effect-results';

/**
 * Offene Fragen nach einer Aktivierung (UX-Plan 6.4): Abwerfen, „Was hast du gesucht?“, Fusion.
 * Browser (Schrittleiste) und API nutzen dieselbe Ableitung, damit beide gleich fragen.
 */
export type PromptSpec =
  | {
      kind: 'discard';
      stepId: string;
      player: Player;
      /** Die aktivierende Karte wird nicht abgeworfen */
      exclude: string;
      /** Kosten beim Aktivieren oder Teil der Wirkung beim Auflösen */
      key: 'costMoves' | 'resolveMoves';
    }
  | { kind: 'result'; stepId: string; player: Player; spec: ResultSpec }
  | { kind: 'fusion'; stepId: string; player: Player; spec: ResultSpec };

/** Fragen zum Aktivierungsschritt; `state` ist der Zustand vor der Aktivierung */
export function promptsFor(
  step: ComboNodeData,
  state: GameState,
  cards: Map<string, CardData>
): PromptSpec[] {
  if (step.kind !== 'ACTIVATE' || !step.instanceId) return [];
  const placed = state.cards[step.instanceId];
  const data = placed ? cards.get(placed.cardId) : step.cardId ? cards.get(step.cardId) : undefined;
  const player = placed?.controller ?? step.player;
  const effectIndex = step.effectIndex ?? 0;
  const out: PromptSpec[] = [];
  const discard = needsDiscard(data, effectIndex);
  if (discard) {
    out.push({
      kind: 'discard',
      stepId: step.id,
      player,
      exclude: step.instanceId,
      key: discard === 'cost' ? 'costMoves' : 'resolveMoves',
    });
  }
  for (const spec of resultSpecs(data, effectIndex))
    out.push({ kind: spec.verb === 'fusion' ? 'fusion' : 'result', stepId: step.id, player, spec });
  return out;
}

/**
 * Antwort auf „Was hast du gesucht/beschworen?“ an den Schritt hängen. Freie Zonen rechnen mit
 * den schon eingetragenen Beschwörungen desselben Schritts; „but negate its effects“ negiert
 * die beschworene Karte beim Auflösen.
 */
export function withResult(
  step: ComboNodeData,
  spec: ResultSpec,
  picks: string[],
  state: GameState,
  player: Player
): ComboNodeData {
  const moves = resultMoves(spec.to, picks, state, player, step.resolveMoves);
  const next = withMoves(step, 'resolveMoves', moves);
  // ponytail: negates fasst eine Negierung, bei „negate their effects“ nur das erste Monster
  const summoned = spec.negate ? moves.find((m) => m.to === 'MONSTER') : undefined;
  return summoned && !next.negates
    ? { ...next, negates: { type: 'CARD', instanceId: summoned.instanceId } }
    : next;
}

/**
 * Wählbare Karten zur Frage; `state` ist der Zustand am Schritt.
 * Bei der Fusion erst die Fusionsmonster, mit `fusionId` dann die Materialien.
 */
export function promptCandidates(
  prompt: PromptSpec,
  state: GameState,
  cards: Map<string, CardData>,
  options: { all?: boolean; fusionId?: string | null } = {}
): PlacedCard[] {
  switch (prompt.kind) {
    case 'discard':
      return cardsIn(state, prompt.player, 'HAND').filter((c) => c.instanceId !== prompt.exclude);
    case 'result':
      return resultCandidates(prompt.spec, state, prompt.player, cards, options.all);
    case 'fusion':
      return options.fusionId
        ? materialCandidates(prompt.spec, state, prompt.player, cards)
        : resultCandidates(prompt.spec, state, prompt.player, cards);
  }
}

/** Antwort in den Schritt schreiben: die gewählten Karten werden zu Bewegungen */
export function answerPrompt(
  nodes: ComboNodeData[],
  prompt: PromptSpec,
  picks: string[],
  state: GameState,
  fusionId?: string | null
): ComboNodeData[] {
  const add = (key: 'costMoves' | 'resolveMoves', moves: ReturnType<typeof resultMoves>) =>
    nodes.map((n) => (n.id === prompt.stepId ? withMoves(n, key, moves) : n));
  switch (prompt.kind) {
    case 'discard':
      return add(prompt.key, resultMoves('GY', picks.slice(0, 1), state, prompt.player));
    case 'result':
      return nodes.map((n) =>
        n.id === prompt.stepId ? withResult(n, prompt.spec, picks, state, prompt.player) : n
      );
    case 'fusion':
      return fusionId
        ? add('resolveMoves', fusionMoves(fusionId, picks, state, prompt.player))
        : nodes;
  }
}
