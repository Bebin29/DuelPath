import type { GameState, PlacedCard, Player, Zone } from '@/lib/combo/state';

/**
 * Belegung des Spielfelds mit festen Plätzen (UI-Plan 6.3).
 * Platz-Konvention in PlacedCard.slot: MONSTER 0 bis 4 sind die Monsterzonen von links nach rechts
 * aus Sicht des Besitzers, 5 und 6 die linke und rechte Extra Monster Zone. SPELL_TRAP 0 bis 4.
 * Karten ohne Platz landen in der ersten freien Zone, damit alte Combos lesbar bleiben (UX-Plan 15).
 */

export const MAIN_ZONES = 5;
export const EMZ_LEFT = 5;
export const EMZ_RIGHT = 6;

export interface SideBoard {
  monsters: (PlacedCard | null)[];
  extraMonsters: [PlacedCard | null, PlacedCard | null];
  spellTraps: (PlacedCard | null)[];
  field: PlacedCard | null;
  hand: PlacedCard[];
  gy: PlacedCard[];
  banished: PlacedCard[];
  deck: PlacedCard[];
  extra: PlacedCard[];
  /** Karten, die keinen Platz mehr fanden (Zonen voll) */
  overflow: PlacedCard[];
}

function place(cards: PlacedCard[], slots: number[], size: number) {
  const row: (PlacedCard | null)[] = Array(size).fill(null);
  const overflow: PlacedCard[] = [];
  const unplaced: PlacedCard[] = [];
  for (const c of cards) {
    const i = c.slot !== undefined ? slots.indexOf(c.slot) : -1;
    if (i >= 0 && !row[i]) row[i] = c;
    else unplaced.push(c);
  }
  for (const c of unplaced) {
    const free = row.indexOf(null);
    if (free >= 0) row[free] = c;
    else overflow.push(c);
  }
  return { row, overflow };
}

export function boardOf(state: GameState, player: Player): SideBoard {
  const mine = Object.values(state.cards)
    .filter((c) => c.controller === player || (!onBoard(c.zone) && c.owner === player))
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId));
  const inZone = (zone: Zone) => mine.filter((c) => c.zone === zone);

  const monsters = inZone('MONSTER');
  const emzCards = monsters.filter((c) => c.slot === EMZ_LEFT || c.slot === EMZ_RIGHT);
  const main = place(
    monsters.filter((c) => !emzCards.includes(c)),
    [0, 1, 2, 3, 4],
    MAIN_ZONES
  );
  const emz = place(emzCards, [EMZ_LEFT, EMZ_RIGHT], 2);
  const st = place(inZone('SPELL_TRAP'), [0, 1, 2, 3, 4], MAIN_ZONES);
  const fields = inZone('FIELD');

  return {
    monsters: main.row,
    extraMonsters: [emz.row[0], emz.row[1]],
    spellTraps: st.row,
    field: fields[0] ?? null,
    hand: inZone('HAND'),
    gy: inZone('GY'),
    banished: inZone('BANISHED'),
    deck: inZone('DECK'),
    extra: inZone('EXTRA'),
    overflow: [...main.overflow, ...emz.overflow, ...st.overflow, ...fields.slice(1)],
  };
}

function onBoard(zone: Zone): boolean {
  return zone === 'MONSTER' || zone === 'SPELL_TRAP' || zone === 'FIELD';
}
