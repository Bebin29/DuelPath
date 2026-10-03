/**
 * Quellen hinter den Einträgen in RULING_MECHANICS.
 *
 * Die Kürzel sind dieselben wie in docs/research/rulings.md, Abschnitt „Quellen“:
 * `K*` sind Konami-Primärquellen, `Y*` Yugipedia, `D*` sonstige.
 */

export interface RulingSource {
  /** Herausgeber, für die Einordnung der Verlässlichkeit */
  publisher: 'Konami' | 'Yugipedia' | 'Sonstige';
  title: string;
  url: string;
}

export const RULING_SOURCES = {
  K1: {
    publisher: 'Konami',
    title: 'Yu-Gi-Oh! TCG Official Rulebook Version 10',
    url: 'https://www.yugioh-card.com/en/downloads/rulebook/SD_RuleBook_EN_10.pdf',
  },
  K2: {
    publisher: 'Konami',
    title: '2021 Rules Update',
    url: 'https://www.yugioh-card.com/en/play/2021_rules_update/',
  },
  K3: {
    publisher: 'Konami',
    title: 'PSCT Part 3: Conditions, Activations, and Effects',
    url: 'https://www.yugioh-card.com/en/play/psct/psct-3/',
  },
  K4: {
    publisher: 'Konami',
    title: 'PSCT Part 4: The Clues on Your Cards',
    url: 'https://www.yugioh-card.com/en/play/psct/psct-4/',
  },
  K6: {
    publisher: 'Konami',
    title: 'PSCT Part 7: 2012 Update, Conjunction Functions',
    url: 'https://www.yugioh-card.com/en/play/psct/psct-7/',
  },
  K7: {
    publisher: 'Konami',
    title: 'Fast Effects & Timing',
    url: 'https://www.yugioh-card.com/en/play/fast-effect-timing/',
  },
  Y1: {
    publisher: 'Yugipedia',
    title: 'Once per turn',
    url: 'https://yugipedia.com/wiki/Once_per_turn',
  },
  Y2: { publisher: 'Yugipedia', title: 'Negate', url: 'https://yugipedia.com/wiki/Negate' },
  Y3: { publisher: 'Yugipedia', title: 'Cost', url: 'https://yugipedia.com/wiki/Cost' },
  Y4: {
    publisher: 'Yugipedia',
    title: 'Activation condition',
    url: 'https://yugipedia.com/wiki/Activation_condition',
  },
  Y5: {
    publisher: 'Yugipedia',
    title: 'Missing the timing',
    url: 'https://yugipedia.com/wiki/Missing_the_timing',
  },
  Y6: {
    publisher: 'Yugipedia',
    title: 'Simultaneous Effects (SEGOC)',
    url: 'https://yugipedia.com/wiki/Simultaneous_Effects',
  },
  Y7: { publisher: 'Yugipedia', title: 'Chain', url: 'https://yugipedia.com/wiki/Chain' },
  Y8: {
    publisher: 'Yugipedia',
    title: 'Problem-Solving Card Text',
    url: 'https://yugipedia.com/wiki/Problem-Solving_Card_Text',
  },
  Y9: {
    publisher: 'Yugipedia',
    title: 'Trigger Effect',
    url: 'https://yugipedia.com/wiki/Trigger_Effect',
  },
  Y10: { publisher: 'Yugipedia', title: 'Resolve', url: 'https://yugipedia.com/wiki/Resolve' },
  Y11: {
    publisher: 'Yugipedia',
    title: 'Continuous Spell Card',
    url: 'https://yugipedia.com/wiki/Continuous_Spell_Card',
  },
  Y12: {
    publisher: 'Yugipedia',
    title: 'Limited activations',
    url: 'https://yugipedia.com/wiki/Limited_activations',
  },
  Y13: {
    publisher: 'Yugipedia',
    title: 'Card Rulings: Ash Blossom & Joyous Spring',
    url: 'https://yugipedia.com/wiki/Card_Rulings:Ash_Blossom_%26_Joyous_Spring',
  },
  Y14: {
    publisher: 'Yugipedia',
    title: 'Card Rulings: Effect Veiler',
    url: 'https://yugipedia.com/wiki/Card_Rulings:Effect_Veiler',
  },
  Y15: {
    publisher: 'Yugipedia',
    title: 'Card Rulings: Infinite Impermanence',
    url: 'https://yugipedia.com/wiki/Card_Rulings:Infinite_Impermanence',
  },
  Y16: {
    publisher: 'Yugipedia',
    title: 'Card Rulings: Called by the Grave',
    url: 'https://yugipedia.com/wiki/Card_Rulings:Called_by_the_Grave',
  },
  Y17: {
    publisher: 'Yugipedia',
    title: 'Card Rulings: Crossout Designator',
    url: 'https://yugipedia.com/wiki/Card_Rulings:Crossout_Designator',
  },
  Y18: {
    publisher: 'Yugipedia',
    title: 'Card Rulings: Solemn Judgment',
    url: 'https://yugipedia.com/wiki/Card_Rulings:Solemn_Judgment',
  },
  Y19: {
    publisher: 'Yugipedia',
    title: 'Card Rulings: Solemn Warning',
    url: 'https://yugipedia.com/wiki/Card_Rulings:Solemn_Warning',
  },
  Y20: {
    publisher: 'Yugipedia',
    title: 'Card Rulings: Apollousa, Bow of the Goddess',
    url: 'https://yugipedia.com/wiki/Card_Rulings:Apollousa,_Bow_of_the_Goddess',
  },
  Y21: {
    publisher: 'Yugipedia',
    title: 'Once while face-up on the field',
    url: 'https://yugipedia.com/wiki/Once_while_face-up_on_the_field',
  },
  D1: {
    publisher: 'Sonstige',
    title: 'YGOPRODeck API v7 (Kartentexte)',
    url: 'https://db.ygoprodeck.com/api/v7/cardinfo.php',
  },
  D2: {
    publisher: 'Sonstige',
    title: 'Duelists Unite: TCG vs OCG Rulings',
    url: 'https://forum.duelistsunite.org/t/tcg-vs-ocg-rulings-the-story-so-far/97',
  },
} as const satisfies Record<string, RulingSource>;

export type RulingSourceKey = keyof typeof RULING_SOURCES;
