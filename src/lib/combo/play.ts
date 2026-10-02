import {
  applyNode,
  type CardData,
  type CardMove,
  type ComboNodeData,
  type GameState,
  type Player,
  type Position,
  type Zone,
} from '@/lib/combo/state';
import { boardOf, EMZ_LEFT, EMZ_RIGHT, MAIN_ZONES } from '@/lib/combo/board';
import { childrenOf, nextRank } from '@/lib/combo/lines';
import { newInstanceId, newNode } from '@/lib/combo/tree';

/**
 * Vom Handgriff am Board zum Schritt (UX-Plan 6.3 und 6.5).
 * Der Nutzer macht mit der Karte, was er im Spiel machen würde; hier entsteht daraus der Knoten.
 * Eine offene Chain wird vor dem nächsten Schritt aufgelöst, außer es wird ausdrücklich gechaint.
 */

export type PlayIntent =
  | { kind: 'normalSummon'; instanceId: string; slot?: number }
  | { kind: 'setMonster'; instanceId: string; slot?: number }
  | {
      kind: 'specialSummon';
      instanceId: string;
      slot?: number;
      position?: Position;
      materials?: string[];
    }
  | { kind: 'activate'; instanceId: string; effectIndex: number; slot?: number; chain?: boolean }
  | { kind: 'setSpellTrap'; instanceId: string; slot?: number }
  | { kind: 'move'; instanceId: string; to: Zone; slot?: number; controller?: Player }
  | { kind: 'changePosition'; instanceId: string }
  /** Spielmarke in eine freie Monsterzone (Scapegoat, Nibiru) */
  | { kind: 'token'; cardId: string; player: Player; slot?: number; position?: Position }
  | { kind: 'resolve' }
  | { kind: 'end' };

export const isMonster = (card: CardData | undefined) => !!card && /Monster/.test(card.type);
export const isSpell = (card: CardData | undefined) => !!card && /Spell/.test(card.type);
export const isTrap = (card: CardData | undefined) => !!card && /Trap/.test(card.type);
export const isFieldSpell = (card: CardData | undefined) => isSpell(card) && card?.race === 'Field';
export const isExtraDeckMonster = (card: CardData | undefined) =>
  !!card && /Fusion|Synchro|XYZ|Link/.test(card.type);
export const isXyz = (card: CardData | undefined) => !!card && /XYZ/.test(card.type);

/** Xyz-Materialien unter einem Monster */
export const materialsOf = (state: GameState, instanceId: string) =>
  Object.values(state.cards)
    .filter((c) => c.zone === 'MATERIAL' && c.attachedTo === instanceId)
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId));

/** Erste freie Monster- bzw. Zauber/Fallen-Zone des Spielers */
export function freeSlot(
  state: GameState,
  player: Player,
  zone: 'MONSTER' | 'SPELL_TRAP'
): number | undefined {
  const side = boardOf(state, player);
  const row = zone === 'MONSTER' ? side.monsters : side.spellTraps;
  const i = row.findIndex((c) => c === null);
  return i >= 0 && i < MAIN_ZONES ? i : undefined;
}

function moveOf(
  state: GameState,
  instanceId: string,
  to: Zone,
  extra: Partial<CardMove> = {}
): CardMove | null {
  const card = state.cards[instanceId];
  if (!card) return null;
  return { instanceId, cardId: card.cardId, from: card.zone, to, ...extra };
}

/** Wo eine Spell/Trap bei ihrer Aktivierung landet: Spielfeldzone oder freie Zauber/Fallen-Zone */
function placeSpellTrap(
  state: GameState,
  instanceId: string,
  card: CardData | undefined,
  slot?: number
) {
  const placed = state.cards[instanceId];
  if (!placed || placed.zone === 'SPELL_TRAP' || placed.zone === 'FIELD') return null;
  if (isFieldSpell(card)) return moveOf(state, instanceId, 'FIELD', { position: 'ATK' });
  return moveOf(state, instanceId, 'SPELL_TRAP', {
    slot: slot ?? freeSlot(state, placed.controller, 'SPELL_TRAP'),
    position: 'ATK',
  });
}

