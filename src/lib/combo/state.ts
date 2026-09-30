import type { CardEffect, EffectOpt } from '@/lib/cards/effects';

/**
 * Gamestate einer Combo: wird nicht gespeichert, sondern aus Startzustand und den Knoten auf dem
 * Pfad von der Wurzel bis zum gewählten Knoten berechnet. Regeln nach RULING_MECHANICS
 * (src/lib/rulings/mechanics.ts); was nicht eindeutig ist, wird als Warnung gemeldet statt verboten.
 */

export type Player = 'self' | 'opponent';
export type Zone =
  'HAND' | 'DECK' | 'EXTRA' | 'MONSTER' | 'SPELL_TRAP' | 'FIELD' | 'GY' | 'BANISHED';
/** SET = verdeckt (Monster in Verteidigung oder gesetzte Spell/Trap); ATK bei Spell/Trap = offen */
export type Position = 'ATK' | 'DEF' | 'SET';

export interface CardData {
  id: string;
  name: string;
  type: string;
  race?: string | null;
  effects: CardEffect[];
}

export interface PlacedCard {
  instanceId: string;
  cardId: string;
  owner: Player;
  controller: Player;
  zone: Zone;
  slot?: number;
  position?: Position;
  /** Zählt Ortswechsel und Verdecken; Soft OPT und Effekt-Negierung gelten pro Epoche */
  epoch: number;
}

export interface CardMove {
  instanceId: string;
  /** Nötig, wenn die Karte im Startzustand nicht vorkommt (z. B. aus dem Deck gesucht) */
  cardId?: string;
  owner?: Player;
  from: Zone;
  to: Zone;
  slot?: number;
  position?: Position;
  controller?: Player;
}

export type NodeKind = 'ACTION' | 'ACTIVATE' | 'OPPONENT' | 'RESOLVE' | 'END';

export type Negation =
  /** Aktivierung negiert (Solemn Strike, Counter Traps) */
  | { type: 'ACTIVATION'; nodeId: string }
  /** Effekt des gechainten Links negiert (Ash Blossom) */
  | { type: 'EFFECT'; nodeId: string }
  /** Beschwörung negiert (Solemn Judgment); nodeId ist der ACTION-Knoten der Beschwörung */
  | { type: 'SUMMON'; nodeId: string }
  /** Effekte einer Karte bis Zugende negiert (Imperm, Veiler) */
  | { type: 'CARD'; instanceId: string }
  /** Namenssperre (Called by the Grave, Crossout Designator) */
  | { type: 'NAME'; cardId: string };

export interface ComboNodeData {
  id: string;
  parentId: string | null;
  kind: NodeKind;
  player: Player;
  edgeLabel?: string | null;
  /** Aktivierende Karte bei ACTIVATE */
  instanceId?: string | null;
  cardId?: string | null;
  effectIndex?: number | null;
  /** ACTION: Art der Handlung; NORMAL_SUMMON zählt für das Normal-Summon-Limit */
  action?: 'NORMAL_SUMMON' | 'SPECIAL_SUMMON' | 'SET' | 'OTHER' | null;
  /** Bewegungen bei Aktivierung: Kosten, Karte aufs Feld legen */
  costMoves?: CardMove[];
  /** Bewegungen bei Auflösung (ACTIVATE) bzw. sofort (ACTION) */
  resolveMoves?: CardMove[];
  negates?: Negation | null;
  /** Manueller Eingriff: zählt diese Aktivierung für den OPT? Überschreibt die Regel */
  optOverride?: boolean | null;
}

export interface StartState {
  cards: Array<Omit<PlacedCard, 'epoch' | 'controller'> & { controller?: Player }>;
}

