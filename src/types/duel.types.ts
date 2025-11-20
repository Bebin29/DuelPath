import type { Card } from '@prisma/client';

/**
 * Spieler im Duell
 */
export type PlayerId = 'PLAYER' | 'OPPONENT';

/**
 * Duell-Phasen (intern als Enum, nicht als Strings)
 */
export enum DuelPhase {
  DRAW = 'DRAW',
  STANDBY = 'STANDBY',
  MAIN1 = 'MAIN1',
  BATTLE = 'BATTLE',
  MAIN2 = 'MAIN2',
  END = 'END',
}

/**
 * Kartenposition
 */
export type CardPosition =
  | 'FACE_UP_ATTACK'
  | 'FACE_UP_DEFENSE'
  | 'FACE_DOWN_ATTACK'
  | 'FACE_DOWN_DEFENSE';

/**
 * Zonen im Duell
 */
export type DuelZone =
  | 'HAND'
  | 'MONSTER_ZONE'
  | 'SPELL_TRAP_ZONE'
  | 'GRAVEYARD'
  | 'DECK'
  | 'EXTRA_DECK'
  | 'FIELD_SPELL';

/**
 * Karteninstanz im Duell (für Mehrfachkopien unterscheidbar)
 */
export interface DuelCardInstance {
  instanceId: string; // nanoid()
  cardId: string; // Referenz auf Card in DB
  position: CardPosition;
  zone: DuelZone;
  owner: PlayerId;
  hasAttackedThisTurn?: boolean;
}

/**
 * Spielerzustand im Duell
 */
export interface DuelPlayerState {
  lp: number;
  hand: DuelCardInstance[];
  monsterZone: (DuelCardInstance | null)[]; // length 5
  spellTrapZone: (DuelCardInstance | null)[]; // length 5
  graveyard: DuelCardInstance[];
  deck: DuelCardInstance[];
  extraDeck: DuelCardInstance[];
  fieldSpell?: DuelCardInstance | null;
}

/**
 * Vollständiger Duellzustand
 */
export interface DuelState {
  turnPlayer: PlayerId;
  phase: DuelPhase;
  turnCount: number;
  player: DuelPlayerState;
  opponent: DuelPlayerState;
  normalSummonUsedThisTurn: boolean;
  duelEnded: boolean;
  winner?: PlayerId;
  initialDeckOrder?: string[]; // für Reproduzierbarkeit
}

/**
 * Duell-Aktionen als Discriminated Union
 */
export type DuelAction =
  | { type: 'DRAW'; player: PlayerId; count: number }
  | { type: 'NORMAL_SUMMON'; player: PlayerId; cardInstanceId: string; targetZoneIndex: number }
  | { type: 'SET_MONSTER'; player: PlayerId; cardInstanceId: string; targetZoneIndex: number }
  | { type: 'ACTIVATE_SPELL'; player: PlayerId; cardInstanceId: string; targetZoneIndex?: number }
  | { type: 'SET_SPELL'; player: PlayerId; cardInstanceId: string; targetZoneIndex?: number }
  | {
      type: 'ATTACK';
      player: PlayerId;
      attackerId: string;
      target?: 'LP' | { cardInstanceId: string };
    }
  | { type: 'CHANGE_PHASE'; nextPhase: DuelPhase }
  | { type: 'END_DUEL'; winner: PlayerId };

/**
 * Log-Eintrag für Duell-Aktionen
 */
export interface DuelLogEntry {
  id: string;
  turn: number;
  phase: DuelPhase;
  player: PlayerId;
  action: DuelAction;
  timestamp: number;
  // Optionale Metadaten für erweiterte Logs
  description?: string;
  result?: string;
  cardName?: string;
}

/**
 * History-Action (vereinfacht für Undo/Redo)
 */
export type HistoryAction = DuelAction;

/**
 * Validierungsergebnis für Aktionen
 */
export interface DuelValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Verfügbare Aktionen für eine Karte/Kontext
 */
export interface AvailableAction {
  action: DuelAction;
  labelKey: string; // i18n key für UI-Label
  disabled?: boolean;
  reason?: string; // warum disabled
}

/**
 * Deck mit Karten für Duell-Erstellung
 */
export interface DuelDeck {
  id: string;
  name: string;
  cards: Card[]; // alle Karten des Decks
}