export interface StepContext {
  nodes: ComboNodeData[];
  /** Knoten, an den der neue Schritt anschließt; null = Starthand */
  parent: ComboNodeData | null;
  state: GameState;
  cards: Map<string, CardData>;
}

/** Knoten, die die Absicht erzeugt, in Reihenfolge (eine automatische Auflösung zuerst) */
export function buildStep(intent: PlayIntent, ctx: StepContext): ComboNodeData[] {
  const { cards } = ctx;
  let state = ctx.state;
  const nodes: ComboNodeData[] = [];
  let parent = ctx.parent;
  const push = (node: ComboNodeData) => {
    const rank = nodes.length === 0 ? nextRank(ctx.nodes, parent?.id ?? null) : 0;
    const withRank = { ...node, parentId: parent?.id ?? null, rank };
    nodes.push(withRank);
    parent = withRank;
  };

  const chaining = intent.kind === 'activate' && intent.chain;
  // Eine Auflösung hat keine Wahl: Liegt am Schritt schon ein RESOLVE, geht es dort weiter,
  // statt daneben einen zweiten als Branch anzulegen. Branches entstehen erst durch Reaktionen.
  const resolved = resolveOf(ctx.nodes, parent?.id ?? null);
  if (state.chain.length > 0 && intent.kind !== 'resolve' && !chaining) {
    if (resolved) parent = resolved;
    else push(newNode(parent, 'RESOLVE'));
    // Der neue Schritt rechnet mit dem aufgelösten Zustand: Karten können sich dabei bewegt haben
    const byId = new Map([...ctx.nodes, ...nodes].map((n) => [n.id, n]));
    state = applyNode(state, parent!, cards, byId);
  }

  const card = 'instanceId' in intent ? state.cards[intent.instanceId] : undefined;
  const data = card ? cards.get(card.cardId) : undefined;
  const base = (kind: ComboNodeData['kind']): ComboNodeData => ({
    ...newNode(parent, kind),
    player: card?.controller ?? 'self',
  });

  switch (intent.kind) {
    case 'normalSummon':
    case 'setMonster': {
      const set = intent.kind === 'setMonster';
      const move = moveOf(state, intent.instanceId, 'MONSTER', {
        slot: intent.slot ?? freeSlot(state, card?.controller ?? 'self', 'MONSTER'),
        position: set ? 'SET' : 'ATK',
      });
      if (!move) return nodes;
      push({
        ...base('ACTION'),
        action: set ? 'SET' : 'NORMAL_SUMMON',
        cardId: card?.cardId,
        resolveMoves: [move],
      });
      break;
    }
    case 'specialSummon': {
      const move = moveOf(state, intent.instanceId, 'MONSTER', {
        slot: intent.slot ?? freeSlot(state, card?.controller ?? 'self', 'MONSTER'),
        position: intent.position ?? 'ATK',
      });
      if (!move) return nodes;
      // Materialien zuerst: Fusion, Synchro und Link schicken sie auf den Friedhof,
      // beim Xyz liegen sie danach unter dem Monster
      const xyz = isXyz(data);
      // Xyz auf ein Xyz-Monster (Graflareio, Rank-Up): dessen Materialien wandern mit
      const transferred = xyz
        ? (intent.materials ?? []).flatMap((id) =>
            materialsOf(state, id).map((m) => ({
              instanceId: m.instanceId,
              cardId: m.cardId,
              from: 'MATERIAL' as const,
              to: 'MATERIAL' as const,
              attachTo: intent.instanceId,
            }))
          )
        : [];
      const materials = [
        ...transferred,
        ...(intent.materials ?? [])
          .map((id) =>
            xyz
              ? moveOf(state, id, 'MATERIAL', { attachTo: intent.instanceId })
              : moveOf(state, id, 'GY')
          )
          .filter((m): m is CardMove => m !== null),
      ];
      push({
        ...base('ACTION'),
        action: 'SPECIAL_SUMMON',
        cardId: card?.cardId,
        resolveMoves: [...materials, move],
      });
      break;
    }
    case 'activate': {
      const place =
        isSpell(data) || isTrap(data)
          ? placeSpellTrap(state, intent.instanceId, data, intent.slot)
          : null;
      push({
        ...base('ACTIVATE'),
        instanceId: intent.instanceId,
        cardId: card?.cardId,
        effectIndex: intent.effectIndex,
        costMoves: [
          ...(place ? [place] : []),
          ...costMovesFor(state, intent.instanceId, data, intent.effectIndex),
        ],
      });
      break;
    }
    case 'setSpellTrap': {
      const move = isFieldSpell(data)
        ? moveOf(state, intent.instanceId, 'FIELD', { position: 'SET' })
        : moveOf(state, intent.instanceId, 'SPELL_TRAP', {
            slot: intent.slot ?? freeSlot(state, card?.controller ?? 'self', 'SPELL_TRAP'),
            position: 'SET',
          });
      if (!move) return nodes;
      push({ ...base('ACTION'), action: 'SET', cardId: card?.cardId, resolveMoves: [move] });
      break;
    }
    case 'move': {
      const onBoard =
        intent.to === 'MONSTER' || intent.to === 'SPELL_TRAP' || intent.to === 'FIELD';
      const move = moveOf(state, intent.instanceId, intent.to, {
        ...(onBoard && intent.slot !== undefined && { slot: intent.slot }),
        ...(intent.to === 'MONSTER' && { position: 'ATK' as const }),
        ...(onBoard &&
          intent.controller &&
          intent.controller !== card?.owner && { controller: intent.controller }),
      });
      if (!move) return nodes;
      push({ ...base('ACTION'), action: 'OTHER', cardId: card?.cardId, resolveMoves: [move] });
      break;
    }
    case 'changePosition': {
      if (!card || card.zone !== 'MONSTER') return nodes;
      const next: Position = card.position === 'DEF' || card.position === 'SET' ? 'ATK' : 'DEF';
      push({
        ...base('ACTION'),
        action: 'OTHER',
        cardId: card.cardId,
        resolveMoves: [
          {
            instanceId: card.instanceId,
            cardId: card.cardId,
            from: 'MONSTER',
            to: 'MONSTER',
            slot: card.slot,
            position: next,
          },
        ],
      });
      break;
    }
    case 'token': {
      const slot = intent.slot ?? freeSlot(state, intent.player, 'MONSTER');
      push({
        ...newNode(parent, 'ACTION'),
        player: intent.player,
        action: 'SPECIAL_SUMMON',
        cardId: intent.cardId,
        resolveMoves: [
          {
            instanceId: newInstanceId(intent.cardId),
            cardId: intent.cardId,
            owner: intent.player,
            from: 'MONSTER',
            to: 'MONSTER',
            ...(slot !== undefined && { slot }),
            position: intent.position ?? 'DEF',
            token: true,
          },
        ],
      });
      break;
    }
    case 'resolve':
      if (state.chain.length > 0 && !resolved) push(newNode(parent, 'RESOLVE'));
      break;
    case 'end':
      push(newNode(parent, 'END'));
      break;
  }
  return nodes;
}

