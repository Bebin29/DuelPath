import { parseYDKFile } from '@/lib/utils/deck.utils';

/**
 * Deck-Import aus eingefügtem Text: ydke-Link (EDOPro, Discord), YGOPRODeck-Deck-URL, YDK-Inhalt
 * oder eine Kartenliste wie „3 Crystal Bond“. Erkennt das Format selbst.
 */

export type ImportFormat = 'ydke' | 'url' | 'ydk' | 'list';

export interface PasscodeSections {
  main: string[];
  extra: string[];
  side: string[];
}

export interface ListLine {
  name: string;
  quantity: number;
}

export type ListSections = Record<'main' | 'extra' | 'side', ListLine[]>;

const YGOPRODECK_DECK = /^https?:\/\/(?:www\.)?ygoprodeck\.com\/deck\/([a-z0-9-]+)\/?(?:[?#].*)?$/i;

export function detectFormat(text: string): ImportFormat {
  const t = text.trim();
  if (/^ydke:\/\//i.test(t)) return 'ydke';
  if (YGOPRODECK_DECK.test(t)) return 'url';
  if (/^\s*#(main|created)|^\s*!side/im.test(t)) return 'ydk';
  return 'list';
}

/** Slug einer YGOPRODeck-Deck-URL, sonst null; nur diese Adressen ruft der Server ab */
export function ygoprodeckSlug(text: string): string | null {
  return YGOPRODECK_DECK.exec(text.trim())?.[1]?.toLowerCase() ?? null;
}

/** ydke://main!extra!side!, jeder Teil Base64 aus Passcodes als 32-Bit little endian */
export function parseYdke(link: string): PasscodeSections | null {
  const parts = link
    .trim()
    .replace(/^ydke:\/\//i, '')
    .split('!');
  if (parts.length < 3) return null;
  const decode = (b64: string): string[] | null => {
    if (!b64) return [];
    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    } catch {
      return null;
    }
    if (bytes.length % 4 !== 0) return null;
    const view = new DataView(bytes.buffer);
    return Array.from({ length: bytes.length / 4 }, (_, i) => String(view.getUint32(i * 4, true)));
  };
  const [main, extra, side] = parts.slice(0, 3).map(decode);
  if (!main || !extra || !side) return null;
  return { main, extra, side };
}

export function toYdke(sections: PasscodeSections): string {
  const encode = (list: string[]) => {
    const view = new DataView(new ArrayBuffer(list.length * 4));
    list.forEach((p, i) => view.setUint32(i * 4, Number(p), true));
    return btoa(String.fromCharCode(...new Uint8Array(view.buffer)));
  };
  return `ydke://${encode(sections.main)}!${encode(sections.extra)}!${encode(sections.side)}!`;
}

/** YDK-Inhalt; nur Zeilen aus Ziffern zählen, alles andere (Kommentare, Unsinn) fällt heraus */
export function parseYdk(text: string): PasscodeSections {
  const parsed = parseYDKFile(text);
  const digits = (list: string[]) => list.filter((p) => /^\d{1,10}$/.test(p));
  return { main: digits(parsed.main), extra: digits(parsed.extra), side: digits(parsed.side) };
}

/**
 * Listen aus dem Seitenquelltext einer YGOPRODeck-Deckseite (`var maindeckjs = '[…]'`).
 * ponytail: liest eingebettete Variablen statt einer API, weil YGOPRODeck einzelne Decks nicht
 * per API ausliefert; ändert sich die Seite, schlägt der Import mit klarer Meldung fehl.
 */
export function parseYgoprodeckHtml(html: string): PasscodeSections | null {
  const list = (name: string) => {
    const m = new RegExp(`var ${name}deckjs = '(\\[[^']*\\])'`).exec(html);
    if (!m) return null;
    try {
      const parsed: unknown = JSON.parse(m[1]);
      return Array.isArray(parsed) ? parsed.map(String).filter((p) => /^\d+$/.test(p)) : null;
    } catch {
      return null;
    }
  };
  const main = list('main');
  if (!main) return null;
  return { main, extra: list('extra') ?? [], side: list('side') ?? [] };
}

// Ganze Zeile ist eine Überschrift, etwa „Extra Deck (15)“ oder „Monster: 18“; „Link Spider“ nicht
const COUNT = String.raw`\s*:?\s*(\(\d+\)|\d+)?\s*:?`;
const HEADER: [RegExp, keyof ListSections][] = [
  [new RegExp(`^(extra( deck)?|(fusion|synchro|xyz|link)( monsters?)?)${COUNT}$`, 'i'), 'extra'],
  [new RegExp(`^side( deck)?${COUNT}$`, 'i'), 'side'],
  [
    new RegExp(
      `^(main( deck)?|monsters?|spells?( cards?)?|traps?( cards?)?|zauber(karten)?|fallen(karten)?)${COUNT}$`,
      'i'
    ),
    'main',
  ],
];

/**
 * Kartenliste: eine Karte pro Zeile, Anzahl vorne („3 X“, „3x X“) oder hinten („X x3“).
 * Überschriften wie „Extra Deck (15)“ oder „Side:“ wechseln den Bereich; ohne Überschrift Main.
 * Extra-Deck-Monster im Main Deck sortiert erst der Server um, der den Kartentyp kennt.
 */
export function parseDeckList(text: string): ListSections {
  const out: ListSections = { main: [], extra: [], side: [] };
  let section: keyof ListSections = 'main';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw
      .trim()
      .replace(/^[-*•·]\s*/, '')
      .trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) continue;
    const header = HEADER.find(([re]) => re.test(line));
    if (header) {
      section = header[1];
      continue;
    }
    // Nur 1 bis 3 gilt als Anzahl, damit „7 Colored Fish“ ein Name bleibt
    const front = /^([1-3])\s*[x×]?\s+(.+)$/i.exec(line);
    const back = /^(.+?)\s+[x×]?([1-3])$/i.exec(line);
    const [name, quantity] = front
      ? [front[2], Number(front[1])]
      : back
        ? [back[1], Number(back[2])]
        : [line, 1];
    out[section].push({ name: name.trim(), quantity });
  }
  return out;
}
