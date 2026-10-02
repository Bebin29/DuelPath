import type { CardData, CardMove, GameState, PlacedCard, Player, Zone } from '@/lib/combo/state';

/**
 * Ziele von Effekten (PSCT): „target 1 face-up monster your opponent controls; negate its effects“.
 * Das Ziel wird bei der Aktivierung gewählt (vor dem Semikolon) und beim Auflösen geprüft: Hat die
 * Karte den Ort gewechselt, ist sie kein gültiges Ziel mehr. Was mit dem Ziel geschieht, steht hinter
 * dem Semikolon („destroy that target“, „equip it with this card“) und wird hier abgeleitet.
 */

export interface TargetSpec {
  count: number;
  /** Zonen, in denen das Ziel liegen darf */
  zones: Zone[];
  /** Wessen Karte: Kontrolle auf dem Feld, Besitz im Friedhof und in der Verbannung */
  side: 'self' | 'opponent' | 'any';
  kind: 'monster' | 'effectMonster' | 'spellTrap' | 'spell' | 'trap' | 'any';
  faceUp?: boolean;
  /** Nur gesetzte Karten („Set Spell/Trap“) */
  set?: boolean;
  /** Namensbestandteile in Anführungszeichen, etwa "Crystal Beast" */
  names: string[];
}

const COUNT: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3 };
const FIELD: Zone[] = ['MONSTER', 'SPELL_TRAP', 'FIELD'];

/** Aktivierungsteil: bis zum Semikolon, ohne die Bedingung vor dem Doppelpunkt */
function activationPart(text: string): string | null {
  const semi = text.indexOf(';');
  if (semi < 0) return null;
  const colon = text.lastIndexOf(':', semi);
  return text.slice(colon + 1, semi);
}

export function targetSpec(card: CardData | undefined, effectIndex: number): TargetSpec | null {
  const text = card?.effects[effectIndex]?.text;
  if (!card || !text) return null;
  const part = activationPart(text);
  const m =
    part &&
    /\btarget (?:up to )?(\d+|a|an|one|two|three) (.+?)(?:,? (?:and|then|but)\b|$)/i.exec(part);
  if (!m) {
    // Equip Spells nehmen bei der Kartenaktivierung immer ein Monster als Ziel
    if (
      card.race === 'Equip' &&
      effectIndex === 0 &&
      !/\bequip (?:it|that monster) with this card\b/i.test(text)
    )
      return {
        count: 1,
        zones: ['MONSTER'],
        side: 'any',
        kind: 'monster',
        faceUp: true,
        names: [],
      };
    return null;
  }
  const count = Number(m[1]) || COUNT[m[1].toLowerCase()] || 1;
  const object = m[2];
  const names = [...object.matchAll(/"(.+?)"/g)].map((x) => x[1]);
  const kind: TargetSpec['kind'] = /\bSpell\/Trap\b/i.test(object)
    ? 'spellTrap'
    : /\bSpell\b/.test(object)
      ? 'spell'
      : /\bTrap\b/.test(object)
        ? 'trap'
        : /\bEffect Monsters?\b/.test(object)
          ? 'effectMonster'
          : /\bmonsters?\b/i.test(object)
            ? 'monster'
            : 'any';
  const zones: Zone[] = /\b(?:GY|Graveyard)\b/.test(object)
    ? ['GY']
    : /\bbanish(?:ed|ment)\b/i.test(object)
      ? ['BANISHED']
      : kind === 'monster' || kind === 'effectMonster'
        ? ['MONSTER']
        : kind === 'any'
          ? FIELD
          : ['SPELL_TRAP', 'FIELD'];
  // „on the field, including a monster you control“: beide Seiten, nicht nur die eigene
  const side: TargetSpec['side'] = /\bon the field\b/i.test(object)
    ? 'any'
    : /\byour opponent(?:'s)? (?:controls|GY|Graveyard)|\bopponent controls\b/i.test(object)
      ? 'opponent'
      : /\byou control\b|\bin your (?:GY|Graveyard)\b|\byour banished\b/i.test(object)
        ? 'self'
        : 'any';
  return {
    count,
    zones,
    side,
    kind,
    ...(/\bface-up\b/i.test(object) && { faceUp: true }),
    ...(/\bSet\b/.test(object) && { set: true }),
    names,
  };
}

function matchesKind(kind: TargetSpec['kind'], card: CardData): boolean {
  switch (kind) {
    case 'monster':
      return /Monster/.test(card.type);
    case 'effectMonster':
      return /Monster/.test(card.type) && !/Normal Monster|Token/.test(card.type);
    case 'spellTrap':
      return /Spell|Trap/.test(card.type);
    case 'spell':
      return /Spell/.test(card.type);
    case 'trap':
      return /Trap/.test(card.type);
    default:
      return true;
  }
}

/** Karten, die als Ziel in Frage kommen; `self` (aktivierende Spell/Trap) nicht */
export function targetCandidates(
  spec: TargetSpec,
  state: GameState,
  player: Player,
  cards: Map<string, CardData>,
  self?: string | null
): PlacedCard[] {
  return Object.values(state.cards)
    .filter((c) => {
      if (c.instanceId === self || !spec.zones.includes(c.zone)) return false;
      const who = FIELD.includes(c.zone) ? c.controller : c.owner;
      if (spec.side === 'self' && who !== player) return false;
      if (spec.side === 'opponent' && who === player) return false;
      if (spec.faceUp && c.position === 'SET') return false;
      if (spec.set && c.position !== 'SET') return false;
      const card = cards.get(c.cardId);
      if (!card || !matchesKind(spec.kind, card)) return false;
      return !spec.names.length || spec.names.some((n) => card.name.includes(n));
    })
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId));
}