/** Vorhandene Auflösung der Chain direkt unter dem Schritt */
export function resolveOf(nodes: ComboNodeData[], parentId: string | null) {
  return childrenOf(nodes, parentId).find((c) => c.kind === 'RESOLVE');
}

/**
 * Kosten, die sich eindeutig aus dem Text ergeben: „banish this card“, „Tribute this card“,
 * „send this card to the GY“ (UX-Plan 6.4). Abwerfen und Ziele fragt die Schrittleiste ab.
 */
export function costMovesFor(
  state: GameState,
  instanceId: string,
  card: CardData | undefined,
  effectIndex: number
): CardMove[] {
  const text = card?.effects[effectIndex]?.text ?? '';
  const cost = costPart(text);
  if (!cost) return [];
  if (/\bbanish this (?:card|Continuous Spell|Continuous Trap)\b/i.test(cost))
    return compact([moveOf(state, instanceId, 'BANISHED')]);
  const detach = /\bdetach (\d+|one|two) (?:Xyz )?materials? from this card\b/i.exec(cost);
  if (detach) {
    const n = Number(detach[1]) || (detach[1].toLowerCase() === 'two' ? 2 : 1);
    return materialsOf(state, instanceId)
      .slice(0, n)
      .map((m) => ({
        instanceId: m.instanceId,
        cardId: m.cardId,
        from: 'MATERIAL' as const,
        to: 'GY' as const,
      }));
  }
  if (/\b(?:Tribute|discard|send) this (?:card|Continuous Spell|Continuous Trap)\b/i.test(cost))
    return compact([moveOf(state, instanceId, 'GY')]);
  return [];
}

