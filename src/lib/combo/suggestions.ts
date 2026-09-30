import type { CardEffect } from '@/lib/cards/effects';
import type { NoulQuestion } from '@/server/jev';
import {
  cardsIn,
  isOptAvailable,
  onField,
  spellSpeedOf,
  type CardData,
  type GameState,
  type Player,
  type Position,
  type Zone,
} from '@/lib/combo/state';

/**
 * Effektvorschläge: deterministischer Vorfilter plus eine Jev-Anfrage pro Knoten.
 * Ausgewertet mit prisma/scripts/eval-jev-suggestions.ts (Schwelle siehe SUGGESTION_THRESHOLD).
 */

/** Vorschläge unter dieser Wahrscheinlichkeit werden ausgeblendet */
export const SUGGESTION_THRESHOLD = 0.8;
export const MAX_CANDIDATES = 30;

const ACTIVATION_ZONES: Zone[] = ['HAND', 'MONSTER', 'SPELL_TRAP', 'FIELD', 'GY', 'BANISHED'];

export interface Candidate {
  instanceId: string;
  cardId: string;
  effectIndex: number;
  player: Player;
  zone: Zone;
}

/**
 * Effekte, die der Spieler im Zustand überhaupt aktivieren könnte. Aussortiert werden
 * verbrauchte OPTs, negierte Karten, unpassender Spell Speed bei offener Chain,
 * Trigger bei offener Chain und Kartenaktivierungen aus Zonen, in denen das nicht geht.
 */
export function candidateEffects(
  state: GameState,
  player: Player,
  cards: Map<string, CardData>
): Candidate[] {
  const top = state.chain.at(-1);
  const result: Candidate[] = [];

  for (const zone of ACTIVATION_ZONES) {
    for (const placed of cardsIn(state, player, zone)) {
      const card = cards.get(placed.cardId);
      if (!card) continue;
      if (state.negatedCards[placed.instanceId] === placed.epoch) continue;
      if (state.negatedNames.includes(card.id)) continue;

      card.effects.forEach((effect, effectIndex) => {
        if (!effect.activated) return;
        if (!cardActivationPossible(card, effectIndex, effect, zone, placed.position)) return;
        if (top) {
          if (effect.patterns.some((p) => p.startsWith('TRIGGER_'))) return;
          const speed = spellSpeedOf(card, effectIndex, effect);
          if (speed < 2 || speed < top.spellSpeed) return;
        }
        if (!isOptAvailable(state, { instanceId: placed.instanceId, effectIndex, player }, card)) {
          return;
        }
        result.push({ instanceId: placed.instanceId, cardId: card.id, effectIndex, player, zone });
      });
    }
  }
  // ponytail: harte Obergrenze statt Priorisierung; bei vollen Boards zuerst Feld und Hand
  return result.slice(0, MAX_CANDIDATES);
}

/** Kartenaktivierung (Effekt 0 einer Spell/Trap) nur von der Hand bzw. vom Feld */
function cardActivationPossible(
  card: CardData,
  effectIndex: number,
  effect: CardEffect,
  zone: Zone,
  position?: Position
): boolean {
  const isSpell = /Spell/.test(card.type);
  const isTrap = /Trap/.test(card.type);
  if (!(isSpell || isTrap) || effectIndex !== 0) return true;
  if (zone === 'GY' || zone === 'BANISHED') return false;
  // Fallen nur gesetzt, außer der Text erlaubt die Aktivierung von der Hand (Imperm)
  if (isTrap && zone === 'HAND') return /activate this card from your hand/.test(effect.text);
  if (isTrap && onField(zone)) return position === 'SET';
  return true;
}

/** Kompakte, serialisierbare Beschreibung für die Server Action */
export interface SuggestionInput {
  board: { cardId: string; player: Player; zone: Zone; position?: Position }[];
  chain: { cardId?: string; player: Player; effectIndex?: number; negated?: boolean }[];
  normalSummonUsed: boolean;
  candidates: Omit<Candidate, 'instanceId'>[];
}

