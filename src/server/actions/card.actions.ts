'use server';

import { z } from 'zod';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import type { CardEffect, ParsedEffects } from '@/lib/cards/effects';
import { buildEffects, effectsOf } from '@/lib/cards/effect-override';

type Result<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export interface CardDetail {
  id: string;
  name: string;
  nameDe: string | null;
  type: string;
  race: string | null;
  attribute: string | null;
  level: number | null;
  atk: number | null;
  def: number | null;
  desc: string | null;
  descDe: string | null;
  banTcg: string | null;
  imageSmall: string | null;
  /** Wirksame Effekte (Korrektur vor Import) */
  effects: CardEffect[];
  /** Zerlegung aus dem Import, für „Zurücksetzen“ */
  imported: CardEffect[];
  reviewReasons: string[];
  overridden: boolean;
}

/** Kartenansicht (UI-Plan 7.4.4): alles zur Karte, auch Gründe für eine unsichere Zerlegung */
export async function getCardDetail(cardId: string): Promise<Result<CardDetail>> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card) return { error: 'Not found' };
  const parsed = card.effects as unknown as ParsedEffects | null;
  return {
    data: {
      id: card.id,
      name: card.name,
      nameDe: card.nameDe,
      type: card.type,
      race: card.race,
      attribute: card.attribute,
      level: card.level,
      atk: card.atk,
      def: card.def,
      desc: card.desc,
      descDe: card.descDe,
      banTcg: card.banTcg,
      imageSmall: card.imageSmall,
      effects: effectsOf(card),
      imported: parsed?.effects ?? [],
      reviewReasons: card.effectsOverride ? [] : (parsed?.reviewReasons ?? []),
      overridden: Array.isArray(card.effectsOverride),
    },
  };
}

const draftSchema = z.object({
  text: z.string().max(1500),
  activated: z.boolean(),
  opt: z.enum(['NONE', 'SOFT', 'HARD']),
  original: z
    .object({
      kind: z.enum(['SOFT', 'HARD']),
      wording: z.enum(['use', 'shared', 'activate', 'activateCard', 'apply']),
      per: z.enum(['turn', 'duel']),
      limit: z.number().int().min(1).max(3),
      group: z.string().max(200).optional(),
    })
    .optional(),
  section: z.enum(['pendulum', 'monster']).optional(),
});

/**
 * Speichert die Korrektur für alle Combos (UX-Plan 8); null stellt die Zerlegung aus dem Import wieder her.
 * Die Muster werden aus dem Text neu erkannt, damit Regeln und Stresstest dazu passen.
 */
export async function saveEffectOverride(
  cardId: string,
  drafts: z.input<typeof draftSchema>[] | null
): Promise<Result<CardEffect[]>> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  const card = await prisma.card.findUnique({ where: { id: cardId }, select: { effects: true } });
  if (!card) return { error: 'Not found' };

  if (drafts === null) {
    await prisma.card.update({
      where: { id: cardId },
      data: { effectsOverride: null as unknown as Prisma.InputJsonValue },
    });
    return { data: (card.effects as unknown as ParsedEffects | null)?.effects ?? [] };
  }
  const parsed = z.array(draftSchema).max(16).safeParse(drafts);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Ungültige Effekte' };
  const effects = buildEffects(parsed.data);
  await prisma.card.update({
    where: { id: cardId },
    data: { effectsOverride: effects as unknown as Prisma.InputJsonValue },
  });
  return { data: effects };
}
