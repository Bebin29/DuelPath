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
const BATCH_SIZE = 500;

export interface YGOPRODeckCard {
  id: number;
  name: string;
  type: string;
  race?: string;
  attribute?: string;
  level?: number;
  linkval?: number;
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
}

async function fetchCards(query: string): Promise<YGOPRODeckCard[]> {
  const res = await fetch(`${API_URL}?${query}`);
  if (!res.ok) throw new Error(`YGOPRODeck request failed: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { data?: YGOPRODeckCard[] };
  if (!Array.isArray(json.data)) throw new Error('Invalid YGOPRODeck response');
  return json.data;
}

/** Wandelt eine YGOPRODeck-Karte in Card-Daten um; null für Karten ohne TCG-Release */
export function mapCard(
  card: YGOPRODeckCard,
  german?: Pick<YGOPRODeckCard, 'name' | 'desc'>
): Prisma.CardCreateInput | null {
  const tcgDate = card.misc_info?.[0]?.tcg_date;
  if (!tcgDate) return null;

  const passcode = String(card.id);
  const parsed = parseEffects(card.desc ?? '', card);

  return {
    id: passcode,
    passcode,
    name: card.name,
    nameDe: german?.name ?? null,
    type: card.type,
    race: card.race ?? null,
    attribute: card.attribute ?? null,
    level: card.level ?? card.linkval ?? null,
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
  const [english, german] = await Promise.all([fetchCards('misc=yes'), fetchCards('language=de')]);
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

  return {
    fetched: english.length,
    imported: cards.length,
    skippedNonTcg: english.length - cards.length,
    needsReview: cards.filter((c) => c.effectsReview).length,
  };
}