export function toSuggestionInput(state: GameState, candidates: Candidate[]): SuggestionInput {
  return {
    board: Object.values(state.cards)
      .filter((c) => c.zone !== 'DECK' && c.zone !== 'EXTRA')
      .map((c) => ({
        cardId: c.cardId,
        player: onField(c.zone) ? c.controller : c.owner,
        zone: c.zone,
        ...(c.position && { position: c.position }),
      })),
    chain: state.chain.map((l) => ({
      cardId: l.cardId,
      player: l.player,
      effectIndex: l.effectIndex,
      negated: !!l.negated,
    })),
    normalSummonUsed: state.normalSummonUsed,
    candidates: candidates.map(({ cardId, effectIndex, player, zone }) => ({
      cardId,
      effectIndex,
      player,
      zone,
    })),
  };
}

const ZONE_LABEL: Record<Zone, string> = {
  HAND: 'hand',
  DECK: 'deck',
  EXTRA: 'extra deck',
  MONSTER: 'monster zone',
  SPELL_TRAP: 'spell & trap zone',
  FIELD: 'field zone',
  GY: 'graveyard',
  BANISHED: 'banished',
};
const PLAYER_LABEL: Record<Player, string> = { self: 'Player A', opponent: 'Player B' };

/**
 * Baut state und questions für Jev. Die Kartentexte kommen aus der Datenbank, nicht vom Client.
 * Der Zug gehört immer Spieler A ("self"): eine Combo deckt genau einen eigenen Zug ab.
 */
export function jevRequest(
  input: SuggestionInput,
  cards: Map<string, Pick<CardData, 'name' | 'type' | 'effects'>>
): { state: Record<string, unknown>; questions: Record<string, NoulQuestion> } {
  const name = (id?: string) => (id && cards.get(id)?.name) || 'unknown card';
  const describe = (entry: SuggestionInput['board'][number]) => {
    const facedown = entry.position === 'SET';
    const pos =
      entry.zone === 'MONSTER'
        ? facedown
          ? ' (face-down defense)'
          : ` (${entry.position === 'DEF' ? 'defense' : 'attack'})`
        : facedown
          ? ' (set)'
          : '';
    return `${name(entry.cardId)}${pos}`;
  };

  const players: Record<string, Record<string, string[]>> = {};
  for (const player of ['self', 'opponent'] as const) {
    const zones: Record<string, string[]> = {};
    for (const zone of ACTIVATION_ZONES) {
      zones[ZONE_LABEL[zone]] = input.board
        .filter((b) => b.player === player && b.zone === zone)
        .map(describe);
    }
    players[PLAYER_LABEL[player]] = zones;
  }

  const state = {
    turn: "It is Player A's turn, Main Phase 1. Player B is the opponent.",
    normalSummonUsedByPlayerA: input.normalSummonUsed,
    field: players,
    openChain: input.chain.length
      ? input.chain.map(
          (l, i) =>
            `Chain Link ${i + 1}: ${PLAYER_LABEL[l.player]} activated ${name(l.cardId)}${l.negated ? ' (negated)' : ''}`
        )
      : 'No chain is open; the next action starts a new chain.',
  };

  const questions: Record<string, NoulQuestion> = {};
  input.candidates.forEach((c, i) => {
    const effect = cards.get(c.cardId)?.effects[c.effectIndex];
    questions[`c${i}`] = {
      type: 'noul',
      instructions: `Can ${PLAYER_LABEL[c.player]} legally activate this effect of "${name(c.cardId)}" (in ${PLAYER_LABEL[c.player]}'s ${ZONE_LABEL[c.zone]}) right now${input.chain.length ? ' in response to the open chain' : ''}? Effect: "${effect?.text ?? ''}"`,
      criteria: {
        true: 'Timing, location, activation conditions, costs and targets are all satisfied in this game state.',
        false:
          'At least one requirement (timing, location, condition, cost or targets) is not met.',
      },
    };
  });
  return { state, questions };
}
