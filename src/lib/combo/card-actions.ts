import { canNormalSummon, isOptAvailable, type CardData, type GameState } from '@/lib/combo/state';
import {
  isExtraDeckMonster,
  isFieldSpell,
  isMonster,
  isSpell,
  isTrap,
  materialsOf,
  type PlayIntent,
} from '@/lib/combo/play';

export interface CardAction {
  id: string;
  /** Schlüssel unter workbench.actions */
  label: string;
  /** Tastenkürzel (UX-Plan 9) */
  key?: string;
  intent?: PlayIntent;
  /** Extra-Deck-Beschwörung braucht erst die Materialwahl */
  extraSummon?: boolean;
  /** Nur bei Effekten: Text und ob der OPT noch frei ist */
  effectText?: string;
  free?: boolean;
  opt?: 'HOPT' | 'SOPT';
}

/**
 * Was mit einer Karte in ihrer Zone Sinn ergibt (UX-Plan 6.3, UI-Plan 7.4.1):
 * zuerst die Effekte, dann Beschwörungsarten, zuletzt Bewegungen.
 */
export function cardActions(
  state: GameState,
  cards: Map<string, CardData>,
  instanceId: string
): { effects: CardAction[]; other: CardAction[] } {
  const placed = state.cards[instanceId];
  const card = placed ? cards.get(placed.cardId) : undefined;
  if (!placed || !card) return { effects: [], other: [] };

  const effects: CardAction[] = card.effects
    .map((effect, i) => ({ effect, i }))
    .filter(({ effect }) => effect.activated)
    .map(({ effect, i }) => ({
      id: `effect-${i}`,
      label: 'effect',
      key: i < 9 ? String(i + 1) : undefined,
      intent: { kind: 'activate', instanceId, effectIndex: i },
      effectText: effect.text,
      free: isOptAvailable(state, { instanceId, effectIndex: i, player: placed.controller }, card),
      opt: effect.opt ? (effect.opt.kind === 'HARD' ? 'HOPT' : 'SOPT') : undefined,
    }));

  const other: CardAction[] = [];
  const zone = placed.zone;
  if (zone === 'HAND' && isMonster(card)) {
    if (canNormalSummon(state, cards, instanceId)) {
      other.push({
        id: 'ns',
        label: 'normalSummon',
        key: 'N',
        intent: { kind: 'normalSummon', instanceId },
      });
    }
    other.push({
      id: 'set',
      label: 'setMonster',
      key: 'S',
      intent: { kind: 'setMonster', instanceId },
    });
    other.push({ id: 'ss', label: 'specialSummon', intent: { kind: 'specialSummon', instanceId } });
  }
  if (zone === 'HAND' && (isSpell(card) || isTrap(card))) {
    if (isSpell(card) && !card.effects.some((e) => e.activated)) {
      other.push({
        id: 'activate',
        label: 'activateCard',
        key: 'A',
        intent: { kind: 'activate', instanceId, effectIndex: 0 },
      });
    }
    other.push({
      id: 'set',
      label: isFieldSpell(card) ? 'setField' : 'setSpellTrap',
      key: 'S',
      intent: { kind: 'setSpellTrap', instanceId },
    });
  }
  if (zone === 'MONSTER') {
    other.push({
      id: 'pos',
      label: 'changePosition',
      key: 'P',
      intent: { kind: 'changePosition', instanceId },
    });
  }
  const attached = materialsOf(state, instanceId);
  if (zone === 'MONSTER' && attached.length > 0) {
    other.push({
      id: 'detach',
      label: 'detach',
      intent: { kind: 'move', instanceId: attached[0].instanceId, to: 'GY' },
    });
  }
  if (zone === 'EXTRA' && isExtraDeckMonster(card)) {
    other.push({ id: 'xs', label: 'extraSummon', extraSummon: true });
  }
  if ((zone === 'GY' || zone === 'BANISHED' || zone === 'DECK') && isMonster(card)) {
    other.push({ id: 'ss', label: 'specialSummon', intent: { kind: 'specialSummon', instanceId } });
  }

  const move = (id: string, label: string, key: string, to: typeof zone) =>
    zone !== to && other.push({ id, label, key, intent: { kind: 'move', instanceId, to } });
  move('gy', 'toGy', 'G', 'GY');
  move('banish', 'banish', 'B', 'BANISHED');
  if (zone !== 'EXTRA') move('hand', 'toHand', 'H', 'HAND');
  if (!isExtraDeckMonster(card)) move('deck', 'toDeck', 'D', 'DECK');
  else move('extra', 'toExtra', 'D', 'EXTRA');

  return { effects, other };
}
