import type { CardData, GameState, PlacedCard, Player, Zone } from '@/lib/combo/state';
import { isExtraDeckMonster, isMonster, isSpell, isTrap } from '@/lib/combo/play';

/**
 * Wirkungsmuster aus dem Kartentext (UX-Plan 6.4, Projektplan Abschnitt 16 „Wirkungsmuster“).
 * Liefert, was die Schrittleiste fragen muss: „Was hast du gesucht?“, „Was hast du beschworen?“ …
 * Eine Heuristik über PSCT; wenn nichts passt, bleibt die freie Bewegung am Board.
 */

export type ResultVerb = 'search' | 'summon' | 'send' | 'banish' | 'fusion';

export interface ResultSpec {
  verb: ResultVerb;
  from: Zone[];
  to: Zone;
  /** Höchstzahl der Karten, die gewählt werden */
  count: number;
  /** Namensbestandteile in Anführungszeichen, etwa "Branded"; leer = keine Einschränkung */
  names: string[];
  except: string[];
  kind: 'monster' | 'spell' | 'trap' | 'spellTrap' | 'any';
  /** Nur bei Fusion: Materialzonen und Anzahl */
  materials?: { from: Zone[]; count: number };
}

const COUNT: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3 };
const countOf = (word: string | undefined) =>
  word ? Number(word) || COUNT[word.toLowerCase()] || 1 : 1;

const ZONE_WORDS: [RegExp, Zone][] = [
  [/\bhand\b/i, 'HAND'],
  [/\bDeck\b/, 'DECK'],
  [/\b(?:GY|Graveyard)\b/, 'GY'],
  [/\bfield\b/i, 'MONSTER'],
  [/\bbanished\b/i, 'BANISHED'],
];
const zonesIn = (phrase: string) => ZONE_WORDS.filter(([re]) => re.test(phrase)).map(([, z]) => z);

/** Wirkungsteil nach PSCT: hinter dem Semikolon, sonst hinter dem Doppelpunkt */
export function resolutionPart(text: string): string {
  const semi = text.indexOf(';');
  if (semi >= 0) return text.slice(semi + 1);
  const colon = text.indexOf(':');
  return colon >= 0 ? text.slice(colon + 1) : text;
}

function objectFilter(
  object: string,
  sentence: string
): Pick<ResultSpec, 'names' | 'except' | 'kind'> {
  const exceptMatch = /except "(.+?)"/.exec(sentence);
  const withoutExcept = object.replace(/except "(.+?)"/g, '');
  const names = [...withoutExcept.matchAll(/"(.+?)"/g)].map((m) => m[1]);
  const kind: ResultSpec['kind'] = /Spell\/Trap/.test(object)
    ? 'spellTrap'
    : /\bSpell\b/.test(object)
      ? 'spell'
      : /\bTrap\b/.test(object)
        ? 'trap'
        : /\bmonsters?\b/i.test(object)
          ? 'monster'
          : 'any';
  return { names, except: exceptMatch ? [exceptMatch[1]] : [], kind };
}

