import { PATTERNS, RULING_MECHANICS, type PatternKey, type RulingMechanic } from './mechanics';
import type { CardEffect } from '@/lib/cards/effects';

/**
 * Ordnet einer Karte die passenden Einträge aus RULING_MECHANICS zu.
 *
 * Grundlage sind dieselben Muster, mit denen der Import die Effekte zerlegt hat:
 * die Nicht-OPT-Muster stehen je Effekt in `CardEffect.patterns` (und folgen damit auch
 * einer Korrektur von Hand), die OPT-Klauseln liest `matchMechanics` aus dem Kartentext,
 * weil die Zerlegung sie entfernt.
 *
 * Einträge mit `detect: ['engine']` oder `['context']` matchen bewusst nie automatisch:
 * `engine` sind Spielregeln ohne Textmuster, `context` sind unbelegte Fälle, die nur als
 * Kontext an Jev gehen. Sie stehen in `general` und machen sichtbar, wo die Prüfung aufhört.
 */

export interface MechanicCard {
  /** YGOPRODeck-Feld `type`, z. B. "Effect Monster", "Spell Card" */
  type: string;
  /** YGOPRODeck-Feld `race`; bei Spell/Trap die Unterart, z. B. "Quick-Play" */
  race?: string | null;
  desc?: string | null;
  effects: CardEffect[];
}

export interface MechanicMatch {
  mechanic: RulingMechanic;
  /** Muster im Kartentext, die diesen Eintrag ausgelöst haben */
  patterns: PatternKey[];
  /** Zusätzlich oder allein über den Kartentyp erkannt */
  byCardType: boolean;
  /** Zusätzlich oder allein über die Satzstruktur erkannt (Kostenteil) */
  byStructure: boolean;
}

export interface MechanicResult {
  matched: MechanicMatch[];
  /** Spielregeln (`engine`) und unbelegte Fälle (`context`): gelten unabhängig vom Kartentext */
  general: RulingMechanic[];
}

/** Spell/Trap-Unterarten, deren Karte nach der Chain regulär auf den Friedhof geht */
const GOES_TO_GY = new Set(['Normal', 'Quick-Play', 'Ritual', 'Counter']);
/** Spell/Trap-Unterarten, die liegen bleiben und deshalb zum Auflösen noch da sein müssen */
const STAYS_ON_FIELD = new Set(['Continuous', 'Field']);

/**
 * Erkennung über die Stammdaten statt über ein Textmuster.
 * Nur für die drei Einträge, die in der Recherche `Kartentyp` als Erkennung nennen.
 */
const BY_CARD_TYPE: Record<string, (card: MechanicCard) => boolean> = {
  // Spell Speed 2 und 3 stehen am Kartentyp; Quick Effects von Monstern erkennt das QUICK-Muster
  SPELL_SPEED: (card) => /Trap/.test(card.type) || card.race === 'Quick-Play',
  CHAIN_CLEANUP: (card) => /Spell|Trap/.test(card.type) && GOES_TO_GY.has(card.race ?? ''),
  CONTINUOUS_ST_MUST_REMAIN: (card) =>
    /Spell|Trap/.test(card.type) &&
    STAYS_ON_FIELD.has(card.race ?? '') &&
    card.effects.some((e) => e.activated),
};

/**
 * Einträge, für die das bloße Muster zu grob ist. Sie matchen nur, wenn die Zusatzprüfung zusagt.
 * `text` ist der normalisierte Kartentext, `card.effects` die wirksame Zerlegung,
 * `found` alle erkannten Muster der Karte.
 */
const REFINE: Record<
  string,
  (text: string, card: MechanicCard, found: ReadonlySet<PatternKey>) => boolean
