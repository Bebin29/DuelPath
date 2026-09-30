import type {
  CardData,
  CardMove,
  ComboNodeData,
  GameState,
  Negation,
  Player,
} from '@/lib/combo/state';
import { newInstanceId } from '@/lib/combo/tree';

/**
 * Schnellauswahl für Reaktionen: gängige TCG-Handtraps und Unterbrechungen.
 * Verbotene Karten fallen beim Laden über banTcg heraus (siehe getStaples).
 */

/** Wie die Karte aktiviert wird; bestimmt die Bewegungen bei Aktivierung */
export type ReactionKind =
  /** Monster wird als Kosten abgeworfen oder auf den Friedhof gelegt (Ash, Veiler, Droll) */
  | 'discard'
  /** Monster beschwört sich selbst von der Hand (Nibiru, PSY-Framegear Gamma) */
  | 'summonSelf'
  /** Falle wird von der Hand aktiviert (Infinite Impermanence) */
  | 'trapFromHand'
  /** Gesetzte Falle auf dem Feld (Solemn, Skill Drain) */
  | 'setTrap'
  /** Quick-Play Spell von der Hand (Called by the Grave, Crossout, Droplet) */
  | 'quickPlay';

/** Voreingestelltes Negierungsziel; der Nutzer kann es im Knoten ändern */
export type DefaultNegation =
  'EFFECT_TOP' | 'ACTIVATION_TOP' | 'ACTIVATION_OR_SUMMON' | 'CARD_TOP' | 'NAME_TOP';

export interface Staple {
  name: string;
  /** Wer die Karte typischerweise spielt: Gegner als Unterbrechung, eigene Seite als Antwort darauf */
  side: Player;
  kind: ReactionKind;
  negation?: DefaultNegation;
}

export const STAPLES: Staple[] = [
  // Handtraps
  {
    name: 'Ash Blossom & Joyous Spring',
    side: 'opponent',
    kind: 'discard',
    negation: 'EFFECT_TOP',
  },
  { name: 'Infinite Impermanence', side: 'opponent', kind: 'trapFromHand', negation: 'CARD_TOP' },
  { name: 'Nibiru, the Primal Being', side: 'opponent', kind: 'summonSelf' },
  { name: 'Effect Veiler', side: 'opponent', kind: 'discard', negation: 'CARD_TOP' },
  {
    name: 'Ghost Belle & Haunted Mansion',
    side: 'opponent',
    kind: 'discard',
    negation: 'EFFECT_TOP',
  },
  { name: 'Ghost Ogre & Snow Rabbit', side: 'opponent', kind: 'discard' },
  {
    name: 'Ghost Mourner & Moonlit Chill',
    side: 'opponent',
    kind: 'discard',
    negation: 'CARD_TOP',
  },
  { name: 'Droll & Lock Bird', side: 'opponent', kind: 'discard' },
  { name: 'D.D. Crow', side: 'opponent', kind: 'discard' },
  { name: 'PSY-Framegear Gamma', side: 'opponent', kind: 'summonSelf', negation: 'ACTIVATION_TOP' },
  { name: 'Mulcharmy Fuwalos', side: 'opponent', kind: 'discard' },
  { name: 'Mulcharmy Purulia', side: 'opponent', kind: 'discard' },
  { name: 'Dimension Shifter', side: 'opponent', kind: 'discard' },
  // Unterbrechungen vom Feld
  { name: 'Solemn Judgment', side: 'opponent', kind: 'setTrap', negation: 'ACTIVATION_OR_SUMMON' },
  { name: 'Solemn Strike', side: 'opponent', kind: 'setTrap', negation: 'ACTIVATION_OR_SUMMON' },
  { name: 'Solemn Warning', side: 'opponent', kind: 'setTrap', negation: 'ACTIVATION_OR_SUMMON' },
  { name: 'Skill Drain', side: 'opponent', kind: 'setTrap' },
  { name: 'Evenly Matched', side: 'opponent', kind: 'setTrap' },
  // Antworten der eigenen Seite
  { name: 'Called by the Grave', side: 'self', kind: 'quickPlay', negation: 'NAME_TOP' },
  { name: 'Crossout Designator', side: 'self', kind: 'quickPlay', negation: 'NAME_TOP' },
  { name: 'Forbidden Droplet', side: 'self', kind: 'quickPlay', negation: 'CARD_TOP' },
];