/** Wirkungsteil nach PSCT: hinter dem Semikolon */
function resolutionPart(text: string): string {
  const semi = text.indexOf(';');
  return semi >= 0 ? text.slice(semi + 1) : text;
}

const REF =
  '(?:that target|those targets|that card|that monster|those cards|those monsters|it|them|both)';

export type TargetEffect =
  { kind: 'move'; to: Zone } | { kind: 'equip' } | { kind: 'negate' } | { kind: 'control' };

/**
 * Was die Auflösung mit den Zielen macht, abgeleitet aus dem Text. Eine Heuristik über PSCT; was sie
 * nicht kennt, trägt der Nutzer weiter als Bewegung am Schritt ein.
 */
export function targetEffects(card: CardData | undefined, effectIndex: number): TargetEffect[] {
  const text = card?.effects[effectIndex]?.text;
  if (!text) return [];
  const part = resolutionPart(text);
  const has = (re: string) => new RegExp(re, 'i').test(part);
  const out: TargetEffect[] = [];
  if (has(`\\bdestroy ${REF}\\b`)) out.push({ kind: 'move', to: 'GY' });
  else if (has(`\\bbanish ${REF}\\b`)) out.push({ kind: 'move', to: 'BANISHED' });
  else if (
    has(`\\breturn ${REF}[^.;]*\\bto the hand\\b`) ||
    has(`\\badd ${REF} to (?:your|its owner's) hand\\b`)
  )
    out.push({ kind: 'move', to: 'HAND' });
  else if (has(`\\b(?:shuffle|return) ${REF}[^.;]*\\binto the Deck\\b`))
    out.push({ kind: 'move', to: 'DECK' });
  else if (has(`\\bsend ${REF} to the GY\\b`)) out.push({ kind: 'move', to: 'GY' });
  if (
    has(`\\bequip ${REF} with this card\\b`) ||
    has(`\\bequip this card to ${REF}\\b`) ||
    (card?.race === 'Equip' && effectIndex === 0)
  )
    out.push({ kind: 'equip' });
  if (has(`\\bnegate (?:its|their|that (?:face-up )?monster's|${REF}'s) effects\\b`))
    out.push({ kind: 'negate' });
  if (has(`\\btake control of ${REF}\\b`)) out.push({ kind: 'control' });
  return out;
}

/** Ziel verlässt die Zone: in das Extra Deck statt ins Deck bei Fusion, Synchro, Xyz und Link */
export function targetMove(target: PlacedCard, to: Zone, card: CardData | undefined): CardMove {
  const extra = to === 'DECK' && !!card && /Fusion|Synchro|XYZ|Link/.test(card.type);
  return {
    instanceId: target.instanceId,
    cardId: target.cardId,
    from: target.zone,
    to: extra ? 'EXTRA' : to,
  };
}
