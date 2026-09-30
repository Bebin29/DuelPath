import type { Zone } from '@/lib/combo/state';
import { initialsOf, nicknameTargets } from '@/lib/cards/nicknames';

/**
 * Befehlszeile in Strg+K (UX-Plan 9): „ns aluber“, „act ash 2“, „ss albion“, „res“.
 * Der Befehl nennt die Aktion wie im Aktionsmenü, die Karte per Name, Spitzname oder Kürzel.
 */

export type CommandVerb =
  | 'ns'
  | 'set'
  | 'ss'
  | 'act'
  | 'gy'
  | 'banish'
  | 'hand'
  | 'deck'
  | 'pos'
  | 'resolve'
  | 'end'
  | 'staple';

const ALIASES: Record<string, CommandVerb> = {
  ns: 'ns',
  summon: 'ns',
  set: 'set',
  ss: 'ss',
  special: 'ss',
  act: 'act',
  a: 'act',
  activate: 'act',
  gy: 'gy',
  send: 'gy',
  ban: 'banish',
  banish: 'banish',
  hand: 'hand',
  add: 'hand',
  deck: 'deck',
  pos: 'pos',
  res: 'resolve',
  resolve: 'resolve',
  end: 'end',
  o: 'staple',
  vs: 'staple',
};

/** Befehle ohne Karte */
const BARE: CommandVerb[] = ['resolve', 'end'];

export interface Command {
  verb: CommandVerb;
  query: string;
  /** Effektnummer ab 1, bei „act ash 2“ */
  effect?: number;
}

export function parseCommand(text: string): Command | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const verb = ALIASES[words[0].toLowerCase()];
  if (!verb) return null;
  if (BARE.includes(verb)) return words.length === 1 ? { verb, query: '' } : null;
  let rest = words.slice(1);
  let effect: number | undefined;
  if (verb === 'act' && rest.length > 1 && /^[1-9]$/.test(rest.at(-1)!)) {
    effect = Number(rest.at(-1));
    rest = rest.slice(0, -1);
  }
  const query = rest.join(' ');
  return query ? { verb, query, ...(effect && { effect }) } : { verb, query: '' };
}

export interface NamedCard {
  id: string;
  name: string;
  nameDe?: string | null;
  zone?: Zone;
}

/** Wo eine Aktion eine Karte meistens meint; frühere Zonen gewinnen bei gleichem Namen */
export const PREFERRED_ZONES: Record<CommandVerb, Zone[]> = {
  ns: ['HAND'],
  set: ['HAND'],
  ss: ['HAND', 'EXTRA', 'GY', 'BANISHED', 'DECK'],
  act: ['MONSTER', 'SPELL_TRAP', 'FIELD', 'HAND', 'GY', 'BANISHED'],
  gy: ['MONSTER', 'SPELL_TRAP', 'FIELD', 'HAND', 'DECK', 'EXTRA'],
  banish: ['GY', 'MONSTER', 'SPELL_TRAP', 'HAND', 'DECK', 'EXTRA'],
  hand: ['DECK', 'GY', 'BANISHED', 'MONSTER', 'SPELL_TRAP'],
  deck: ['HAND', 'GY', 'BANISHED', 'MONSTER', 'SPELL_TRAP'],
  pos: ['MONSTER'],
  resolve: [],
  end: [],
  staple: [],
};

/**
 * Karten, die zur Eingabe passen: Spitzname vor Kürzel vor Wortanfang vor Teiltreffer,
 * danach nach der bevorzugten Zone der Aktion.
 */
export function matchCards<T extends NamedCard>(
  query: string,
  cards: T[],
  zones: Zone[] = [],
  extraNicknames?: Record<string, string[]>
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const nick = new Set(
    [...(extraNicknames?.[q] ?? []), ...nicknameTargets(q)].map((n) => n.toLowerCase())
  );
  const score = (c: T) => {
    const names = [c.name, c.nameDe ?? ''].map((n) => n.toLowerCase());
    if (nick.has(c.name.toLowerCase())) return 0;
    if (initialsOf(c.name) === q) return 1;
    if (names.some((n) => n.split(/[\s,"-]+/).some((w) => w.startsWith(q)))) return 2;
    if (names.some((n) => n.includes(q))) return 3;
    return -1;
  };
  const zoneRank = (c: T) => {
    const i = c.zone ? zones.indexOf(c.zone) : -1;
    return i < 0 ? zones.length : i;
  };
  return cards
    .map((c) => ({ c, s: score(c) }))
    .filter(({ s }) => s >= 0)
    .sort((a, b) => a.s - b.s || zoneRank(a.c) - zoneRank(b.c))
    .map(({ c }) => c);
}
