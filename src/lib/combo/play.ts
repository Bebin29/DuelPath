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
import { boardOf, MAIN_ZONES } from '@/lib/combo/board';
import { childrenOf, nextRank } from '@/lib/combo/lines';
import { newNode } from '@/lib/combo/tree';

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
  | { kind: 'resolve' }
  | { kind: 'end' };

export const isMonster = (card: CardData | undefined) => !!card && /Monster/.test(card.type);
export const isSpell = (card: CardData | undefined) => !!card && /Spell/.test(card.type);
export const isTrap = (card: CardData | undefined) => !!card && /Trap/.test(card.type);
export const isFieldSpell = (card: CardData | undefined) => isSpell(card) && card?.race === 'Field';
export const isExtraDeckMonster = (card: CardData | undefined) =>
  !!card && /Fusion|Synchro|XYZ|Link/.test(card.type);

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
  if (state.chain.length > 0 && intent.kind !== 'resolve' && !chaining) {
    push(newNode(parent, 'RESOLVE'));
    // Der neue Schritt rechnet mit dem aufgelösten Zustand: Karten können sich dabei bewegt haben
    const byId = new Map([...ctx.nodes, ...nodes].map((n) => [n.id, n]));
    state = applyNode(state, nodes[0], cards, byId);
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
      // Materialien zuerst: Fusion, Synchro und Link schicken sie auf den Friedhof
      const materials = (intent.materials ?? [])
        .map((id) => moveOf(state, id, 'GY'))
        .filter((m): m is CardMove => m !== null);
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
    case 'resolve':
      if (state.chain.length > 0) push(newNode(parent, 'RESOLVE'));
      break;
    case 'end':
      push(newNode(parent, 'END'));
      break;
  }
  return nodes;
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
  if (/\bbanish this card\b/i.test(cost)) return compact([moveOf(state, instanceId, 'BANISHED')]);
  if (/\b(?:Tribute|discard|send) this card\b/i.test(cost))
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

/** Muss der Nutzer für die Kosten eine Karte abwerfen? */
export function needsDiscard(card: CardData | undefined, effectIndex: number): boolean {
  const cost = costPart(card?.effects[effectIndex]?.text ?? '');
  return !!cost && /\bdiscard (?:1|one|a) card\b/i.test(cost);
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
      const summoned = now.zone === 'MONSTER' && /\bSummoned\b/.test(effect.text);
      const sent =
        (now.zone === 'GY' || now.zone === 'BANISHED') &&
        /\b(?:sent to the GY|banished)\b/.test(effect.text);
      if (summoned || sent) offers.push({ instanceId: id, effectIndex: i, cardId: now.cardId });
    });
  }
  return offers.slice(0, 3);
}