/** Kostenteil nach PSCT: zwischen Doppelpunkt (Bedingung) und Semikolon */
export function costPart(text: string): string | null {
  const semi = text.indexOf(';');
  if (semi < 0) return null;
  const colon = text.lastIndexOf(':', semi);
  return text.slice(colon + 1, semi).trim();
}

/**
 * Muss der Nutzer eine Karte abwerfen? Als Kosten (vor dem Semikolon) oder als Teil der Wirkung,
 * etwa Branded Opening: „Discard 1 card, then take 1 …“.
 */
export function needsDiscard(
  card: CardData | undefined,
  effectIndex: number
): 'cost' | 'effect' | null {
  const text = card?.effects[effectIndex]?.text ?? '';
  const cost = costPart(text);
  const DISCARD = /\bdiscard (?:1|one|a) card\b/i;
  if (cost && DISCARD.test(cost)) return 'cost';
  const effect =
    cost === null ? text.slice(text.indexOf(':') + 1) : text.slice(text.indexOf(';') + 1);
  return DISCARD.test(effect) ? 'effect' : null;
}

const compact = <T>(list: (T | null)[]) => list.filter((x): x is T => x !== null);

/** Ergänzt eine Bewegung am Knoten, etwa aus der Abfrage „Was hast du gesucht?“ */
export function withMoves(
  node: ComboNodeData,
  key: 'costMoves' | 'resolveMoves',
  moves: CardMove[]
): ComboNodeData {
  return { ...node, [key]: [...(node[key] ?? []), ...moves] };
}

/**
 * Früheren Schritt ändern (UX-Plan 6.7): Der neue Schritt entsteht standardmäßig als Branch.
 * „Einfügen“ hängt die bisherige Fortsetzung hinter den neuen Schritt, „Ersetzen“ verwirft sie.
 */
export function insertBefore(nodes: ComboNodeData[], newId: string): ComboNodeData[] {
  const created = nodes.find((n) => n.id === newId);
  if (!created) return nodes;
  const main = childrenOf(nodes, created.parentId).find((c) => c.id !== newId);
  if (!main) return nodes;
  return nodes.map((n) => {
    if (n.id === main.id) return { ...n, parentId: lastOfChain(nodes, newId), rank: 0 };
    if (n.id === newId) return { ...n, rank: 0 };
    return n;
  });
}

export function replaceMain(nodes: ComboNodeData[], newId: string): ComboNodeData[] {
  const created = nodes.find((n) => n.id === newId);
  if (!created) return nodes;
  const doomed = new Set(
    childrenOf(nodes, created.parentId)
      .filter((c) => c.id !== newId)
      .map((c) => c.id)
  );
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of nodes) {
      if (n.parentId && doomed.has(n.parentId) && !doomed.has(n.id)) {
        doomed.add(n.id);
        grew = true;
      }
    }
  }
  return nodes
    .filter((n) => !doomed.has(n.id))
    .map((n) => (n.id === newId ? { ...n, rank: 0 } : n));
}

