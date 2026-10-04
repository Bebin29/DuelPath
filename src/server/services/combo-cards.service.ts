import { prisma } from '@/lib/prisma/client';
import { toComboCard, type ComboCard } from '@/lib/combo/cards';
import { importedCardsSchema, missingCardId, type ImportedCards } from '@/lib/combo/portable';

export const CARD_SELECT = {
  id: true,
  passcode: true,
  name: true,
  nameDe: true,
  type: true,
  race: true,
  imageSmall: true,
  effects: true,
  effectsOverride: true,
  linkMarkers: true,
} as const;

function relevantRefs(
  ids: Iterable<string>,
  imported: unknown
): [string, import('@/lib/combo/portable').CardRef][] {
  const wanted = new Set(ids);
  const parsed = importedCardsSchema.safeParse(imported);
  const refs: ImportedCards = parsed.success ? parsed.data : {};
  return Object.entries(refs).filter(([id, ref]) => wanted.has(id) && id === missingCardId(ref));
}

type CardRow = import('@/generated/prisma/client').Prisma.CardGetPayload<{
  select: typeof CARD_SELECT;
}>;

/** One catalogue query can serve many combos, without merging their private stubs. */
export async function loadCardRows(
  ids: Iterable<string>,
  imports: unknown[] = []
): Promise<CardRow[]> {
  const wanted = [...ids];
  const relevant = imports.flatMap((value) => relevantRefs(wanted, value));
  const passcodes = relevant.flatMap(([, r]) => (r.passcode ? [r.passcode] : []));
  const names = relevant.filter(([, r]) => !r.passcode).map(([, r]) => r.name);
  return prisma.card.findMany({
    where: {
      OR: [{ id: { in: wanted } }, { passcode: { in: passcodes } }, { name: { in: names } }],
    },
    select: CARD_SELECT,
  });
}

/** Stubs remain combo-local. A subsequently installed card wins, including effective errata. */
export function cardsForCombo(
  ids: Iterable<string>,
  imported: unknown,
  rows: CardRow[]
): ComboCard[] {
  const wanted = new Set(ids);
  const cards = new Map(rows.filter((r) => wanted.has(r.id)).map((r) => [r.id, toComboCard(r)]));
  const byPasscode = new Map(rows.filter((r) => r.passcode).map((r) => [r.passcode, r]));
  const byName = new Map(rows.map((r) => [r.name, r]));
  for (const [id, ref] of relevantRefs(wanted, imported)) {
    if (cards.has(id)) continue;
    const local = ref.passcode ? byPasscode.get(ref.passcode) : byName.get(ref.name);
    cards.set(
      id,
      local
        ? { ...toComboCard(local), id, catalogueId: local.id }
        : {
            id,
            name: ref.name,
            nameDe: null,
            passcode: ref.passcode,
            imageSmall: null,
            type: ref.type ?? '',
            race: ref.race ?? null,
            importedStub: true,
            effects: (ref.effects ?? []).map((e) => ({ ...e, text: '', patterns: [] })),
          }
    );
  }
  return [...cards.values()];
}

export async function loadCards(
  ids: Iterable<string>,
  imported: unknown = null
): Promise<ComboCard[]> {
  const wanted = [...ids];
  return cardsForCombo(wanted, imported, await loadCardRows(wanted, [imported]));
}