export interface ChainLink {
  nodeId: string;
  player: Player;
  instanceId?: string;
  cardId?: string;
  effectIndex?: number;
  spellSpeed: 1 | 2 | 3;
  negated?: 'ACTIVATION' | 'EFFECT';
  /** Karte war bei der Aktivierung eine Spell/Trap auf dem Feld (Kartenaktivierung) */
  cardActivation: boolean;
  /** Schlüssel der verbrauchten OPT-Zähler, für die Rücknahme bei negierter Aktivierung */
  optKeys: string[];
  optWording?: EffectOpt['wording'];
}

export interface Warning {
  nodeId: string;
  message: string;
}

export interface GameState {
  cards: Record<string, PlacedCard>;
  chain: ChainLink[];
  /** OPT-Schlüssel -> Anzahl Nutzungen in diesem Zug */
  optUsage: Record<string, number>;
  normalSummonUsed: boolean;
  /** Karten mit negierten Effekten: instanceId -> Epoche, in der die Negierung gilt */
  negatedCards: Record<string, number>;
  negatedNames: string[];
  warnings: Warning[];
}

export function initialState(start: StartState): GameState {
  const cards: Record<string, PlacedCard> = {};
  for (const c of start.cards) {
    cards[c.instanceId] = { ...c, controller: c.controller ?? c.owner, epoch: 0 };
  }
  return {
    cards,
    chain: [],
    optUsage: {},
    normalSummonUsed: false,
    negatedCards: {},
    negatedNames: [],
    warnings: [],
  };
}

/** Pfad von der Wurzel bis zum Knoten */
export function pathTo(nodes: ComboNodeData[], nodeId: string): ComboNodeData[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const path: ComboNodeData[] = [];
  const seen = new Set<string>();
  for (let n = byId.get(nodeId); n; n = n.parentId ? byId.get(n.parentId) : undefined) {
    if (seen.has(n.id)) throw new Error(`Zyklus im Combo-Baum bei Knoten ${n.id}`);
    seen.add(n.id);
    path.unshift(n);
  }
  if (path.length === 0) throw new Error(`Knoten ${nodeId} nicht gefunden`);
  return path;
}

export function stateAt(
  nodes: ComboNodeData[],
  nodeId: string,
  start: StartState,
  cards: Map<string, CardData>
): GameState {
  const path = pathTo(nodes, nodeId);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return path.reduce((state, node) => applyNode(state, node, cards, byId), initialState(start));
}

/**
 * Zustand nach jedem Knoten des Baums in einem Durchlauf (für den Canvas).
 * Knoten mit parentId null sind die ersten Schritte nach dem Startzustand.
 */
export function statesForTree(
  nodes: ComboNodeData[],
  start: StartState,
  cards: Map<string, CardData>
): Map<string, GameState> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map<string | null, ComboNodeData[]>();
  for (const node of nodes) {
    const key = node.parentId ?? null;
    children.set(key, [...(children.get(key) ?? []), node]);
  }

  const states = new Map<string, GameState>();
  const visit = (parent: GameState, node: ComboNodeData) => {
    if (states.has(node.id)) return; // Schutz gegen Zyklen
    const state = applyNode(parent, node, cards, byId);
    states.set(node.id, state);
    for (const child of children.get(node.id) ?? []) visit(state, child);
  };
  const initial = initialState(start);
  for (const root of children.get(null) ?? []) visit(initial, root);
  return states;
}

/** Warnungen, die ein Knoten selbst ausgelöst hat */
export function warningsOf(state: GameState | undefined, nodeId: string): string[] {
  return state?.warnings.filter((w) => w.nodeId === nodeId).map((w) => w.message) ?? [];
}

