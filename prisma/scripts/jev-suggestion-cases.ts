import type { Player, Position, Zone } from '@/lib/combo/state';

/**
 * Testset für die Jev-Effektvorschläge: Situationen mit bekannter richtiger Antwort.
 * Der Zug gehört immer Spieler A ("self"), Main Phase 1.
 */
export interface EvalCase {
  label: string;
  board: { name: string; player: Player; zone: Zone; position?: Position }[];
  chain?: { name: string; player: Player }[];
  ask: { name: string; player: Player; zone: Zone; position?: Position };
  expected: boolean;
}

const albazUp = {
  name: 'Fallen of Albaz',
  player: 'self',
  zone: 'MONSTER',
  position: 'ATK',
} as const;
const blueEyesOpp = {
  name: 'Blue-Eyes White Dragon',
  player: 'opponent',
  zone: 'MONSTER',
  position: 'ATK',
} as const;
const mirrorForceSet = {
  name: 'Mirror Force',
  player: 'opponent',
  zone: 'SPELL_TRAP',
  position: 'SET',
} as const;

export const CASES: EvalCase[] = [
  // Handtraps und ihre Auslöser
  {
    label: 'Ash gegen Suche aus dem Deck',
    board: [{ name: 'Terraforming', player: 'self', zone: 'SPELL_TRAP' }],
    chain: [{ name: 'Terraforming', player: 'self' }],
    ask: { name: 'Ash Blossom & Joyous Spring', player: 'opponent', zone: 'HAND' },
    expected: true,
  },
  {
    label: 'Ash gegen Draw-Effekt',
    board: [{ name: 'Upstart Goblin', player: 'self', zone: 'SPELL_TRAP' }],
    chain: [{ name: 'Upstart Goblin', player: 'self' }],
    ask: { name: 'Ash Blossom & Joyous Spring', player: 'opponent', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'Ash ohne offene Chain',
    board: [albazUp],
    ask: { name: 'Ash Blossom & Joyous Spring', player: 'opponent', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'Ash gegen Beschwörung aus dem Friedhof',
    board: [
      { name: 'Monster Reborn', player: 'self', zone: 'SPELL_TRAP' },
      { name: 'Blue-Eyes White Dragon', player: 'self', zone: 'GY' },
    ],
    chain: [{ name: 'Monster Reborn', player: 'self' }],
    ask: { name: 'Ash Blossom & Joyous Spring', player: 'opponent', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'Ghost Belle gegen Beschwörung aus dem Friedhof',
    board: [
      { name: 'Monster Reborn', player: 'self', zone: 'SPELL_TRAP' },
      { name: 'Blue-Eyes White Dragon', player: 'self', zone: 'GY' },
    ],
    chain: [{ name: 'Monster Reborn', player: 'self' }],
    ask: { name: 'Ghost Belle & Haunted Mansion', player: 'opponent', zone: 'HAND' },
    expected: true,
  },
  {
    label: 'Ghost Belle gegen Suche aus dem Deck',
    board: [{ name: 'Terraforming', player: 'self', zone: 'SPELL_TRAP' }],
    chain: [{ name: 'Terraforming', player: 'self' }],
    ask: { name: 'Ghost Belle & Haunted Mansion', player: 'opponent', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'Veiler gegen offenes Effektmonster',
    board: [albazUp],
    ask: { name: 'Effect Veiler', player: 'opponent', zone: 'HAND' },
    expected: true,
  },
  {
    label: 'Veiler gegen verdecktes Monster',
    board: [{ ...albazUp, position: 'SET' }],
    ask: { name: 'Effect Veiler', player: 'opponent', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'Veiler ohne Monster',
    board: [],
    ask: { name: 'Effect Veiler', player: 'opponent', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'Imperm von der Hand, Gegner ohne Karten',
    board: [albazUp],
    ask: { name: 'Infinite Impermanence', player: 'opponent', zone: 'HAND' },
    expected: true,
  },
  {
    label: 'Imperm von der Hand, Gegner kontrolliert eine Karte',
    board: [albazUp, mirrorForceSet],
    ask: { name: 'Infinite Impermanence', player: 'opponent', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'Imperm ohne Ziel',
    board: [],
    ask: { name: 'Infinite Impermanence', player: 'opponent', zone: 'HAND' },
    expected: false,
  },

  // Zauber und Fallen mit Zielen und Bedingungen
  {
    label: 'Upstart Goblin ohne Chain',
    board: [],
    ask: { name: 'Upstart Goblin', player: 'self', zone: 'HAND' },
    expected: true,
  },
  {
    label: 'Upstart Goblin als Antwort (Spell Speed 1)',
    board: [albazUp],
    chain: [{ name: 'Effect Veiler', player: 'opponent' }],
    ask: { name: 'Upstart Goblin', player: 'self', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'Monster Reborn mit Monster im Friedhof',
    board: [{ name: 'Blue-Eyes White Dragon', player: 'opponent', zone: 'GY' }],
    ask: { name: 'Monster Reborn', player: 'self', zone: 'HAND' },
    expected: true,
  },
  {
    label: 'Monster Reborn mit leeren Friedhöfen',
    board: [],
    ask: { name: 'Monster Reborn', player: 'self', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'Called by the Grave mit Monster im gegnerischen Friedhof',
    board: [{ name: 'Ash Blossom & Joyous Spring', player: 'opponent', zone: 'GY' }],
    ask: { name: 'Called by the Grave', player: 'self', zone: 'HAND' },
    expected: true,
  },
  {
    label: 'Called by the Grave mit leerem gegnerischen Friedhof',
    board: [{ name: 'Blue-Eyes White Dragon', player: 'self', zone: 'GY' }],
    ask: { name: 'Called by the Grave', player: 'self', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'Raigeki gegen Monster des Gegners',
    board: [blueEyesOpp],
    ask: { name: 'Raigeki', player: 'self', zone: 'HAND' },
    expected: true,
  },
  {
    label: 'Raigeki ohne gegnerische Monster',
    board: [albazUp],
    ask: { name: 'Raigeki', player: 'self', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'Dark Hole mit eigenem Monster',
    board: [albazUp],
    ask: { name: 'Dark Hole', player: 'self', zone: 'HAND' },
    expected: true,
  },
  {
    label: 'Dark Hole ohne Monster',
    board: [],
    ask: { name: 'Dark Hole', player: 'self', zone: 'HAND' },
    expected: false,
  },
  {
    label: "Harpie's Feather Duster gegen gesetzte Falle",
    board: [mirrorForceSet],
    ask: { name: "Harpie's Feather Duster", player: 'self', zone: 'HAND' },
    expected: true,
  },
  {
    label: "Harpie's Feather Duster ohne gegnerische Zauber/Fallen",
    board: [blueEyesOpp],
    ask: { name: "Harpie's Feather Duster", player: 'self', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'MST gegen gesetzte Falle',
    board: [mirrorForceSet],
    ask: { name: 'Mystical Space Typhoon', player: 'self', zone: 'HAND' },
    expected: true,
  },
  {
    label: 'MST ohne Ziel',
    board: [blueEyesOpp],
    ask: { name: 'Mystical Space Typhoon', player: 'self', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'Book of Moon gegen offenes Monster',
    board: [blueEyesOpp],
    ask: { name: 'Book of Moon', player: 'self', zone: 'HAND' },
    expected: true,
  },
  {
    label: 'Book of Moon ohne offenes Monster',
    board: [{ ...blueEyesOpp, position: 'SET' }],
    ask: { name: 'Book of Moon', player: 'self', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'Mirror Force ohne Angriff',
    board: [albazUp],
    ask: mirrorForceSet,
    expected: false,
  },
  {
    label: 'Lightning Storm ohne eigene offene Karten',
    board: [blueEyesOpp],
    ask: { name: 'Lightning Storm', player: 'self', zone: 'HAND' },
    expected: true,
  },
  {
    label: 'Lightning Storm mit eigenem offenen Monster',
    board: [blueEyesOpp, albazUp],
    ask: { name: 'Lightning Storm', player: 'self', zone: 'HAND' },
    expected: false,
  },
  {
    label: 'Dark Ruler No More gegen offenes Monster',
    board: [blueEyesOpp],
    ask: { name: 'Dark Ruler No More', player: 'self', zone: 'HAND' },
    expected: true,
  },
  {
    label: 'Forbidden Droplet mit Kosten und Ziel',
    board: [blueEyesOpp, { name: 'Upstart Goblin', player: 'self', zone: 'HAND' }],
    ask: { name: 'Forbidden Droplet', player: 'self', zone: 'HAND' },
    expected: true,
  },
];
