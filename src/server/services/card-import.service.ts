import { initialsOf } from '@/lib/cards/nicknames';
import { prisma } from '@/lib/prisma/client';
import { parseEffects } from '@/lib/cards/effects';
import type { Prisma } from '@/generated/prisma/client';

/**
 * Import der TCG-Kartendatenbank von YGOPRODeck
 *
 * Zwei Abrufe (englisch mit misc_info, deutsch), dann Upsert in Transaktionen.
 * OCG-only-Karten (ohne tcg_date) werden übersprungen.
 */

const API_URL = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const DB_VERSION_URL = 'https://db.ygoprodeck.com/api/v7/checkDBVer.php';
const BATCH_SIZE = 500;

export interface YGOPRODeckCard {
  id: number;
  name: string;
  type: string;
  race?: string;
  attribute?: string;
  level?: number;
  linkval?: number;
  linkmarkers?: string[];
  scale?: number;
  atk?: number;
  def?: number;
  desc?: string;
  archetype?: string;
  banlist_info?: { ban_tcg?: string; ban_ocg?: string };
  misc_info?: Array<{ tcg_date?: string }>;
}

export interface ImportStats {
  fetched: number;
  imported: number;
  skippedNonTcg: number;
  needsReview: number;
  /** Stand der aktuellen Banlist nach dem Import */
  banlistDate: Date;
}

async function fetchCards(query: string): Promise<YGOPRODeckCard[]> {
  const res = await fetch(`${API_URL}?${query}`);
  if (!res.ok) throw new Error(`YGOPRODeck request failed: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { data?: YGOPRODeckCard[] };
  if (!Array.isArray(json.data)) throw new Error('Invalid YGOPRODeck response');
  return json.data;
}

/** Datum aus checkDBVer.php; null, wenn die Antwort keins enthält */
export function parseDbDate(json: unknown): Date | null {
  const entry = Array.isArray(json) ? (json[0] as { last_update?: unknown }) : null;
  const raw = entry?.last_update;
  if (typeof raw !== 'string') return null;
  // "2026-09-30 14:12:03" ist keine ISO-Angabe; als Ortszeit lesen, damit das Datum stimmt
  const date = new Date(raw.trim().replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Stand der Banlist. YGOPRODeck nennt kein eigenes Datum zur Liste, deshalb gilt
 * der letzte Stand der Kartendatenbank. Er lässt sich in den Einstellungen
 * nachtragen, wenn die Liste älter ist als die Datenbank.
 */
async function fetchBanlistDate(): Promise<Date> {
  try {
    const res = await fetch(DB_VERSION_URL);
    if (!res.ok) return new Date();
    return parseDbDate(await res.json()) ?? new Date();
  } catch {
    return new Date();
  }
}

/** Wandelt eine YGOPRODeck-Karte in Card-Daten um; null für Karten ohne TCG-Release und Skill Cards */
export function mapCard(
  card: YGOPRODeckCard,
  german?: Pick<YGOPRODeckCard, 'name' | 'desc'>
): Prisma.CardCreateInput | null {
  const tcgDate = card.misc_info?.[0]?.tcg_date;
  if (!tcgDate) return null;
  // Skill Cards gibt es nur im Speed Duel, nicht in TCG-Decks
  if (card.type === 'Skill Card') return null;

  const passcode = String(card.id);
  const parsed = parseEffects(card.desc ?? '', card);

  return {
    id: passcode,
    passcode,
    name: card.name,
    nameDe: german?.name ?? null,
    initials: initialsOf(card.name),
    type: card.type,
    race: card.race ?? null,
    attribute: card.attribute ?? null,
    level: card.level ?? card.linkval ?? null,
    linkMarkers: card.linkmarkers ?? [],
    scale: card.scale ?? null,
    atk: card.atk ?? null,
    def: card.def ?? null,
    desc: card.desc ?? null,
    descDe: german?.desc ?? null,
    archetype: card.archetype ?? null,
    banTcg: card.banlist_info?.ban_tcg ?? null,
    tcgDate: new Date(tcgDate),
    effects: parsed as unknown as Prisma.InputJsonValue,
    effectsReview: parsed.needsReview,
    imageUrl: `/api/card-images/${passcode}.jpg`,
    imageSmall: `/api/card-images/${passcode}_small.jpg`,
  };
}

export async function importTcgCards(
  onProgress?: (done: number, total: number) => void
): Promise<ImportStats> {
  const [english, german, banlistDate] = await Promise.all([
    fetchCards('misc=yes'),
    fetchCards('language=de'),
    fetchBanlistDate(),
  ]);
  const germanById = new Map(german.map((c) => [c.id, c]));

  const cards = english
    .map((c) => mapCard(c, germanById.get(c.id)))
    .filter((c): c is Prisma.CardCreateInput => c !== null);

  for (let i = 0; i < cards.length; i += BATCH_SIZE) {
    const batch = cards.slice(i, i + BATCH_SIZE);
    // effectsJev bleibt beim Update erhalten; ein Neuimport setzt die Jev-Prüfung nicht zurück
    await prisma.$transaction(
      batch.map((data) =>
        prisma.card.upsert({ where: { id: data.id }, create: data, update: data })
      )
    );
    onProgress?.(Math.min(i + BATCH_SIZE, cards.length), cards.length);
  }

  // Die aktuelle Liste steht an den Karten selbst; hier kommt nur ihr Stand dazu
  await prisma.banlist.upsert({
    where: { key: 'current' },
    create: { key: 'current', name: 'TCG', effectiveOn: banlistDate },
    update: { effectiveOn: banlistDate },
  });

  return {
    fetched: english.length,
    imported: cards.length,
    skippedNonTcg: english.length - cards.length,
    needsReview: cards.filter((c) => c.effectsReview).length,
    banlistDate,
  };
}
