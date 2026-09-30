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

/**
 * Wann ein Staple einen Schritt trifft (UX-Plan 6.8), als Wirkungsmuster des Schritts.
 * Der Stresstest (stress.ts) prüft jedes Muster gegen die Schritte einer Line.
 */
export type HitPattern =
  /** Aktivierung sucht aus dem Deck, beschwört aus dem Deck oder legt aus dem Deck auf den Friedhof */
  | 'FROM_DECK'
  /** Aktivierung holt Karten aus dem Friedhof, beschwört von dort oder verbannt dort */
  | 'FROM_GY'
  /** Effekt eines offenen Monsters auf dem Feld wird aktiviert */
  | 'FIELD_MONSTER_EFFECT'
  /** Karte oder Effekt einer Karte auf dem Feld wird aktiviert */
  | 'FIELD_EFFECT'
  /** Monstereffekt wird aktiviert, während der Gegner kein Monster kontrolliert */
  | 'MONSTER_EFFECT_NO_OPP_MONSTER'
  /** Monstereffekt wird aktiviert */
  | 'MONSTER_EFFECT'
  /** Zauber oder Falle wird aktiviert */
  | 'SPELL_TRAP_ACTIVATION'
  /** Beschwörung (Normal oder Special) */
  | 'SUMMON'
  | 'SPECIAL_SUMMON'
  /** Effekt, der Monster beschwört */
  | 'SUMMONING_EFFECT'
  /** Fünfte Beschwörung im Zug */
  | 'FIFTH_SUMMON'
  /** Karte kommt aus dem Main Deck auf die Hand */
  | 'ADD_FROM_DECK'
  /** Karte liegt im Friedhof und ein späterer Schritt braucht sie dort */
  | 'GY_NEEDED_LATER'
  /** Am Anfang des Zuges; gezählt werden Beschwörungen aus Deck und Extra Deck */
  | 'TURN_START_DECK_SUMMONS'
  /** Am Anfang des Zuges; gezählt werden Beschwörungen von der Hand */
  | 'TURN_START_HAND_SUMMONS';

export interface Staple {
  name: string;
  /** Kurzname für Chips und Branch-Namen („B: Ash auf 2“) */
  short: string;
  /** Wer die Karte typischerweise spielt: Gegner als Unterbrechung, eigene Seite als Antwort darauf */
  side: Player;
  kind: ReactionKind;
  negation?: DefaultNegation;
  /** Wann die Karte trifft; ohne Muster nur von Hand anlegbar */
  hits?: HitPattern[];
  /** Zerstört bzw. verbannt das Ziel beim Auflösen */
  removes?: 'destroy' | 'banishFromGy';
  /** Wirkt nur, wenn die Karte gesetzt auf dem Gegnerboard liegt */
  needsSet?: boolean;
}