export function resultSpec(card: CardData | undefined, effectIndex: number): ResultSpec | null {
  const text = card?.effects[effectIndex]?.text;
  if (!text) return null;
  const part = resolutionPart(text);

  const fusion = /Fusion Summon (?:1|one) Fusion Monster/i.exec(part);
  if (fusion) {
    const using =
      /using (?:(\w+) )?monsters? (?:from your|on either|on your) ([^.]*?) as (?:Fusion )?Material/i.exec(
        part
      );
    const zones = using ? zonesIn(using[2]) : [];
    return {
      verb: 'fusion',
      from: ['EXTRA'],
      to: 'MONSTER',
      count: 1,
      names: [],
      except: [],
      kind: 'monster',
      materials: {
        from: zones.length ? zones : ['HAND', 'MONSTER'],
        count: using?.[1] ? countOf(using[1]) : 2,
      },
    };
  }

  const patterns: [RegExp, ResultVerb, (m: RegExpExecArray) => { from: Zone[]; to: Zone }][] = [
    [
      /add (?:up to )?(\w+) (.+?) from your (Deck|GY|Graveyard|Deck or GY|GY or Deck)(?: and\/or [^,.]+)? to your hand/i,
      'search',
      (m) => ({ from: zonesIn(m[3]), to: 'HAND' }),
    ],
    [
      /take (\w+) (.+?) from your (Deck|GY)/i,
      'search',
      (m) => ({ from: zonesIn(m[3]), to: 'HAND' }),
    ],
    [
      /Special Summon (?:up to )?(\w+) (.+?) from your ([^,.;]+?)(?: in (?:Attack|Defense) Position|,|\.|;| but| and)/i,
      'summon',
      (m) => ({ from: zonesIn(m[3]), to: 'MONSTER' }),
    ],
    [
      /send (?:up to )?(\w+) (.+?) from your (Deck|hand|Extra Deck) to the GY/i,
      'send',
      (m) => ({ from: m[3] === 'Extra Deck' ? ['EXTRA'] : zonesIn(m[3]), to: 'GY' }),
    ],
    [
      /banish (?:up to )?(\w+) (.+?) from your (Deck|GY|Graveyard)/i,
      'banish',
      (m) => ({ from: zonesIn(m[3]), to: 'BANISHED' }),
    ],
  ];
  for (const [re, verb, zones] of patterns) {
    const m = re.exec(part);
    if (!m || /\bthis card\b/i.test(m[2])) continue;
    const { from, to } = zones(m);
    if (!from.length) continue;
    const sentence = part.slice(m.index).split(/(?<=\.)\s/)[0];
    return { verb, from, to, count: countOf(m[1]), ...objectFilter(m[2], sentence) };
  }
  return null;
}

function matches(spec: ResultSpec, card: CardData): boolean {
  if (spec.except.includes(card.name)) return false;
  if (spec.names.length && !spec.names.some((n) => card.name.includes(n))) return false;
  switch (spec.kind) {
    case 'monster':
      return isMonster(card);
    case 'spell':
      return isSpell(card);
    case 'trap':
      return isTrap(card);
    case 'spellTrap':
      return isSpell(card) || isTrap(card);
    default:
      return true;
  }
}

/**
 * Karten, die zur Abfrage passen. Aus Deck und Extra Deck je Kartenname nur eine Kopie;
 * mit `all` ohne Namensfilter („Alle Karten“, wenn die Heuristik danebenliegt).
 */
export function resultCandidates(
  spec: ResultSpec,
  state: GameState,
  player: Player,
  cards: Map<string, CardData>,
  all = false
): PlacedCard[] {
  const seen = new Set<string>();
  const out: PlacedCard[] = [];
  const filter: ResultSpec = all ? { ...spec, names: [], except: [], kind: 'any' } : spec;
  for (const c of Object.values(state.cards).sort((a, b) =>
    a.instanceId.localeCompare(b.instanceId)
  )) {
    if (!spec.from.includes(c.zone)) continue;
    const owner = c.zone === 'MONSTER' ? c.controller : c.owner;
    if (owner !== player) continue;
    const card = cards.get(c.cardId);
    if (!card) continue;
    if (
      spec.verb === 'fusion'
        ? !/Fusion/.test(card.type) || !isExtraDeckMonster(card)
        : !matches(filter, card)
    )
      continue;
    const pile = c.zone === 'DECK' || c.zone === 'EXTRA';
    if (pile && seen.has(c.cardId)) continue;
    seen.add(c.cardId);
    out.push(c);
  }
  return out;
}

/** Mögliche Fusionsmaterialien in den erlaubten Zonen */
export function materialCandidates(
  spec: ResultSpec,
  state: GameState,
  player: Player,
  cards: Map<string, CardData>
): PlacedCard[] {
  const zones = spec.materials?.from ?? ['HAND', 'MONSTER'];
  const seen = new Set<string>();
  return Object.values(state.cards)
    .sort((a, b) => a.instanceId.localeCompare(b.instanceId))
    .filter((c) => {
      if (!zones.includes(c.zone) || !isMonster(cards.get(c.cardId))) return false;
      if ((c.zone === 'MONSTER' ? c.controller : c.owner) !== player) return false;
      if (c.zone === 'DECK') {
        if (seen.has(c.cardId)) return false;
        seen.add(c.cardId);
      }
      return true;
    });
}
