import type { CardEffect } from '@/lib/cards/effects';
import {
  onField,
  type CardData,
  type ComboNodeData,
  type GameState,
  type PlacedCard,
} from '@/lib/combo/state';
import { childrenOf } from '@/lib/combo/lines';

/**
 * Endboard und Auswertung (UX-Plan 6.9): Unterbrechungen auf Feld und Hand, Ressourcen und Kosten.
 * Erkannt wird aus den PSCT-Mustern; der Nutzer korrigiert pro Karte (Prinzip 11).
 */

const negates = (e: CardEffect) => e.patterns.some((p) => p.startsWith('NEG_'));
const quick = (e: CardEffect) => e.patterns.includes('QUICK');
/** Wirkt von der Hand im gegnerischen Zug: Handtraps und Fallen, die von der Hand aktiviert werden */
const FROM_HAND =
  /discard this card|send this card from your hand|activate this card from your hand|from your hand to the GY/i;

/**
 * Wie viele Unterbrechungen die Karte an ihrem Ort voraussichtlich stellt.
 * Gilt für beide Seiten: das Endboard zählt die eigenen Karten, das Gegnerboard die liegenden
 * Störquellen (opponent-board.ts). Wessen Karten gezählt werden, entscheidet der Aufrufer.
 */
export function interruptionsOf(card: CardData | undefined, placed: PlacedCard): number {
  if (!card) return 0;
  const active = card.effects.filter((e) => e.activated);
  const isTrap = /Trap/.test(card.type);
  switch (placed.zone) {
    case 'HAND':
      // Handtraps; Fallen wie Infinite Impermanence erlauben das in einem eigenen, nicht aktivierten Satz
      if (isTrap)
        return card.effects.some((e) => /activate this card from your hand/i.test(e.text)) ? 1 : 0;
      return active.some((e) => quick(e) && FROM_HAND.test(e.text)) ? 1 : 0;
    case 'MONSTER':
      if (placed.position === 'SET') return 0;
      return Math.min(2, active.filter((e) => quick(e) || negates(e)).length);
    case 'SPELL_TRAP':
    case 'FIELD':
      if (placed.position === 'SET') return isTrap || card.race === 'Quick-Play' ? 1 : 0;
      return active.some((e) => quick(e) || negates(e)) ? 1 : 0;
    default:
      return 0;
  }
}

const GY_EFFECT =
  /this card is in (?:your|the) GY|banish this card from your GY|this card from your GY/i;

export interface EndboardCard {
  placed: PlacedCard;
  /** Erkannte Unterbrechungen */
  detected: number;
  /** Gezählte Unterbrechungen, nach Korrektur des Nutzers */
  count: number;
}

export interface EndboardSummary {
  interruptions: number;
  /** Eigene Karten auf dem Feld, dann auf der Hand */
  field: EndboardCard[];
  hand: EndboardCard[];
  gyEffects: number;
  normalSummonLeft: boolean;
  /** Karten der Starthand, die die Line gebraucht hat („1-Card-Combo“) */
  startHandUsed: number;
  lp: number;
}

export function endboardSummary(
  state: GameState,
  start: GameState,
  cards: Map<string, CardData>,
  overrides?: Record<string, number> | null
): EndboardSummary {
  const mine = Object.values(state.cards)
    .filter((c) => (onField(c.zone) ? c.controller : c.owner) === 'self')
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId));
  const entry = (placed: PlacedCard): EndboardCard => {
    const detected = interruptionsOf(cards.get(placed.cardId), placed);
    return { placed, detected, count: overrides?.[placed.instanceId] ?? detected };
  };
  const field = mine.filter((c) => onField(c.zone)).map(entry);
  const hand = mine.filter((c) => c.zone === 'HAND').map(entry);
  const startHand = Object.values(start.cards).filter(
    (c) => c.zone === 'HAND' && c.owner === 'self'
  );
  return {
    interruptions: [...field, ...hand].reduce((sum, c) => sum + c.count, 0),
    field,
    hand,
    gyEffects: mine.filter(
      (c) =>
        c.zone === 'GY' &&
        cards.get(c.cardId)?.effects.some((e) => e.activated && GY_EFFECT.test(e.text))
    ).length,
    normalSummonLeft: !state.normalSummonUsed,
    startHandUsed: startHand.filter((c) => state.cards[c.instanceId]?.zone !== 'HAND').length,
    lp: state.lp.self,
  };
}

export interface LineEnd {
  leaf: ComboNodeData;
  /** Knoten auf dem Pfad, an denen die Line von der Hauptfortsetzung abweicht; leer = Hauptline */
  branches: ComboNodeData[];
}

/** Enden aller Lines in Baumreihenfolge, die Hauptline zuerst (Vergleich, UX-Plan 6.9) */
export function lineEnds(nodes: ComboNodeData[]): LineEnd[] {
  const ends: LineEnd[] = [];
  const walk = (parentId: string | null, branches: ComboNodeData[]) => {
    childrenOf(nodes, parentId).forEach((kid, i) => {
      const own = i > 0 ? [...branches, kid] : branches;
      if (childrenOf(nodes, kid.id).length === 0) ends.push({ leaf: kid, branches: own });
      else walk(kid.id, own);
    });
  };
  walk(null, []);
  return ends;
}

/** Karten vom Feld der Hauptline, die im Branch fehlen (nach Kartenname gezählt) */
export function missingCards(main: GameState, other: GameState): string[] {
  const fieldIds = (s: GameState) =>
    Object.values(s.cards)
      .filter((c) => onField(c.zone) && c.controller === 'self')
      .map((c) => c.cardId);
  const left = [...fieldIds(other)];
  return fieldIds(main).filter((id) => {
    const i = left.indexOf(id);
    if (i < 0) return true;
    left.splice(i, 1);
    return false;
  });
}