export const STAPLES: Staple[] = [
  // Handtraps
  {
    name: 'Ash Blossom & Joyous Spring',
    short: 'Ash',
    side: 'opponent',
    kind: 'discard',
    negation: 'EFFECT_TOP',
    hits: ['FROM_DECK'],
  },
  {
    name: 'Infinite Impermanence',
    short: 'Imperm',
    side: 'opponent',
    kind: 'trapFromHand',
    negation: 'CARD_TOP',
    hits: ['FIELD_MONSTER_EFFECT'],
  },
  {
    name: 'Nibiru, the Primal Being',
    short: 'Nibiru',
    side: 'opponent',
    kind: 'summonSelf',
    hits: ['FIFTH_SUMMON'],
  },
  {
    name: 'Effect Veiler',
    short: 'Veiler',
    side: 'opponent',
    kind: 'discard',
    negation: 'CARD_TOP',
    hits: ['FIELD_MONSTER_EFFECT'],
  },
  {
    name: 'Ghost Belle & Haunted Mansion',
    short: 'Belle',
    side: 'opponent',
    kind: 'discard',
    negation: 'EFFECT_TOP',
    hits: ['FROM_GY'],
  },
  {
    name: 'Ghost Ogre & Snow Rabbit',
    short: 'Ogre',
    side: 'opponent',
    kind: 'discard',
    hits: ['FIELD_EFFECT'],
    removes: 'destroy',
  },
  {
    name: 'Ghost Mourner & Moonlit Chill',
    short: 'Mourner',
    side: 'opponent',
    kind: 'discard',
    negation: 'CARD_TOP',
  },
  {
    name: 'Droll & Lock Bird',
    short: 'Droll',
    side: 'opponent',
    kind: 'discard',
    hits: ['ADD_FROM_DECK'],
  },
  {
    name: 'D.D. Crow',
    short: 'Crow',
    side: 'opponent',
    kind: 'discard',
    hits: ['GY_NEEDED_LATER'],
    removes: 'banishFromGy',
  },
  {
    name: 'PSY-Framegear Gamma',
    short: 'Gamma',
    side: 'opponent',
    kind: 'summonSelf',
    negation: 'ACTIVATION_TOP',
    hits: ['MONSTER_EFFECT_NO_OPP_MONSTER'],
    removes: 'destroy',
  },
  {
    name: 'Mulcharmy Fuwalos',
    short: 'Fuwalos',
    side: 'opponent',
    kind: 'discard',
    hits: ['TURN_START_DECK_SUMMONS'],
  },
  {
    name: 'Mulcharmy Purulia',
    short: 'Purulia',
    side: 'opponent',
    kind: 'discard',
    hits: ['TURN_START_HAND_SUMMONS'],
  },
  { name: 'Dimension Shifter', short: 'Shifter', side: 'opponent', kind: 'discard' },
  // Unterbrechungen vom Feld
  {
    name: 'Solemn Judgment',
    short: 'Judgment',
    side: 'opponent',
    kind: 'setTrap',
    negation: 'ACTIVATION_OR_SUMMON',
    hits: ['SUMMON', 'SPELL_TRAP_ACTIVATION'],
    removes: 'destroy',
    needsSet: true,
  },
  {
    name: 'Solemn Strike',
    short: 'Strike',
    side: 'opponent',
    kind: 'setTrap',
    negation: 'ACTIVATION_OR_SUMMON',
    hits: ['SPECIAL_SUMMON', 'MONSTER_EFFECT'],
    removes: 'destroy',
    needsSet: true,
  },
  {
    name: 'Solemn Warning',
    short: 'Warning',
    side: 'opponent',
    kind: 'setTrap',
    negation: 'ACTIVATION_OR_SUMMON',
    hits: ['SUMMON', 'SUMMONING_EFFECT'],
    removes: 'destroy',
    needsSet: true,
  },
  { name: 'Skill Drain', short: 'Skill Drain', side: 'opponent', kind: 'setTrap', needsSet: true },
  { name: 'Evenly Matched', short: 'Evenly', side: 'opponent', kind: 'setTrap', needsSet: true },
  // Antworten der eigenen Seite
  {
    name: 'Called by the Grave',
    short: 'Called',
    side: 'self',
    kind: 'quickPlay',
    negation: 'NAME_TOP',
  },
  {
    name: 'Crossout Designator',
    short: 'Crossout',
    side: 'self',
    kind: 'quickPlay',
    negation: 'NAME_TOP',
  },
  {
    name: 'Forbidden Droplet',
    short: 'Droplet',
    side: 'self',
    kind: 'quickPlay',
    negation: 'CARD_TOP',
  },
];

/**
 * Baut einen ACTIVATE-Knoten für eine Reaktion unter `parent`.
 * Die Karteninstanz wird bei Bedarf über die Aktivierungsbewegung angelegt (Hand bzw. gesetzte Falle).
 */
export function reactionNode(
  /** null: neue Line ab der Starthand (etwa Mulcharmy am Anfang des Zuges) */
  parent: ComboNodeData | null,
  card: CardData,
  /** null: freie Karte ohne voreingestellte Bewegungen und Negierung */
  reaction: Pick<Staple, 'kind' | 'negation'> | null,
  player: Player,
  before: GameState,
  ancestors: ComboNodeData[]
): ComboNodeData {
  const instanceId =
    findInstance(before, card.id, player, reaction?.kind ?? 'discard') ?? newInstanceId(card.id);
  const firstActivated = card.effects.findIndex((e) => e.activated);
  const base = { instanceId, cardId: card.id, owner: player };

  const costMoves: CardMove[] = [];
  const resolveMoves: CardMove[] = [];
  switch (reaction?.kind) {
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
    parentId: parent?.id ?? null,
    kind: 'ACTIVATE',
    player,
    edgeLabel: card.name,
    instanceId,
    cardId: card.id,
    effectIndex: firstActivated >= 0 ? firstActivated : 0,
    costMoves,
    resolveMoves,
    negates: defaultNegation(reaction?.negation, player, before, ancestors),
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
