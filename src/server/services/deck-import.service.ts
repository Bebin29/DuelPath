import { sectionFor, type Section } from '@/lib/deck/deck-rules';
import {
  detectFormat,
  parseDeckList,
  parseYdk,
  parseYdke,
  parseYgoprodeckHtml,
  ygoprodeckSlug,
  type ImportFormat,
  type PasscodeSections,
} from '@/lib/deck/import-text';
import { findCard, userNicknames } from '@/server/api/combo-api';
import { idsForPasscodes } from './deck-store.service';

/**
 * Deck-Inhalt aus eingefügtem Text auflösen, für Deckseite und REST-API gleich. Schreibt nichts;
 * das Speichern bleibt beim Aufrufer, der entscheidet, ob fehlende Karten abbrechen.
 */

export type CardRef = string | { card: string; quantity: number };

export interface ResolvedDeck {
  format: ImportFormat;
  sections: Record<Section, string[]>;
  /** Passcodes oder Namen, die es in der Kartendatenbank nicht gibt */
  missing: string[];
  /** Namen, die nur ungefähr passten, mit dem gefundenen Kartennamen */
  matched: { ref: string; name: string }[];
}

export type ImportProblem = 'invalidYdke' | 'fetchFailed' | 'noDeckOnPage' | 'empty' | 'tooMany';

// Grenzen wie beim bisherigen YDK-Import; echte Decks liegen weit darunter
const LIMIT: Record<Section, number> = { MAIN: 100, EXTRA: 30, SIDE: 30 };

/** Kartenlisten auflösen; Extra-Deck-Karten im Main Deck wandern ins Extra Deck */
export async function resolveLists(userId: string, lists: Partial<Record<Section, CardRef[]>>) {
  const nicknames = await userNicknames(userId);
  const cache = new Map<string, Awaited<ReturnType<typeof findCard>>>();
  const sections: Record<Section, string[]> = { MAIN: [], EXTRA: [], SIDE: [] };
  const missing: string[] = [];
  const matched: { ref: string; name: string }[] = [];
  for (const [section, refs] of Object.entries(lists) as [Section, CardRef[] | undefined][]) {
    for (const ref of refs ?? []) {
      const { card: query, quantity } = typeof ref === 'string' ? { card: ref, quantity: 1 } : ref;
      if (!cache.has(query)) cache.set(query, await findCard(query, nicknames));
      const card = cache.get(query);
      if (!card) {
        missing.push(query);
        continue;
      }
      if (card.name.toLowerCase() !== query.toLowerCase() && card.id !== query)
        matched.push({ ref: query, name: card.name });
      const target = section === 'SIDE' ? 'SIDE' : sectionFor(card.type);
      for (let i = 0; i < quantity; i++) sections[target].push(card.id);
    }
  }
  return { sections, missing: [...new Set(missing)], matched };
}

async function fromPasscodes(format: ImportFormat, parsed: PasscodeSections) {
  const { map, missing } = await idsForPasscodes([...parsed.main, ...parsed.extra, ...parsed.side]);
  return {
    format,
    sections: { MAIN: map(parsed.main), EXTRA: map(parsed.extra), SIDE: map(parsed.side) },
    missing,
    matched: [],
  };
}

const MAX_PAGE = 3_000_000;

/** Nur ygoprodeck.com/deck/<slug>, ohne Weiterleitung, mit Timeout und Größenlimit */
async function fetchYgoprodeck(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`https://ygoprodeck.com/deck/${slug}`, {
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'DuelPath deck import' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    return html.length > MAX_PAGE ? null : html;
  } catch {
    return null;
  }
}

export async function resolveImport(
  userId: string,
  text: string
): Promise<{ data: ResolvedDeck } | { problem: ImportProblem }> {
  const format = detectFormat(text);
  let resolved: ResolvedDeck;
  if (format === 'ydke') {
    const parsed = parseYdke(text);
    if (!parsed) return { problem: 'invalidYdke' };
    resolved = await fromPasscodes(format, parsed);
  } else if (format === 'url') {
    const html = await fetchYgoprodeck(ygoprodeckSlug(text)!);
    if (!html) return { problem: 'fetchFailed' };
    const parsed = parseYgoprodeckHtml(html);
    if (!parsed) return { problem: 'noDeckOnPage' };
    resolved = await fromPasscodes(format, parsed);
  } else if (format === 'ydk') {
    resolved = await fromPasscodes(format, parseYdk(text));
  } else {
    const list = parseDeckList(text);
    const toRefs = (lines: typeof list.main) =>
      lines.map((l) => ({ card: l.name, quantity: l.quantity }));
    resolved = {
      format,
      ...(await resolveLists(userId, {
        MAIN: toRefs(list.main),
        EXTRA: toRefs(list.extra),
        SIDE: toRefs(list.side),
      })),
    };
  }
  if ((Object.keys(LIMIT) as Section[]).some((k) => resolved.sections[k].length > LIMIT[k]))
    return { problem: 'tooMany' };
  const found = Object.values(resolved.sections).some((s) => s.length > 0);
  return found || resolved.missing.length ? { data: resolved } : { problem: 'empty' };
}