/**
 * Baut einen ACTIVATE-Knoten für eine Reaktion unter `parent`.
 * Die Karteninstanz wird bei Bedarf über die Aktivierungsbewegung angelegt (Hand bzw. gesetzte Falle).
 */
export function reactionNode(
  parent: ComboNodeData,
  card: CardData,
  reaction: Pick<Staple, 'kind' | 'negation'>,
  player: Player,
  before: GameState,
  ancestors: ComboNodeData[]
): ComboNodeData {
  const instanceId = findInstance(before, card.id, player, reaction.kind) ?? newInstanceId(card.id);
  const firstActivated = card.effects.findIndex((e) => e.activated);
  const base = { instanceId, cardId: card.id, owner: player };

  const costMoves: CardMove[] = [];
  const resolveMoves: CardMove[] = [];
  switch (reaction.kind) {
    case 'discard':
      costMoves.push({ ...base, from: 'HAND', to: 'GY' });
      break;
    case 'summonSelf':
      resolveMoves.push({ ...base, from: 'HAND', to: 'MONSTER', position: 'ATK' });
      break;
    case 'trapFromHand':
    case 'quickPlay':
      costMoves.push({ ...base, from: 'HAND', to: 'SPELL_TRAP' });
      break;
    case 'setTrap':
      // Aufdecken der gesetzten Falle; legt sie an, falls das Gegnerboard sie noch nicht enthält
      costMoves.push({ ...base, from: 'SPELL_TRAP', to: 'SPELL_TRAP', position: 'ATK' });
      break;
  }

  return {
    id: crypto.randomUUID(),
    parentId: parent.id,
    kind: 'ACTIVATE',
    player,
    edgeLabel: card.name,
    instanceId,
    cardId: card.id,
    effectIndex: firstActivated >= 0 ? firstActivated : 0,
    costMoves,
    resolveMoves,
    negates: defaultNegation(reaction.negation, player, before, ancestors),
  };
}

/** Vorhandene Instanz der Karte am passenden Ort, damit keine Doppelgänger entstehen */
function findInstance(
  state: GameState,
  cardId: string,
  player: Player,
  kind: ReactionKind
): string | undefined {
  const zone = kind === 'setTrap' ? 'SPELL_TRAP' : 'HAND';
  return Object.values(state.cards).find(
    (c) =>
      c.cardId === cardId &&
      c.zone === zone &&
      (zone === 'HAND' ? c.owner : c.controller) === player
  )?.instanceId;
}

function defaultNegation(
  kind: DefaultNegation | undefined,
  player: Player,
  before: GameState,
  ancestors: ComboNodeData[]
): Negation | null {
  if (!kind) return null;
  // Oberster Chain Link der Gegenseite
  const top = [...before.chain].reverse().find((l) => l.player !== player);
  const lastSummon = [...ancestors]
    .reverse()
    .find(
      (a) => a.player !== player && (a.action === 'NORMAL_SUMMON' || a.action === 'SPECIAL_SUMMON')
    );

  switch (kind) {
    case 'EFFECT_TOP':
      return top ? { type: 'EFFECT', nodeId: top.nodeId } : null;
    case 'ACTIVATION_TOP':
      return top ? { type: 'ACTIVATION', nodeId: top.nodeId } : null;
    case 'ACTIVATION_OR_SUMMON':
      if (top) return { type: 'ACTIVATION', nodeId: top.nodeId };
      return lastSummon ? { type: 'SUMMON', nodeId: lastSummon.id } : null;
    case 'CARD_TOP': {
      const instance = top?.instanceId ? before.cards[top.instanceId] : undefined;
      return instance?.zone === 'MONSTER'
        ? { type: 'CARD', instanceId: instance.instanceId }
        : null;
    }
    case 'NAME_TOP':
      return top?.cardId ? { type: 'NAME', cardId: top.cardId } : null;
  }
}
