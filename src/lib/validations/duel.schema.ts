import { z } from "zod";
import { DuelPhase } from "@/types/duel.types";

/**
 * Basis-Schema für PlayerId
 */
const playerIdSchema = z.enum(["PLAYER", "OPPONENT"]);

/**
 * Basis-Schema für DuelPhase
 */
const duelPhaseSchema = z.nativeEnum(DuelPhase);

/**
 * Schema für DRAW Action
 */
const drawActionSchema = z.object({
  type: z.literal("DRAW"),
  player: playerIdSchema,
  count: z.number().int().min(1).max(5), // max. 5 Karten ziehen
});

/**
 * Schema für NORMAL_SUMMON Action
 */
const normalSummonActionSchema = z.object({
  type: z.literal("NORMAL_SUMMON"),
  player: playerIdSchema,
  cardInstanceId: z.string().min(1),
  targetZoneIndex: z.number().int().min(0).max(4), // 0-4 für Monster-Zone
});

/**
 * Schema für SET_MONSTER Action
 */
const setMonsterActionSchema = z.object({
  type: z.literal("SET_MONSTER"),
  player: playerIdSchema,
  cardInstanceId: z.string().min(1),
  targetZoneIndex: z.number().int().min(0).max(4), // 0-4 für Monster-Zone
});

/**
 * Schema für ACTIVATE_SPELL Action
 */
const activateSpellActionSchema = z.object({
  type: z.literal("ACTIVATE_SPELL"),
  player: playerIdSchema,
  cardInstanceId: z.string().min(1),
  targetZoneIndex: z.number().int().min(0).max(4).optional(), // 0-4 für Spell/Trap-Zone
});

/**
 * Schema für SET_SPELL Action
 */
const setSpellActionSchema = z.object({
  type: z.literal("SET_SPELL"),
  player: playerIdSchema,
  cardInstanceId: z.string().min(1),
  targetZoneIndex: z.number().int().min(0).max(4).optional(), // 0-4 für Spell/Trap-Zone
});

/**
 * Schema für ATTACK Action
 */
const attackActionSchema = z.object({
  type: z.literal("ATTACK"),
  player: playerIdSchema,
  attackerId: z.string().min(1),
  target: z.union([
    z.literal("LP"),
    z.object({ cardInstanceId: z.string().min(1) })
  ]).optional(),
});

/**
 * Schema für CHANGE_PHASE Action
 */
const changePhaseActionSchema = z.object({
  type: z.literal("CHANGE_PHASE"),
  nextPhase: duelPhaseSchema,
});

/**
 * Schema für END_DUEL Action
 */
const endDuelActionSchema = z.object({
  type: z.literal("END_DUEL"),
  winner: playerIdSchema,
});

/**
 * Vollständiges DuelAction Schema (Discriminated Union)
 */
export const duelActionSchema = z.discriminatedUnion("type", [
  drawActionSchema,
  normalSummonActionSchema,
  setMonsterActionSchema,
  activateSpellActionSchema,
  setSpellActionSchema,
  attackActionSchema,
  changePhaseActionSchema,
  endDuelActionSchema,
]);

/**
 * Typ für validierte DuelAction
 */
export type ValidatedDuelAction = z.infer<typeof duelActionSchema>;

/**
 * Duel-Validierungsregeln
 */
export const DUEL_VALIDATION_RULES = {
  MAX_HAND_SIZE: 7, // maximale Handgröße (vereinfacht)
  MONSTER_ZONE_SIZE: 5,
  SPELL_TRAP_ZONE_SIZE: 5,
  MAX_NORMAL_SUMMONS_PER_TURN: 1,
  MAX_ATTACKS_PER_TURN: 1, // pro Monster
  MIN_LP: 0,
  MAX_LP: 99999,
} as const;

/**
 * Validierungsergebnis-Interface
 */
export interface DuelValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Einfache Validierung für Action-Form (nur Struktur, nicht Logik)
 */
export function validateDuelAction(action: unknown): DuelValidationResult {
  const result = duelActionSchema.safeParse(action);

  if (result.success) {
    return { ok: true, errors: [], warnings: [] };
  }

  return {
    ok: false,
    errors: result.error.errors.map(err => err.message),
    warnings: [],
  };
}
