import { displayName, type ComboCard } from '@/lib/combo/cards';
import type { GameState } from '@/lib/combo/state';

/** Namen hinter den OPT-Schlüsseln aus stateAt (soft, hard, card), für den HOPT-Tracker */
export function usedOptNames(
  state: GameState,
  cards: Map<string, ComboCard>,
  language: 'en' | 'de'
): string[] {
  const names = new Set<string>();
  for (const [key, count] of Object.entries(state.optUsage)) {
    if (count <= 0) continue;
    const [kind, a, b] = key.split(':');
    if (kind === 'soft') {
      const cardId = state.cards[a]?.cardId;
      if (cardId) names.add(displayName(cards.get(cardId), language));
    } else if (kind === 'hard' || kind === 'card') {
      names.add((b ?? '').split('#')[0]);
    }
  }
  return [...names].filter(Boolean).sort();
}
