import { z } from 'zod';

/**
 * Validierung der Combo-Daten an der Grenze zum Server (Server Actions).
 * Die Formen entsprechen den Typen in src/lib/combo/state.ts.
 */

const id = z.string().min(1).max(64);
const player = z.enum(['self', 'opponent']);
const zone = z.enum(['HAND', 'DECK', 'EXTRA', 'MONSTER', 'SPELL_TRAP', 'FIELD', 'GY', 'BANISHED']);
const position = z.enum(['ATK', 'DEF', 'SET']);

export const cardMoveSchema = z.object({
  instanceId: id,
  cardId: id.optional(),
  owner: player.optional(),
  from: zone,
  to: zone,
  slot: z.number().int().min(0).max(6).optional(),
  position: position.optional(),
  controller: player.optional(),
});

const negationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ACTIVATION'), nodeId: id }),
  z.object({ type: z.literal('EFFECT'), nodeId: id }),
  z.object({ type: z.literal('SUMMON'), nodeId: id }),
  z.object({ type: z.literal('CARD'), instanceId: id }),
  z.object({ type: z.literal('NAME'), cardId: id }),
]);

export const comboNodeSchema = z.object({
  id,
  parentId: id.nullable(),
  rank: z.number().int().min(0).max(999).default(0),
  kind: z.enum(['ACTION', 'ACTIVATE', 'OPPONENT', 'RESOLVE', 'END']),
  player,
  edgeLabel: z.string().max(100).nullish(),
  instanceId: id.nullish(),
  cardId: id.nullish(),
  effectIndex: z.number().int().min(0).max(20).nullish(),
  action: z.enum(['NORMAL_SUMMON', 'SPECIAL_SUMMON', 'SET', 'OTHER']).nullish(),
  costMoves: z.array(cardMoveSchema).max(40).default([]),
  resolveMoves: z.array(cardMoveSchema).max(40).default([]),
  negates: negationSchema.nullish(),
  optOverride: z.boolean().nullish(),
  note: z.string().max(1000).nullish(),
  ignoredHits: z.array(z.string().max(100)).max(40).nullish(),
  interruptions: z.record(id, z.number().int().min(0).max(9)).nullish(),
});

export const startStateSchema = z.object({
  cards: z
    .array(
      z.object({
        instanceId: id,
        cardId: id,
        owner: player,
        controller: player.optional(),
        zone,
        slot: z.number().int().min(0).max(6).optional(),
        position: position.optional(),
      })
    )
    .max(200),
});

export const saveComboSchema = z.object({
  title: z.string().trim().min(1).max(100),
  deckId: id.nullable().default(null),
  startState: startStateSchema,
  tags: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  status: z.enum(['DRAFT', 'TESTED', 'TOURNAMENT']).default('DRAFT'),
  // ponytail: ganzer Baum pro Speichern; bei sehr großen Bäumen auf Diff-Speichern umstellen
  nodes: z.array(comboNodeSchema).max(500),
});

export type SaveComboInput = z.input<typeof saveComboSchema>;

export const suggestionInputSchema = z.object({
  board: z.array(z.object({ cardId: id, player, zone, position: position.optional() })).max(150),
  chain: z
    .array(
      z.object({
        cardId: id.optional(),
        player,
        effectIndex: z.number().int().min(0).max(20).optional(),
        negated: z.boolean().optional(),
      })
    )
    .max(20),
  normalSummonUsed: z.boolean(),
  candidates: z
    .array(z.object({ cardId: id, effectIndex: z.number().int().min(0).max(20), player, zone }))
    .max(30),
});
