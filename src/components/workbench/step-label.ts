import type { ComboNodeData, GameState } from '@/lib/combo/state';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import type { CardLanguage } from '@/lib/settings';

/** Karte, um die es im Schritt geht: aktivierende Karte oder die erste bewegte Karte */
export function nodeCardId(node: ComboNodeData, state: GameState | undefined): string | null {
  if (node.cardId) return node.cardId;
  const move = node.resolveMoves?.[0] ?? node.costMoves?.[0];
  if (!move) return null;
  return move.cardId ?? state?.cards[move.instanceId]?.cardId ?? null;
}

const SHORT_ACTION: Record<string, string> = {
  NORMAL_SUMMON: 'NS',
  SPECIAL_SUMMON: 'SS',
  SET: 'Set',
};

/**
 * Kurzform wie Spieler sie aufschreiben (UX-Plan 6.6): „NS Aluber“, „Aluber ↯ 1“, „Endboard“.
 * Spielbegriffe bleiben englisch, deshalb gibt es hier keine Übersetzung.
 */
export function stepLabel(
  node: ComboNodeData,
  cards: Map<string, ComboCard>,
  cardLanguage: CardLanguage,
  state: GameState | undefined,
  fallback: (kind: ComboNodeData['kind']) => string
): string {
  const cardId = nodeCardId(node, state);
  const name = cardId ? displayName(cards.get(cardId), cardLanguage) : null;
  switch (node.kind) {
    case 'ACTION': {
      const short = node.action ? SHORT_ACTION[node.action] : undefined;
      if (name && short) return `${short} ${name}`;
      return name ?? fallback(node.kind);
    }
    case 'ACTIVATE': {
      if (!name) return fallback(node.kind);
      const label =
        node.effectIndex !== null && node.effectIndex !== undefined
          ? `${name} ↯ ${node.effectIndex + 1}`
          : `${name} ↯`;
      // Ziele hinter dem Pfeil: „MST ↯ 1 → Infinite Impermanence“
      const targets = (node.targets ?? [])
        .map((id) => state?.cards[id]?.cardId)
        .map((id) => (id ? displayName(cards.get(id), cardLanguage) : null))
        .filter(Boolean);
      return targets.length ? `${label} → ${targets.join(', ')}` : label;
    }
    default:
      return fallback(node.kind);
  }
}