/** Letzter Knoten einer frisch angelegten Kette (automatische Auflösung plus Schritt) */
function lastOfChain(nodes: ComboNodeData[], id: string): string {
  let current = id;
  for (;;) {
    const kids = nodes.filter((n) => n.parentId === current);
    if (kids.length !== 1) return current;
    current = kids[0].id;
  }
}

/** Trigger, die der Schritt ausgelöst hat: frisch bewegte Karten mit „If this card is …“-Effekten (UX-Plan 6.5) */
export function triggerOffers(
  before: GameState,
  after: GameState,
  cards: Map<string, CardData>,
  isTrigger: (card: CardData, effectIndex: number) => boolean,
  isAvailable: (instanceId: string, effectIndex: number, card: CardData) => boolean
): { instanceId: string; effectIndex: number; cardId: string }[] {
  const offers: { instanceId: string; effectIndex: number; cardId: string }[] = [];
  for (const [id, now] of Object.entries(after.cards)) {
    const prev = before.cards[id];
    if (prev && prev.zone === now.zone && prev.position === now.position) continue;
    const card = cards.get(now.cardId);
    if (!card) continue;
    card.effects.forEach((effect, i) => {
      if (!effect.activated || !isTrigger(card, i) || !isAvailable(id, i, card)) return;
      if (now.zone === 'MONSTER' && !summonFits(effect.text, prev?.zone, before, after)) return;
      const summoned = now.zone === 'MONSTER' && /\bSummoned\b/.test(effect.text);
      const sent =
        (now.zone === 'GY' || now.zone === 'BANISHED') &&
        /\b(?:sent to the GY|banished)\b/.test(effect.text);
      if (summoned || sent) offers.push({ instanceId: id, effectIndex: i, cardId: now.cardId });
    });
  }
  return offers.slice(0, 3);
}

/**
 * Passt die Beschwörung zur Bedingung des Triggers? „If this card is Fusion Summoned“ nur aus dem
 * Extra Deck, „Normal Summoned“ ohne „or Special“ nur, wenn der Schritt den Normal Summon verbraucht.
 */
function summonFits(
  text: string,
  from: Zone | undefined,
  before: GameState,
  after: GameState
): boolean {
  const condition = text.split(':')[0];
  if (
    /\b(?:Fusion|Synchro|Xyz|Link) Summoned\b/i.test(condition) &&
    !/\bSpecial Summoned\b/.test(condition)
  )
    return from === 'EXTRA';
  if (/\bRitual Summoned\b/.test(condition) && !/\bSpecial Summoned\b/.test(condition))
    return from === 'HAND';
  if (/\bNormal Summoned\b/.test(condition) && !/\bSpecial Summoned\b/.test(condition))
    return after.normalSummonUsed && !before.normalSummonUsed;
  if (/\bSpecial Summoned\b/.test(condition) && !/\bNormal\b/.test(condition))
    return !(after.normalSummonUsed && !before.normalSummonUsed);
  return true;
}

export interface DropTarget {
  player: Player;
  zone: Zone;
  slot?: number;
}

export type DropMeaning =
  | {
      label: 'normalSummon' | 'setMonster' | 'specialSummon' | 'activate' | 'setSpellTrap' | 'move';
      intent: PlayIntent;
    }
  | { label: 'extraSummon'; instanceId: string; slot?: number };

/**
 * Was ein Ablegen bedeutet (UX-Plan 6.3), zugleich die Vorschau an der Zone beim Ziehen (UI-Plan 7.2.3).
 * Mit Umschalttaste wird gesetzt statt beschworen bzw. aktiviert.
 */