export function applyNode(
  prev: GameState,
  node: ComboNodeData,
  cards: Map<string, CardData>,
  byId: Map<string, ComboNodeData>
): GameState {
  const state = structuredClone(prev);
  const warn = (message: string) => state.warnings.push({ nodeId: node.id, message });

  switch (node.kind) {
    case 'ACTION': {
      if (node.action === 'NORMAL_SUMMON') {
        if (state.normalSummonUsed) warn('Normal Summon in diesem Zug bereits verbraucht');
        state.normalSummonUsed = true;
      }
      applyMoves(state, node.resolveMoves ?? [], warn);
      break;
    }
    case 'ACTIVATE':
      activate(state, node, cards, warn);
      break;
    case 'RESOLVE':
      if (state.chain.length === 0) warn('Keine offene Chain zum Auflösen');
      resolveChain(state, cards, byId, warn);
      break;
    case 'OPPONENT':
    case 'END':
      break;
  }
  return state;
}

function applyMoves(state: GameState, moves: CardMove[], warn: (m: string) => void) {
  for (const move of moves) {
    let card = state.cards[move.instanceId];
    if (!card) {
      if (!move.cardId) {
        warn(`Unbekannte Karteninstanz ${move.instanceId}`);
        continue;
      }
      // Karte stammt aus einem nicht vollständig erfassten Deck
      card = state.cards[move.instanceId] = {
        instanceId: move.instanceId,
        cardId: move.cardId,
        owner: move.owner ?? 'self',
        controller: move.owner ?? 'self',
        zone: move.from,
        epoch: 0,
      };
    }
    if (card.zone !== move.from) {
      warn(`${move.instanceId} liegt in ${card.zone}, nicht in ${move.from}`);
    }

    const flipsDown = move.position === 'SET' && card.position !== 'SET';
    if (card.zone !== move.to || flipsDown) {
      card.epoch++;
      delete state.negatedCards[card.instanceId];
    }
    card.zone = move.to;
    card.slot = move.slot;
    card.position = onField(move.to) ? (move.position ?? card.position) : undefined;
    // Wer die Karte kontrolliert, ändert sich nur auf dem Feld; sonst gehört sie wieder dem Besitzer
    card.controller = onField(move.to) ? (move.controller ?? card.controller) : card.owner;
  }
}

export function onField(zone: Zone): boolean {
  return zone === 'MONSTER' || zone === 'SPELL_TRAP' || zone === 'FIELD';
}

function activate(
  state: GameState,
  node: ComboNodeData,
  cards: Map<string, CardData>,
  warn: (m: string) => void
) {
  const card = node.cardId ? cards.get(node.cardId) : undefined;
  const effect = card && node.effectIndex != null ? card.effects[node.effectIndex] : undefined;
  const instance = node.instanceId ? state.cards[node.instanceId] : undefined;
  if (node.cardId && !card) warn(`Kartendaten für ${node.cardId} fehlen`);

  // Effekt-Negierung vor der Aktivierung (Imperm, Veiler, Called by the Grave)
  if (instance && state.negatedCards[instance.instanceId] === instance.epoch) {
    warn(`Effekte von ${card?.name ?? instance.cardId} sind negiert`);
  }
  if (node.cardId && state.negatedNames.includes(node.cardId)) {
    warn(`Effekte von ${card?.name ?? node.cardId} sind per Namenssperre negiert`);
  }

  // Spell Speed: ab Chain Link 2 mindestens 2 und nicht niedriger als der vorherige Link
  const spellSpeed = card ? spellSpeedOf(card, node.effectIndex ?? 0, effect) : 1;
  const top = state.chain.at(-1);
  const isTrigger = effect?.patterns.some((p) => p.startsWith('TRIGGER_')) ?? false;
  if (top && !isTrigger && (spellSpeed < 2 || spellSpeed < top.spellSpeed)) {
    warn(`Spell Speed ${spellSpeed} kann nicht auf Spell Speed ${top.spellSpeed} gechaint werden`);
  }

  // OPT-Schlüssel vor den Kosten bestimmen: "diese Karte abwerfen" würde sonst die Epoche verschieben
  const optKeys = card && effect?.opt ? optKeysFor(node, card, effect.opt, state) : [];
  applyMoves(state, node.costMoves ?? [], warn);

  // Kartenaktivierung: die Spell/Trap liegt nach den Aktivierungsbewegungen auf dem Feld.
  // Erst danach prüfen, weil die Instanz auch erst durch diese Bewegung entstehen kann.
  const placed = node.instanceId ? state.cards[node.instanceId] : undefined;
  const cardActivation =
    !!card &&
    /Spell|Trap/.test(card.type) &&
    (node.effectIndex ?? 0) === 0 &&
    !!placed &&
    onField(placed.zone);

  const counts = node.optOverride ?? true;
  if (counts && effect?.opt) {
    for (const key of optKeys) {
      if ((state.optUsage[key] ?? 0) >= effect.opt.limit) {
        warn(`OPT von ${card!.name} ist in diesem Zug bereits verbraucht`);
      }
      state.optUsage[key] = (state.optUsage[key] ?? 0) + 1;
    }
  }

  state.chain.push({
    nodeId: node.id,
    player: node.player,
    instanceId: node.instanceId ?? undefined,
    cardId: node.cardId ?? undefined,
    effectIndex: node.effectIndex ?? undefined,
    spellSpeed,
    cardActivation,
    optKeys: counts ? optKeys : [],
    optWording: effect?.opt?.wording,
  });
}

