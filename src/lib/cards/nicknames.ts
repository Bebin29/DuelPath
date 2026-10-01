/**
 * Spitznamen und Kürzel der Community für die Kartensuche (UX-Plan 8).
 * Gepflegte Liste für gängige Namen; Kürzel aus Anfangsbuchstaben erkennt initialsOf automatisch.
 * Werte sind exakte englische Kartennamen, mehrdeutige Spitznamen verweisen auf mehrere Karten.
 */
export const NICKNAMES: Record<string, string[]> = {
  ash: ['Ash Blossom & Joyous Spring'],
  imperm: ['Infinite Impermanence'],
  nib: ['Nibiru, the Primal Being'],
  nibiru: ['Nibiru, the Primal Being'],
  veiler: ['Effect Veiler'],
  droll: ['Droll & Lock Bird'],
  belle: ['Ghost Belle & Haunted Mansion'],
  ogre: ['Ghost Ogre & Snow Rabbit'],
  mourner: ['Ghost Mourner & Moonlit Chill'],
  crow: ['D.D. Crow'],
  gamma: ['PSY-Framegear Gamma'],
  fuwalos: ['Mulcharmy Fuwalos'],
  purulia: ['Mulcharmy Purulia'],
  shifter: ['Dimension Shifter'],
  maxx: ['Maxx "C"'],
  called: ['Called by the Grave'],
  crossout: ['Crossout Designator'],
  droplet: ['Forbidden Droplet'],
  solemn: ['Solemn Judgment', 'Solemn Strike', 'Solemn Warning'],
  strike: ['Solemn Strike'],
  judgment: ['Solemn Judgment'],
  warning: ['Solemn Warning'],
  evenly: ['Evenly Matched'],
  drain: ['Skill Drain'],
  storm: ['Lightning Storm'],
  feather: ["Harpie's Feather Duster"],
  duster: ["Harpie's Feather Duster"],
  raigeki: ['Raigeki'],
  prosperity: ['Pot of Prosperity'],
  desires: ['Pot of Desires'],
  extravagance: ['Pot of Extravagance'],
  talents: ['Triple Tactics Talent'],
  thrust: ['Triple Tactics Thrust'],
  albaz: ['Fallen of Albaz'],
  aluber: ['Aluber the Jester of Despia'],
  tragedy: ['Despian Tragedy'],
  quem: ['Guiding Quem, the Virtuous'],
  mirrorjade: ['Mirrorjade the Iceblade Dragon'],
  albion: ['Albion the Branded Dragon'],
  lubellion: ['Lubellion the Searing Dragon'],
  baronne: ['Baronne de Fleur'],
  apollo: ['Apollousa, Bow of the Goddess'],
  apollousa: ['Apollousa, Bow of the Goddess'],
  accesscode: ['Accesscode Talker'],
  borrel: ['Borreload Dragon'],
  masquerena: ['I:P Masquerena'],
  ip: ['I:P Masquerena'],
  spl: ['S:P Little Knight'],
  unicorn: ['Knightmare Unicorn'],
  phoenix: ['Knightmare Phoenix'],
  halq: ['Crystron Halqifibrax'],
  crusia: ['Crusadia Equimax'],
};

/** Kürzel aus den Anfangsbuchstaben: „Blue-Eyes White Dragon“ → „bewd“, „D.D. Crow“ → „ddc“ */
export function initialsOf(name: string): string {
  return name
    .split(/[^A-Za-z0-9']+/)
    .filter(Boolean)
    .map((word) => word.replace(/'/g, '')[0] ?? '')
    .join('')
    .toLowerCase();
}

/** Kann die Eingabe ein Kürzel sein? Kurz, ohne Leer- und Sonderzeichen */
export function looksLikeInitials(query: string): boolean {
  return /^[a-z0-9]{2,5}$/i.test(query.trim());
}

/** Kartennamen hinter einem Spitznamen, sonst leer */
export function nicknameTargets(query: string, extra?: Record<string, string[]>): string[] {
  const key = query.trim().toLowerCase();
  return [...new Set([...(extra?.[key] ?? []), ...(NICKNAMES[key] ?? [])])];
}