export function dropMeaning(
  state: GameState,
  cards: Map<string, CardData>,
  instanceId: string,
  target: DropTarget,
  shift = false
): DropMeaning | null {
  const card = state.cards[instanceId];
  if (!card) return null;
  const data = cards.get(card.cardId);
  const { zone, slot, player } = target;
  const same = card.zone === zone && (slot === undefined || card.slot === slot);
  if (same) return null;
  const mine = player === card.owner;

  if (zone === 'MONSTER' && mine) {
    if (card.zone === 'EXTRA' && isExtraDeckMonster(data))
      return { label: 'extraSummon', instanceId, slot };
    if (card.zone === 'HAND' && isMonster(data)) {
      if (shift) return { label: 'setMonster', intent: { kind: 'setMonster', instanceId, slot } };
      if (!state.normalSummonUsed)
        return { label: 'normalSummon', intent: { kind: 'normalSummon', instanceId, slot } };
      return { label: 'specialSummon', intent: { kind: 'specialSummon', instanceId, slot } };
    }
    if (card.zone !== 'MONSTER' && isMonster(data)) {
      return { label: 'specialSummon', intent: { kind: 'specialSummon', instanceId, slot } };
    }
  }
  if ((zone === 'SPELL_TRAP' || zone === 'FIELD') && mine && card.zone === 'HAND') {
    const fits =
      zone === 'FIELD'
        ? isFieldSpell(data)
        : (isSpell(data) && !isFieldSpell(data)) || isTrap(data);
    if (fits) {
      if (shift || isTrap(data))
        return { label: 'setSpellTrap', intent: { kind: 'setSpellTrap', instanceId, slot } };
      return { label: 'activate', intent: { kind: 'activate', instanceId, effectIndex: 0, slot } };
    }
  }
  return {
    label: 'move',
    intent: { kind: 'move', instanceId, to: zone, slot, controller: player },
  };
}

/** Freie Extra Monster Zone, links zuerst; eine belegt der Gegner aus seiner Sicht gespiegelt */
export function freeEmz(state: GameState): number | undefined {
  const mine = boardOf(state, 'self').extraMonsters;
  const theirs = boardOf(state, 'opponent').extraMonsters;
  if (!mine[0] && !theirs[1]) return EMZ_LEFT;
  if (!mine[1] && !theirs[0]) return EMZ_RIGHT;
  return undefined;
}

/**
 * Bewegungen aus einer beantworteten Abfrage (UX-Plan 6.4): gesuchte Karten auf die Hand,
 * beschworene in freie Monsterzonen, der Reihe nach.
 */
export function resultMoves(
  to: Zone,
  picked: string[],
  state: GameState,
  player: Player,
  /** Schon eingetragene Bewegungen desselben Schritts: deren Zonen sind belegt */
  pending: CardMove[] = []
): CardMove[] {
  const taken = new Set(
    pending.filter((m) => m.to === 'MONSTER' && m.slot !== undefined).map((m) => m.slot!)
  );
  const row = boardOf(state, player).monsters;
  return compact(
    picked.map((id) => {
      const card = state.cards[id];
      if (!card) return null;
      if (to !== 'MONSTER') return moveOf(state, id, to);
      const slot = row.findIndex((c, i) => c === null && !taken.has(i));
      if (slot >= 0) taken.add(slot);
      return moveOf(state, id, 'MONSTER', {
        ...(slot >= 0 && { slot }),
        position: 'ATK',
        ...(card.owner !== player && { controller: player }),
      });
    })
  );
}

/** Fusion: Materialien auf den Friedhof, das Fusionsmonster in die frei gewordene oder nächste Zone */
export function fusionMoves(
  fusionId: string,
  materials: string[],
  state: GameState,
  player: Player
): CardMove[] {
  const toGy = compact(materials.map((id) => moveOf(state, id, 'GY')));
  const freed: GameState = {
    ...state,
    cards: Object.fromEntries(
      Object.entries(state.cards).map(([id, c]) => [
        id,
        materials.includes(id) ? { ...c, zone: 'GY' as const, slot: undefined } : c,
      ])
    ),
  };
  return [...toGy, ...resultMoves('MONSTER', [fusionId], freed, player)];
}
