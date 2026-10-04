import { initialsOf } from '@/lib/cards/nicknames';
import { prisma } from '@/lib/prisma/client';
import { parseEffects } from '@/lib/cards/effects';
import type { Prisma } from '@/generated/prisma/client';

/**
 * Import der Kartendatenbank von YGOPRODeck
 *
 * Zwei Abrufe (englisch mit misc_info, deutsch), dann Upsert in Transaktionen.
 * OCG-Karten ohne TCG-Release kommen mit `tcgDate = null` hinein, damit Listen aus Master Duel
 * oder EDOPro vollständig importierbar sind; die Deckprüfung weist auf sie hin.
 * Übersprungen werden nur Karten ohne TCG- und OCG-Release (Tokens, Duel-Links-Karten).
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
  linkmarkers?: string[];
  scale?: number;
  atk?: number;
  def?: number;
  desc?: string;
  archetype?: string;
  banlist_info?: { ban_tcg?: string; ban_ocg?: string };
  misc_info?: Array<{ tcg_date?: string; ocg_date?: string }>;
}

export interface ImportStats {
  fetched: number;
  imported: number;
  /** davon ohne TCG-Release */
  ocgOnly: number;
  skipped: number;
  needsReview: number;
  /** Zeitpunkt des erfolgreichen Imports, kein Gültigkeitsdatum der Banlist */
  importedAt: Date;
}

async function fetchCards(query: string): Promise<YGOPRODeckCard[]> {
  const res = await fetch(`${API_URL}?${query}`);
  if (!res.ok) throw new Error(`YGOPRODeck request failed: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as { data?: YGOPRODeckCard[] };
  if (!Array.isArray(json.data)) throw new Error('Invalid YGOPRODeck response');
  return json.data;
}

/** Wandelt eine YGOPRODeck-Karte in Card-Daten um; null ohne TCG- und OCG-Release und für Skill Cards */
export function mapCard(
  card: YGOPRODeckCard,
  german?: Pick<YGOPRODeckCard, 'name' | 'desc'>
): Prisma.CardCreateInput | null {
  const tcgDate = card.misc_info?.[0]?.tcg_date;
  if (!tcgDate && !card.misc_info?.[0]?.ocg_date) return null;
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
    tcgDate: tcgDate ? new Date(tcgDate) : null,
    effects: parsed as unknown as Prisma.InputJsonValue,
    effectsReview: parsed.needsReview,
    imageUrl: `/api/card-images/${passcode}.jpg`,
    imageSmall: `/api/card-images/${passcode}_small.jpg`,
  };
}

export async function importCards(
  onProgress?: (done: number, total: number) => void
): Promise<ImportStats> {
  const [english, german] = await Promise.all([fetchCards('misc=yes'), fetchCards('language=de')]);
  const germanById = new Map(german.map((c) => [c.id, c]));

  const cards = english
    .map((c) => mapCard(c, germanById.get(c.id)))
    .filter((c): c is Prisma.CardCreateInput => c !== null);

  const previous = await prisma.card.findMany({ select: { id: true, banTcg: true } });
  const oldStatuses = new Map(previous.map((c) => [c.id, c.banTcg]));
  const changed = cards.some((c) => (oldStatuses.get(c.id!) ?? null) !== (c.banTcg ?? null));

  // Invalidate provenance before any batch changes cards, including partial failed imports.
  if (changed)
    await prisma.banlist.updateMany({
      where: { key: 'current' },
      data: { effectiveOn: null, importedAt: null },
    });

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

  // Der Import kennt kein offizielles Gültigkeitsdatum. Ein bestätigtes Datum bleibt
  // nur bei unveränderten Beschränkungen erhalten; Abrufzeit und Gültigkeit sind getrennt.
  const importedAt = new Date();
  await prisma.banlist.upsert({
    where: { key: 'current' },
    create: { key: 'current', name: 'TCG', importedAt },
    update: { importedAt, ...(changed && { effectiveOn: null }) },
  });

  return {
    fetched: english.length,
    imported: cards.length,
    ocgOnly: cards.filter((c) => !c.tcgDate).length,
    skipped: english.length - cards.length,
    needsReview: cards.filter((c) => c.effectsReview).length,
    importedAt,
  };
}
