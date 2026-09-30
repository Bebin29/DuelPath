/**
 * Kuratierte TCG-Ruling-Mechaniken für OPT-Tracking, Negierungen und Chains.
 *
 * Grundlage und Quellen: docs/research/rulings.md (Abschnitte 7 und 8).
 * `deterministic: 'yes'` rechnet stateAt direkt, `partial` teilweise, `no` geht nur als Kontext an Jev.
 */

/** PSCT-Erkennungsmuster aus der Recherche. `X` in den Kommentaren steht für einen Kartennamen in Anführungszeichen. */
export const PATTERNS = {
  // OPT-Klauseln. Kartennamen können selbst Anführungszeichen enthalten (Maxx "C"), daher "(.+?)".
  OPT_USE_THIS:
    /You can only use (?:this|the) effect of "(.+?)" (once|twice|thrice) per (turn|Duel)/,
  // Erweitert gegenüber der Recherche um "each of these effects" (31 Karten)
  OPT_USE_EACH:
    /You can only use each (?:of (?:the|these) (?:(?:following|preceding|previous|above|\w+) )?)?(?:Pendulum |monster )?effects? of "(.+?)" once per (turn|Duel)/,
  OPT_USE_SHARED:
    /You can only use 1 (?:of (?:these|the following|the preceding) effects of )?"(.+?)"(?: effect)? per turn, and only once that turn/,
  OPT_USE_NTH:
    /You can only use the (?:previous|preceding|above|following|1st|2nd|3rd|first|second|third) effect of "(.+?)" once per turn/,
  OPT_ACTIVATE_CARD: /You can only activate 1 "(.+?)" per (turn|Duel)/,
  OPT_ACTIVATE_CARD2: /You can only activate "(.+?)" once per (turn|Duel)/,
  OPT_ACTIVATE_EFFECT: /You can only activate (?:this|each) effect of "(.+?)" once per turn/,
  OPT_APPLY: /You can only apply (?:this|the) effect of "(.+?)" once per (turn|Duel)/,
  OPT_USE_CARD: /You can only use 1 "(.+?)" per turn\./,
  OPT_SOFT: /(?:^|[.\n]\s*)Once per turn(?:, [^:]*)?:/,
  OPT_SOFT_OPP: /Once per (?:your )?opponent's turn/,
  OPT_CHAIN: /Once per Chain/,
  OPT_FACEUP: /Once while (?:this card is )?face-up on the field/,
  OPT_GAIN: /\(You can only gain this effect once per turn\.\)/,
  OPT_SUMMON_NAME:
    /You can only (?:Special|Link|Synchro|Xyz|Fusion) Summon "(.+?)" once per (turn|Duel)(?: this way)?/,
  OPT_NO_SAME_CHAIN: /cannot activate more than 1 in the same Chain/,

  // Effektstruktur
  QUICK: /\(Quick Effect\)|During either player's turn|\(this is a Quick Effect\)/,
  TRIGGER_WHEN_OPT: /(?:^|[.\n]\s*)When [^:]*:\s*You can/,
  TRIGGER_IF_OPT: /(?:^|[.\n]\s*)If [^:]*:\s*You can/,
  TRIGGER_MANDATORY: /(?:^|[.\n]\s*)(?:If|When|Each time) [^:]*:\s*(?!You can)/,
  FLIP: /^FLIP:/,
  CONDITION: /^(.*?):\s/,
  COST_VERB: /\b(discard|pay|Tribute|banish|send|detach|reveal|shuffle|return)\b/,

  // Negierungsarten
  NEG_ACTIVATION: /negate (?:the|that|its) activation/,
  NEG_ACT_DESTROY: /negate (?:the|that) (?:Summon or )?activation, and if you do, destroy/,
  NEG_EFFECT_CHAINED: /negate that effect|negate the effect\b/,
  NEG_EFFECTS_LINGER:
    /negate (?:its|their|the) effects(?: \(until the end of this turn\)|, until the end of this turn)?|(?:its|their) effects are negated/,
  NEG_BY_NAME:
    /as well as the activated effects and effects on the field of (?:monsters|cards) with the same original name/,
  NEG_SUMMON:
    /negate the (?:Normal |Special |Flip )?Summon|would be (?:Normal |Special |Flip )?Summoned/,
  NEG_CONTINUOUS: /^Negate (?:all|the effects of all) .*(?:while|on the field)/,
  STILL_ACTIVATABLE: /\(but their effects can still be activated\)/,

  // Einschränkungen, Timing, Ziele
  TURN_RESTRICTION: /the turn you activate (?:this|either of this) (?:card|effect)/,
  SUMMON_AFTER_RES: /immediately after this (?:card|effect) resolves/,
  RES_CONDITION: /must remain face-up on the field to activate and to resolve/,
  TARGET_STRICT: /that target|those targets|both targets/,
  CONJ_THEN: /,? then\b/,
  CONJ_AND_IFYOUDO: /, and if you do,/,
  CONJ_ALSO_AFTER: /, also, after that,/,
  CONJ_ALSO: /, also\b/,
} as const satisfies Record<string, RegExp>;