> = {
  // Gruppe (turn|Duel) der OPT-Muster: greift nur bei "per Duel"
  OPT_PER_DUEL: (text) =>
    (
      [
        'OPT_USE_THIS',
        'OPT_USE_EACH',
        'OPT_ACTIVATE_CARD',
        'OPT_ACTIVATE_CARD2',
        'OPT_APPLY',
      ] as const
    ).some((key) => text.match(PATTERNS[key])?.includes('Duel')),
  // Gruppe (once|twice|thrice) von OPT_USE_THIS
  OPT_MULTI: (text) => ['twice', 'thrice'].includes(text.match(PATTERNS.OPT_USE_THIS)?.[2] ?? ''),
  // CONDITION trifft jeden Doppelpunkt; gemeint ist der Bedingungsteil eines aktivierten Effekts
  ACTIVATION_CONDITION: (_text, card) =>
    card.effects.some((e) => e.activated && e.text.includes(':')),
  COST: (_text, card) => card.effects.some((e) => hasCostPart(e.text)),
  TRIGGER_WHEN_OPTIONAL: (_text, card) =>
    card.effects.some(
      (e) => e.patterns.includes('TRIGGER_WHEN_OPT') && !e.patterns.includes('QUICK')
    ),
  // Laut Eintrag selbst: TRIGGER_MANDATORY trifft auch Quick Effects mit "When", zuerst QUICK prüfen
  TRIGGER_IF_OR_MANDATORY: (_text, card) =>
    card.effects.some(
      (e) =>
        !e.patterns.includes('QUICK') &&
        (e.patterns.includes('TRIGGER_IF_OPT') || e.patterns.includes('TRIGGER_MANDATORY'))
    ),
};

/**
 * Erkennung über die Satzstruktur statt über ein einzelnes Muster.
 * Das Ergebnis gilt zusätzlich zu den Mustern aus `detect`.
 */
const STRUCTURAL: Record<string, (card: MechanicCard) => boolean> = {
  COST: (card) => card.effects.some((e) => hasCostPart(e.text)),
};

/** COST_VERB trifft nur klein geschriebene Verben; am Anfang des Kostenteils stehen sie groß */
const COST_VERB = new RegExp(PATTERNS.COST_VERB.source, 'i');

/**
 * Kostenteil nach PSCT (`BEDINGUNG : KOSTEN ; AUFLÖSUNG`): alles vor dem Semikolon,
 * ohne den Bedingungsteil. Ohne Semikolon gibt es keine Kosten, nur eine Auflösung.
 */
function hasCostPart(sentence: string): boolean {
  const match = sentence.match(/^(?:[^;:]*:)?([^;]*);/);
  return match ? COST_VERB.test(match[1]) : false;
}

export function matchMechanics(card: MechanicCard): MechanicResult {
  const text = (card.desc ?? '').replace(/\r\n?/g, '\n').replace(/[“”]/g, '"');
  // Nicht-OPT-Muster je Effekt (folgt einer Korrektur), OPT-Muster aus dem gedruckten Text
  const found = new Set<PatternKey>(card.effects.flatMap((e) => e.patterns));
  for (const key of Object.keys(PATTERNS) as PatternKey[]) {
    if (key.startsWith('OPT_') && PATTERNS[key].test(text)) found.add(key);
  }

  const matched: MechanicMatch[] = [];
  const general: RulingMechanic[] = [];

  for (const mechanic of RULING_MECHANICS as readonly RulingMechanic[]) {
    const patterns = mechanic.detect.filter(
      (d): d is PatternKey => d !== 'engine' && d !== 'cardType' && d !== 'context'
    );
    const byCardType = mechanic.detect.includes('cardType')
      ? (BY_CARD_TYPE[mechanic.key]?.(card) ?? false)
      : false;
    const hits = patterns.filter((p) => found.has(p));
    const refine = REFINE[mechanic.key];
    const structural = STRUCTURAL[mechanic.key]?.(card) ?? false;

    if ((hits.length > 0 || byCardType || structural) && (!refine || refine(text, card, found))) {
      matched.push({ mechanic, patterns: hits, byCardType, byStructure: structural });
    } else if (patterns.length === 0 && !mechanic.detect.includes('cardType')) {
      // Reine engine-/context-Einträge: kein Textmuster, das je zusagen könnte
      general.push(mechanic);
    }
  }
  return { matched, general };
}