function optKeysFor(
  node: Pick<ComboNodeData, 'instanceId' | 'effectIndex' | 'player'>,
  card: CardData,
  opt: EffectOpt,
  state: GameState
): string[] {
  if (opt.kind === 'SOFT') {
    // Soft OPT gilt pro Kopie und Ortsepoche
    const epoch = node.instanceId ? (state.cards[node.instanceId]?.epoch ?? 0) : 0;
    return [`soft:${node.instanceId ?? card.id}:${epoch}:${node.effectIndex}`];
  }
  // Hard OPT gilt pro Spieler und Kartenname
  // "activate 1 X per turn" zählt pro Kartenname, gemeinsame Klauseln pro Gruppe, sonst pro Effekt
  if (opt.wording === 'activateCard') return [`card:${node.player}:${card.name}`];
  return [`hard:${node.player}:${opt.group ?? `${card.name}#${node.effectIndex}`}`];
}

export function spellSpeedOf(card: CardData, effectIndex: number, effect?: CardEffect): 1 | 2 | 3 {
  if (/Trap/.test(card.type)) {
    if (card.race === 'Counter' && effectIndex === 0) return 3;
    return effectIndex === 0 || effect?.patterns.includes('QUICK') ? 2 : 1;
  }
  if (/Spell/.test(card.type) && card.race === 'Quick-Play' && effectIndex === 0) return 2;
  return effect?.patterns.includes('QUICK') ? 2 : 1;
}

const CLEANUP_RACES = new Set(['Normal', 'Quick-Play', 'Ritual', 'Counter']);

function resolveChain(
  state: GameState,
  cards: Map<string, CardData>,
  byId: Map<string, ComboNodeData>,
  warn: (m: string) => void
) {
  // Vom höchsten Link bis Chain Link 1
  for (let i = state.chain.length - 1; i >= 0; i--) {
    const link = state.chain[i];
    const node = byId.get(link.nodeId);
    if (!node) continue;

    if (link.negated === 'ACTIVATION') {
      // "activate"-Klauseln zählen negierte Aktivierungen nicht; "use" und Soft OPT schon
      const refunds = link.optWording === 'activate' || link.optWording === 'activateCard';
      if (refunds && node.optOverride == null) {
        for (const key of link.optKeys) state.optUsage[key] = Math.max(0, state.optUsage[key] - 1);
      }
      continue;
    }
    if (link.negated === 'EFFECT') continue;

    // Auf dem Feld negierte Karte löst ihren Effekt ohne Wirkung auf
    const instance = link.instanceId ? state.cards[link.instanceId] : undefined;
    if (
      instance &&
      onField(instance.zone) &&
      state.negatedCards[instance.instanceId] === instance.epoch
    ) {
      continue;
    }

    applyMoves(state, node.resolveMoves ?? [], warn);
    if (node.negates) applyNegation(state, node.negates, i, byId, warn);
  }

  // Aufräumen nach der Chain: Normal/Quick-Play/Ritual Spell, Normal/Counter Trap und
  // Spell/Trap mit negierter Aktivierung gehen auf den Friedhof; Continuous/Field/Equip bleiben
  for (const link of state.chain) {
    const instance = link.instanceId ? state.cards[link.instanceId] : undefined;
    const card = link.cardId ? cards.get(link.cardId) : undefined;
    if (!instance || !card || !link.cardActivation || !onField(instance.zone)) continue;
    if (link.negated === 'ACTIVATION' || CLEANUP_RACES.has(card.race ?? '')) {
      applyMoves(state, [{ instanceId: instance.instanceId, from: instance.zone, to: 'GY' }], warn);
    }
  }
  state.chain = [];
}

function applyNegation(
  state: GameState,
  negation: Negation,
  linkIndex: number,
  byId: Map<string, ComboNodeData>,
  warn: (m: string) => void
) {
  switch (negation.type) {
    case 'ACTIVATION':
    case 'EFFECT': {
      const target = state.chain.findIndex((l) => l.nodeId === negation.nodeId);
      if (target < 0 || target >= linkIndex) {
        warn('Negierung zielt auf keinen tieferen Chain Link');
        return;
      }
      state.chain[target].negated = negation.type;
      return;
    }
    case 'SUMMON': {
      const summon = byId.get(negation.nodeId);
      if (!summon || summon.kind !== 'ACTION') {
        warn('Negierte Beschwörung nicht gefunden');
        return;
      }
      // Die beschworenen Monster waren nie korrekt auf dem Feld und gehen auf den Friedhof.
      // Eine negierte Normal Summon bleibt verbraucht.
      for (const move of summon.resolveMoves ?? []) {
        const card = state.cards[move.instanceId];
        if (card && move.to === 'MONSTER' && card.zone === 'MONSTER') {
          applyMoves(state, [{ instanceId: card.instanceId, from: 'MONSTER', to: 'GY' }], warn);
        }
      }
      return;
    }
    case 'CARD': {
      const card = state.cards[negation.instanceId];
      if (!card) return;
      state.negatedCards[card.instanceId] = card.epoch;
      // Effekte dieser Karte weiter unten in der Chain, die auf dem Feld auflösen, sind ebenfalls negiert
      for (let i = 0; i < linkIndex; i++) {
        if (state.chain[i].instanceId === card.instanceId && onField(card.zone)) {
          state.chain[i].negated ??= 'EFFECT';
        }
      }
      return;
    }
    case 'NAME':
      if (!state.negatedNames.includes(negation.cardId)) state.negatedNames.push(negation.cardId);
      for (let i = 0; i < linkIndex; i++) {
        if (state.chain[i].cardId === negation.cardId) state.chain[i].negated ??= 'EFFECT';
      }
      return;
  }
}

/** Karten eines Spielers in einer Zone, z. B. für das Zustandspanel */
export function cardsIn(state: GameState, player: Player, zone: Zone): PlacedCard[] {
  return Object.values(state.cards).filter(
    (c) => c.zone === zone && (onField(zone) ? c.controller : c.owner) === player
  );
}

/** Ist der OPT dieses Effekts für den Spieler noch frei? (für Vorschläge, ohne den Zustand zu ändern) */
export function isOptAvailable(
  state: GameState,
  activation: { instanceId: string; effectIndex: number; player: Player },
  card: CardData
): boolean {
  const opt = card.effects[activation.effectIndex]?.opt;
  if (!opt) return true;
  return optKeysFor(activation, card, opt, state).every(
    (key) => (state.optUsage[key] ?? 0) < opt.limit
  );
}