export type PatternKey = keyof typeof PATTERNS;

/** Erkennung ohne Textmuster: Spielregel (`engine`), Kartentyp aus den Stammdaten (`cardType`) oder nur Jev-Kontext (`context`). */
export type Detect = PatternKey | 'engine' | 'cardType' | 'context';

export interface RulingMechanic {
  key: string;
  category: 'negation' | 'opt' | 'cost' | 'trigger' | 'chain' | 'summon' | 'text';
  description: string;
  deterministic: 'yes' | 'partial' | 'no';
  opt?: string;
  cost?: string;
  card?: string;
  trigger?: string;
  detect: Detect[];
  notes?: string;
}

export const RULING_MECHANICS = [
  // Negierung
  {
    key: 'NEGATE_ACTIVATION',
    category: 'negation',
    description: 'Aktivierung negiert, der Chain Link verschwindet.',
    deterministic: 'yes',
    opt: '"use" und Soft OPT: verbraucht; "activate": nicht verbraucht',
    cost: 'bleiben bezahlt',
    card: 'Spell/Trap: Friedhof (nicht "vom Feld"); Monster: bleibt liegen',
    trigger: 'letztes Ereignis ist die Negierung',
    detect: ['NEG_ACTIVATION'],
  },
  {
    key: 'NEGATE_ACTIVATION_DESTROY',
    category: 'negation',
    description: 'Aktivierung negiert und die Karte zerstört ("and if you do, destroy").',
    deterministic: 'yes',
    opt: 'wie NEGATE_ACTIVATION',
    cost: 'bleiben bezahlt',
    card: 'zerstört, zählt als "destroyed"',
    trigger: '"if destroyed"-Trigger möglich',
    detect: ['NEG_ACT_DESTROY'],
  },
  {
    key: 'NEGATE_EFFECT_CHAINED',
    category: 'negation',
    description: 'Effekt des direkt gechainten Links löst ohne Wirkung auf (Ash-Blossom-Typ).',
    deterministic: 'yes',
    opt: 'immer verbraucht',
    cost: 'bleiben bezahlt',
    card: 'Normal/Quick-Play/Ritual Spell, Normal/Counter Trap: Friedhof nach der Chain; Continuous/Field und Monster bleiben',
    trigger: 'Einschränkung "the turn you activate" gilt trotzdem',
    detect: ['NEG_EFFECT_CHAINED'],
  },
  {
    key: 'NEGATE_EFFECTS_LINGER',
    category: 'negation',
    description:
      'Monster-Effekte bis Zugende negiert (Imperm, Veiler); negiert auch Effekte dieses Monsters in der Chain, die auf dem Feld auflösen.',
    deterministic: 'partial',
    opt: 'verbraucht',
    cost: 'bleiben bezahlt',
    card: 'Ziel bleibt liegen; Negierung endet beim Verdecken',
    trigger: 'Continuous Effects gelten nicht mehr',
    detect: ['NEG_EFFECTS_LINGER'],
    notes: 'Ob die Negierung beim Verlassen des Feldes endet, ist nicht belegt.',
  },
  {
    key: 'NEGATE_BY_NAME',
    category: 'negation',
    description:
      'Namenssperre: aktivierte Effekte und Feld-Effekte mit gleichem Originalnamen negiert (Called by the Grave bis Ende des nächsten Zuges, Crossout Designator bis Zugende an allen Orten).',
    deterministic: 'yes',
    opt: 'Aktivierung bleibt möglich und verbraucht den OPT',
    cost: 'bleiben bezahlt',
    card: 'verbannte Karte ist weg, andere bleiben',
    trigger: 'Effekte lösen ohne Wirkung auf',
    detect: ['NEG_BY_NAME'],
  },
  {
    key: 'NEGATE_CONTINUOUS_FIELD',
    category: 'negation',
    description:
      'Dauerhafte Feld-Negierung (Skill Drain, Imperial Order); Aktivierung bleibt möglich.',
    deterministic: 'partial',
    opt: 'verbraucht',
    cost: 'bleiben bezahlt',
    card: 'bleibt liegen',
    trigger: 'greift nicht, wenn die Karte sich per Kosten vom Feld entfernt',
    detect: ['NEG_CONTINUOUS', 'STILL_ACTIVATABLE'],
  },
  {
    key: 'NEGATE_SUMMON',
    category: 'summon',
    description: 'Beschwörung negiert (nur außerhalb einer Chain, nur als Chain Link 1).',
    deterministic: 'yes',
    opt: 'Normal Summon verbraucht; "Special Summon X once per turn" nicht verbraucht',
    cost: 'Kosten und Materialien verbraucht',
    card: 'Friedhof bzw. zerstört; war nie auf dem Feld; gilt nicht als korrekt beschworen',
    trigger: 'keine "If Summoned"-Trigger',
    detect: ['NEG_SUMMON'],
  },

  // OPT-Varianten
  {
    key: 'OPT_SOFT',
    category: 'opt',
    description: '"Once per turn:" gilt pro Kopie.',
    deterministic: 'yes',
    opt: 'Zähler pro Instanz und Ortsepoche; negierte Aktivierung zählt',
    card: 'Reset bei Ortswechsel oder Verdecken',
    detect: ['OPT_SOFT', 'OPT_SOFT_OPP'],
  },
  {
    key: 'OPT_HARD_USE',
    category: 'opt',
    description: '"You can only use this effect of X once per turn."',
    deterministic: 'yes',
    opt: 'pro Spieler, Name und Effekt; negierte Aktivierung zählt',
    card: 'kein Reset',
    detect: ['OPT_USE_THIS', 'OPT_USE_NTH'],
  },
  {
    key: 'OPT_HARD_USE_EACH',
    category: 'opt',
    description: '"You can only use each effect of X once per turn."',
    deterministic: 'yes',
    opt: 'ein Zähler pro Effekt',
    card: 'kein Reset',
    detect: ['OPT_USE_EACH'],
  },
  {
    key: 'OPT_HARD_SHARED',
    category: 'opt',
    description: '"You can only use 1 X effect per turn, and only once that turn."',
    deterministic: 'yes',
    opt: 'ein gemeinsamer Zähler für alle Effekte der Karte',
    card: 'kein Reset',
    detect: ['OPT_USE_SHARED'],
  },
  {
    key: 'OPT_HARD_ACTIVATE_CARD',
    category: 'opt',
    description: '"You can only activate 1 X per turn."',
    deterministic: 'yes',
    opt: 'pro Spieler und Name; nur nicht negierte Aktivierungen zählen',
    card: 'kein Reset',
    detect: ['OPT_ACTIVATE_CARD', 'OPT_ACTIVATE_CARD2'],
  },
  {
    key: 'OPT_HARD_ACTIVATE_EFFECT',
    category: 'opt',
    description: '"You can only activate this/each effect of X once per turn."',
    deterministic: 'yes',
    opt: 'wie OPT_HARD_USE, aber negierte Aktivierung zählt nicht',
    card: 'kein Reset',
    detect: ['OPT_ACTIVATE_EFFECT'],
  },
  {
    key: 'OPT_HARD_APPLY',
    category: 'opt',
    description: '"You can only apply this effect of X once per turn."',
    deterministic: 'partial',
    opt: 'zählt nur bei tatsächlicher Anwendung',
    card: 'kein Reset',
    detect: ['OPT_APPLY'],
  },
  {
    key: 'OPT_USE_CARD',
    category: 'opt',
    description: '"You can only use 1 X per turn." (Maxx "C")',
    deterministic: 'yes',
    opt: 'wie OPT_HARD_SHARED',
    card: 'kein Reset',
    detect: ['OPT_USE_CARD'],
  },
  {
    key: 'OPT_PER_DUEL',
    category: 'opt',
    description: 'OPT-Varianten mit "per Duel".',
    deterministic: 'yes',
    opt: 'Zähler über das ganze Duell',
    card: 'kein Reset',
    detect: [
      'OPT_USE_THIS',
      'OPT_USE_EACH',
      'OPT_ACTIVATE_CARD',
      'OPT_ACTIVATE_CARD2',
      'OPT_APPLY',
    ],
    notes: 'Erkennung über die Gruppe (turn|Duel) der OPT-Muster.',
  },
  {
    key: 'OPT_MULTI',
    category: 'opt',
    description: '"twice/thrice per turn"',
    deterministic: 'yes',
    opt: 'Limit 2 bzw. 3',
    card: 'kein Reset',
    detect: ['OPT_USE_THIS'],
    notes: 'Erkennung über die Gruppe (once|twice|thrice) von OPT_USE_THIS.',
  },
  {
    key: 'OPT_PER_CHAIN',
    category: 'opt',
    description: '"Once per Chain"',
    deterministic: 'yes',
    opt: 'pro Kopie und Chain',
    detect: ['OPT_CHAIN'],
  },
  {
    key: 'OPT_NO_SAME_CHAIN',
    category: 'opt',
    description: '"cannot activate more than 1 in the same Chain"',
    deterministic: 'yes',
    opt: 'Chain-Sperre für den Namen',
    detect: ['OPT_NO_SAME_CHAIN'],
  },
  {
    key: 'OPT_WHILE_FACEUP',
    category: 'opt',
    description: '"Once while face-up on the field"',
    deterministic: 'yes',
    opt: 'pro Instanz und Feldepoche',
    card: 'Reset beim Verlassen des Feldes oder Verdecken',
    detect: ['OPT_FACEUP'],
  },
  {
    key: 'OPT_GAIN_EFFECT',
    category: 'opt',
    description: '"(You can only gain this effect once per turn.)"',
    deterministic: 'yes',
    opt: 'ein Zähler pro Spieler über alle Karten mit diesem Satz',
    detect: ['OPT_GAIN'],
  },
  {
    key: 'SUMMON_LIMIT_NAME',
    category: 'summon',
    description: '"You can only Special Summon X once per turn (this way)."',
    deterministic: 'yes',
    opt: 'zählt nur erfolgreiche Beschwörungen',
    detect: ['OPT_SUMMON_NAME'],
  },
  {
    key: 'NORMAL_SUMMON_LIMIT',
    category: 'summon',
    description: '1 Normal Summon oder Set pro Zug (Spielregel).',
    deterministic: 'yes',
    opt: 'negierte Normal Summon zählt',
    detect: ['engine'],
  },

  // Kosten und Bedingungen
  {
    key: 'COST',
    category: 'cost',
    description: 'Der Teil vor dem Semikolon wird bei der Aktivierung bezahlt.',
    deterministic: 'yes',
    cost: 'nie erstattet; nicht bezahlbar heißt nicht aktivierbar',
    card: 'Bewegung mit Grund "cost"',
    trigger: 'kein "by card effect"; nicht das Letzte für Missing the Timing',
    detect: ['COST_VERB'],
  },
  {
    key: 'ACTIVATION_CONDITION',
    category: 'cost',
    description: 'Der Teil vor dem Doppelpunkt wird nur bei der Aktivierung geprüft.',
    deterministic: 'yes',
    detect: ['CONDITION'],
  },
  {
    key: 'RESOLUTION_CONDITION',
    category: 'cost',
    description: 'Die Bedingung muss auch beim Auflösen gelten (eigener Satz).',
    deterministic: 'partial',
    trigger: 'sonst ohne Wirkung',
    detect: ['RES_CONDITION'],
  },
  {
    key: 'TURN_RESTRICTION',
    category: 'cost',
    description:
      '"the turn you activate this card/effect": gilt ab Aktivierung, auch bei Effekt-Negierung.',
    deterministic: 'partial',
    detect: ['TURN_RESTRICTION'],
    notes: 'Ob die Einschränkung auch bei negierter Aktivierung gilt, ist nicht belegt.',
  },

  // Trigger
  {
    key: 'TRIGGER_WHEN_OPTIONAL',
    category: 'trigger',
    description: 'Optionaler "When"-Trigger kann das Timing verpassen.',
    deterministic: 'partial',
    trigger:
      'nur aktivierbar, wenn der Auslöser das Letzte war (Chain Link 1 bzw. Aktion ohne Chain)',
    detect: ['TRIGGER_WHEN_OPT'],
  },
  {
    key: 'TRIGGER_IF_OR_MANDATORY',
    category: 'trigger',
    description: 'Optionaler "If"-Trigger oder Pflicht-Trigger verpasst das Timing nie.',
    deterministic: 'yes',
    trigger: 'aktiviert in der nächsten Chain',
    detect: ['TRIGGER_IF_OPT', 'TRIGGER_MANDATORY'],
    notes: 'TRIGGER_MANDATORY trifft auch Quick Effects mit "When"; zuerst QUICK prüfen.',
  },
  {
    key: 'SEGOC_TCG',
    category: 'trigger',
    description: 'Reihenfolge gleichzeitiger Trigger im TCG.',
    deterministic: 'yes',
    trigger: 'Pflicht des Zugspielers, Pflicht des Gegners, optional Zugspieler, optional Gegner',
    detect: ['engine'],
  },
  {
    key: 'SEGOC_HAND_SS_LIMIT',
    category: 'trigger',
    description: 'Nur ein "Special Summon itself from hand"-Trigger pro Chain.',
    deterministic: 'partial',
    trigger: 'weitere entfallen',
    detect: ['context'],
  },
  {
    key: 'TRIGGER_LOCATION_CHANGE',
    category: 'trigger',
    description: 'Ein wartender Trigger verfällt, wenn die Karte ihren Ort wechselt (TCG 2021).',
    deterministic: 'yes',
    trigger: 'aktiviert nicht',
    detect: ['engine'],
  },
  {
    key: 'TRIGGER_NEGATED_SUMMON',
    category: 'trigger',
    description: 'Keine Summon- und Erfolgs-Trigger bei negierter Beschwörung.',
    deterministic: 'partial',
    card: 'nicht "vom Feld"',
    trigger: '"sent to GY"-Trigger sind kartenabhängig',
    detect: ['engine', 'context'],
  },

  // Chain
  {
    key: 'SPELL_SPEED',
    category: 'chain',
    description:
      'Spell Speed 1/2/3; ab Chain Link 2 nur mit Spell Speed 2 oder höher und mindestens so hoch wie der vorherige Link.',
    deterministic: 'yes',
    detect: ['QUICK', 'cardType', 'engine'],
  },
  {
    key: 'CHAIN_RESOLVE_REVERSE',
    category: 'chain',
    description:
      'Auflösung vom höchsten Link bis Chain Link 1; während der Auflösung keine Aktivierungen.',
    deterministic: 'yes',
    trigger: 'Trigger warten bis nach der Chain',
    detect: ['engine'],
  },
  {
    key: 'CHAIN_CLEANUP',
    category: 'chain',
    description:
      'Nach der Chain auf den Friedhof: Normal/Quick-Play/Ritual Spell, Normal/Counter Trap, Spell/Trap mit negierter Aktivierung, Monster mit negierter Beschwörung.',
    deterministic: 'yes',
    card: 'Continuous, Field und Equip bleiben',
    trigger: 'gleichzeitig mit Chain Link 1',
    detect: ['cardType'],
  },
  {
    key: 'CONTINUOUS_ST_MUST_REMAIN',
    category: 'chain',
    description:
      'Aktivierter Feld-Effekt einer Continuous Spell/Trap löst ohne Wirkung auf, wenn die Karte nicht mehr liegt.',
    deterministic: 'yes',
    detect: ['cardType'],
  },
  {
    key: 'SUMMON_AFTER_RESOLVE',
    category: 'summon',
    description: '"immediately after this effect resolves": nur als Chain Link 1 negierbar.',
    deterministic: 'yes',
    detect: ['SUMMON_AFTER_RES'],
  },

  // Textlogik
  {
    key: 'CONJUNCTION',
    category: 'text',
    description:
      'then (nacheinander, A nötig), and (gleichzeitig, beides nötig), and if you do (gleichzeitig, A nötig), also (unabhängig).',
    deterministic: 'partial',
    trigger: 'bestimmt das "Letzte" für Missing the Timing',
    detect: ['CONJ_THEN', 'CONJ_AND_IFYOUDO', 'CONJ_ALSO_AFTER', 'CONJ_ALSO'],
  },
  {
    key: 'TARGET_WORDING',
    category: 'text',
    description: '"that target" wird beim Auflösen erneut geprüft, "it" nicht.',
    deterministic: 'partial',
    detect: ['TARGET_STRICT'],
  },
  {
    key: 'EQUIP_NEGATED',
    category: 'negation',
    description: 'Equip Spell mit negiertem Effekt.',
    deterministic: 'no',
    card: 'vermutlich Friedhof, unbelegt',
    detect: ['context'],
    notes: 'Nicht belegt; nur als Kontext verwenden.',
  },
] as const satisfies readonly RulingMechanic[];

export type RulingMechanicKey = (typeof RULING_MECHANICS)[number]['key'];

/** Liefert alle Muster-Keys, die im Text vorkommen. */
export function detectPatterns(text: string): PatternKey[] {
  return (Object.keys(PATTERNS) as PatternKey[]).filter((key) => PATTERNS[key].test(text));
}
