import type { CardEffect } from '@/lib/cards/effects';
import { onField, type CardData, type GameState, type PlacedCard } from '@/lib/combo/state';
import { interruptionsOf } from '@/lib/combo/endboard';
import type { DefaultNegation, HitPattern, Staple } from '@/lib/combo/reactions';

/**
 * Gegnerboard als Störquelle (Lücke L1): Wer Going Second plant, stellt das Board des Gegners
 * in den Startzustand. Hier wird aus den liegenden Permanents abgeleitet, welchen Schritt der
 * eigenen Line sie beantworten können, damit der Stresstest sie wie Staples behandelt.
 *
 * Erkannt wird nur, was im Kartentext eindeutig negiert (PSCT-Muster). Alles andere liegt als
 * Störquelle ohne Muster in der Leiste: der Nutzer hängt die Unterbrechung selbst an (Prinzip 11).
 */

/** Schlüssel eines Boardkarten-Eintrags; getrennt je Instanz, damit zwei Kopien nicht verschmelzen */
export const boardThreatKey = (instanceId: string) => `board:${instanceId}`;
export const isBoardThreat = (staple: string) => staple.startsWith('board:');

export interface BoardThreat<C extends CardData = CardData> {
  staple: Staple;
  card: C;
  /** Instanz auf dem Gegnerboard, die die Unterbrechung stellt */
  instanceId: string;
}

const negates = (e: CardEffect) => e.patterns.some((p) => p.startsWith('NEG_'));

/** Was die Negierung abdeckt; die Nomen stehen in Bedingung oder Auflösung desselben Satzes */
const ANSWERS_MONSTER = /monster(?:'s)? effects?\b|effects? of [^.;]*\bmonsters?\b/i;
const ANSWERS_SPELL_TRAP = /Spell\/Trap|Spell or Trap|\bSpell Cards?\b|\bTrap Cards?\b/i;
/** Die Beschwörung selbst wird negiert, nicht der Effekt dahinter */
const ANSWERS_SUMMON =
  /negate the (?:Normal |Special |Flip )?Summon|would be (?:Normal |Special |Flip )?Summoned/i;
/** Negiert eine Karte oder einen Effekt, der beschwört (Solemn Warning) */
const ANSWERS_SUMMONING_EFFECT = /includes an effect that (?:Special )?Summons/i;
const DESTROYS = /and if you do, destroy/i;

/** Negierungsart der Karte, für das voreingestellte Ziel im Knoten */
function negationOf(effect: CardEffect, summon: boolean): DefaultNegation | undefined {
  const { patterns } = effect;
  if (summon) return 'ACTIVATION_OR_SUMMON';
  if (patterns.includes('NEG_ACTIVATION') || patterns.includes('NEG_ACT_DESTROY'))
    return 'ACTIVATION_TOP';
  if (patterns.includes('NEG_EFFECT_CHAINED')) return 'EFFECT_TOP';
  if (patterns.includes('NEG_EFFECTS_LINGER')) return 'CARD_TOP';
  return undefined;
}

/**
 * Muster der Karte: Welchen Schritt der eigenen Line kann sie beantworten?
 * Gewertet wird nur, was als Chain Link negiert. Ein Quick-Effekt, der bloss zerstört, trifft
 * jeden Schritt gleich; ein Floodgate wie Skill Drain gilt für den ganzen Zug. Beide bekommen
 * kein Muster und hängen damit nur von Hand an einem Schritt (Prinzip 11).
 */
function answersOf(card: CardData): Pick<Staple, 'hits' | 'negation' | 'removes'> {
  const hits = new Set<HitPattern>();
  let negation: DefaultNegation | undefined;
  let removes: Staple['removes'];

  for (const effect of card.effects) {
    if (!effect.activated || !negates(effect) || effect.patterns.includes('NEG_CONTINUOUS'))
      continue;
    const { text } = effect;
    // Nur was die Negierungsklausel selbst nennt: „would be Special Summoned“ trifft enger als „would be Summoned“
    const summon = ANSWERS_SUMMON.exec(text);
    if (summon) hits.add(/Special/i.test(summon[0]) ? 'SPECIAL_SUMMON' : 'SUMMON');
    if (ANSWERS_SUMMONING_EFFECT.test(text)) hits.add('SUMMONING_EFFECT');
    if (ANSWERS_MONSTER.test(text)) hits.add('MONSTER_EFFECT');
    if (ANSWERS_SPELL_TRAP.test(text)) hits.add('SPELL_TRAP_ACTIVATION');
    negation ??= negationOf(effect, summon !== null);
    if (DESTROYS.test(text)) removes = 'destroy';
  }

  return {
    ...(hits.size > 0 && { hits: [...hits] }),
    ...(negation && { negation }),
    ...(removes && { removes }),
  };
}

/** Kurzname für Chips und Branch-Namen: „Apollousa, Bow of the Goddess“ wird zu „Apollousa“ */
export function shortName(name: string): string {
  const head = name.split(/[,:]/)[0].trim() || name;
  return head.length > 18 ? `${head.slice(0, 17)}…` : head;
}

/** Permanents des Gegners im Zustand, in stabiler Reihenfolge */
function opponentPermanents(state: GameState): PlacedCard[] {
  return Object.values(state.cards)
    .filter((c) => onField(c.zone) && c.controller === 'opponent')
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId));
}

/**
 * Störquellen aus dem Gegnerboard. `skipCardIds` lässt Karten weg, die schon als Staple
 * in der Leiste stehen (etwa eine gesetzte Solemn Judgment), damit kein Chip doppelt erscheint.
 */
export function boardThreats<C extends CardData>(
  state: GameState,
  cards: Map<string, C>,
  skipCardIds: ReadonlySet<string> = new Set()
): BoardThreat<C>[] {
  return opponentPermanents(state).flatMap((placed) => {
    if (skipCardIds.has(placed.cardId)) return [];
    const card = cards.get(placed.cardId);
    if (!card || interruptionsOf(card, placed) === 0) return [];
    const staple: Staple = {
      name: boardThreatKey(placed.instanceId),
      short: shortName(card.name),
      side: 'opponent',
      // Eine gesetzte Karte wird aufgedeckt, eine offene liegt schon richtig
      kind: placed.position === 'SET' ? 'setTrap' : 'onField',
      ...answersOf(card),
    };
    return [{ staple, card, instanceId: placed.instanceId }];
  });
}
