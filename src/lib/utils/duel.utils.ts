import { nanoid } from "nanoid";
import type {
  DuelState,
  DuelAction,
  DuelCardInstance,
  DuelPlayerState,
  DuelValidationResult,
  AvailableAction,
  PlayerId,
  DuelDeck,
  CardPosition,
  DuelZone,
} from "@/types/duel.types";

// Temporär: DuelPhase direkt definieren, um Import-Probleme zu vermeiden
enum DuelPhase {
  DRAW = "DRAW",
  STANDBY = "STANDBY",
  MAIN1 = "MAIN1",
  BATTLE = "BATTLE",
  MAIN2 = "MAIN2",
  END = "END",
}
import { validateDuelAction, DUEL_VALIDATION_RULES } from "@/lib/validations/duel.schema";

/**
 * Erstellt einen initialen Duellzustand aus einem Deck
 */
export function createInitialDuelState(deck: DuelDeck): DuelState | null {
  try {
    // Stelle sicher, dass das Deck gültig ist
    if (!deck || !deck.cards || deck.cards.length === 0) {
      console.error("Invalid deck provided to createInitialDuelState:", deck);
      return null;
    }

    // Erstelle Karteninstanzen für alle Karten im Deck
    const deckInstances = shuffleArray(
      deck.cards.map(card => {
        if (!card || !card.id) {
          throw new Error(`Invalid card in deck: ${JSON.stringify(card)}`);
        }
        return createCardInstance(card.id, "PLAYER", "DECK");
      })
    );

  // Ziehe 5 Starthand-Karten
  const initialHand = deckInstances.splice(0, 5);

  const playerState: DuelPlayerState = {
    lp: 8000,
    hand: initialHand,
    monsterZone: Array(5).fill(null),
    spellTrapZone: Array(5).fill(null),
    graveyard: [],
    deck: deckInstances,
    extraDeck: [], // Für später: Extra Deck auslesen
  };

  // Einfacher Gegnerzustand (passiv)
  const opponentState: DuelPlayerState = {
    lp: 8000,
    hand: [], // Gegner hat keine Karten sichtbar
    monsterZone: Array(5).fill(null),
    spellTrapZone: Array(5).fill(null),
    graveyard: [],
    deck: [], // Gegner-Deck nicht sichtbar
    extraDeck: [],
  };

    return {
      turnPlayer: "PLAYER",
      phase: DuelPhase.DRAW,
      turnCount: 1,
      player: playerState,
      opponent: opponentState,
      normalSummonUsedThisTurn: false,
      duelEnded: false,
      initialDeckOrder: deck.cards.map(card => card.id), // für Reproduzierbarkeit
    };
  } catch (error) {
    console.error("Failed to create initial duel state:", error);
    return null;
  }
}

/**
 * Erstellt eine Karteninstanz
 */
function createCardInstance(cardId: string, owner: PlayerId, zone: DuelZone): DuelCardInstance {
  return {
    instanceId: nanoid(),
    cardId,
    position: zone === "HAND" ? "FACE_UP_ATTACK" : "FACE_DOWN_DEFENSE",
    zone,
    owner,
  };
}

/**
 * Mischt ein Array (Fisher-Yates Shuffle)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Wendet eine Aktion auf den Duellzustand an (pure Funktion)
 */
export function applyAction(state: DuelState, action: DuelAction): DuelState {
  const newState = structuredClone(state);

  switch (action.type) {
    case "DRAW": {
      const playerState = newState[action.player];
      if (playerState.deck.length === 0) return newState; // Kann nicht ziehen

      const cardsToDraw = Math.min(action.count, playerState.deck.length);
      const drawnCards = playerState.deck.splice(0, cardsToDraw);

      // Gezogene Karten zur Hand hinzufügen
      drawnCards.forEach(card => {
        card.zone = "HAND";
        card.position = "FACE_UP_ATTACK";
      });

      playerState.hand.push(...drawnCards);
      break;
    }

    case "NORMAL_SUMMON": {
      const playerState = newState[action.player];
      const cardIndex = playerState.hand.findIndex(card => card.instanceId === action.cardInstanceId);
      if (cardIndex === -1) return newState; // Karte nicht in Hand

      const card = playerState.hand.splice(cardIndex, 1)[0];
      card.zone = "MONSTER_ZONE";
      card.position = "FACE_UP_ATTACK";

      playerState.monsterZone[action.targetZoneIndex] = card;
      playerState.normalSummonUsedThisTurn = true;
      break;
    }

    case "SET_MONSTER": {
      const playerState = newState[action.player];
      const cardIndex = playerState.hand.findIndex(card => card.instanceId === action.cardInstanceId);
      if (cardIndex === -1) return newState;

      const card = playerState.hand.splice(cardIndex, 1)[0];
      card.zone = "MONSTER_ZONE";
      card.position = "FACE_DOWN_DEFENSE";

      playerState.monsterZone[action.targetZoneIndex] = card;
      break;
    }

    case "ATTACK": {
      const playerState = newState[action.player];
      const attacker = findCardInZone(playerState, action.attackerId, "MONSTER_ZONE");
      if (!attacker || attacker.position.includes("FACE_DOWN")) return newState;

      if (action.target === "LP" || !action.target) {
        // Direkter Angriff auf LP
        const opponent = action.player === "PLAYER" ? newState.opponent : newState.player;
        // Vereinfacht: direkter Angriff auf LP (würde eigentlich ATK verwenden)
        opponent.lp = Math.max(0, opponent.lp - 1000); // Beispielwert
      } else {
        // Angriff auf Monster (vereinfacht)
        const opponent = action.player === "PLAYER" ? newState.opponent : newState.player;
        const target = findCardInZone(opponent, action.target.cardInstanceId, "MONSTER_ZONE");
        if (target) {
          // Vereinfachter Kampfausgang
          opponent.lp = Math.max(0, opponent.lp - 500);
        }
      }

      attacker.hasAttackedThisTurn = true;
      break;
    }

    case "CHANGE_PHASE": {
      newState.phase = action.nextPhase;

      // Reset bei Phasenwechsel
      if (action.nextPhase === DuelPhase.DRAW) {
        newState.normalSummonUsedThisTurn = false;
        newState.turnCount += 1;
        // Reset attack flags für alle Monster
        resetAttackFlags(newState.player);
        resetAttackFlags(newState.opponent);
      }

      // Auto-Draw in Draw Phase für Spieler
      if (action.nextPhase === DuelPhase.DRAW && newState.turnPlayer === "PLAYER") {
        return applyAction(newState, { type: "DRAW", player: "PLAYER", count: 1 });
      }

      break;
    }

    case "END_DUEL": {
      newState.duelEnded = true;
      newState.winner = action.winner;
      break;
    }

    default:
      // Unbehandelte Aktionen ignorieren
      break;
  }

  return newState;
}

/**
 * Hilfsfunktion: Findet Karte in einer Zone
 */
function findCardInZone(playerState: DuelPlayerState, instanceId: string, zone: DuelZone): DuelCardInstance | null {
  switch (zone) {
    case "HAND":
      return playerState.hand.find(card => card.instanceId === instanceId) || null;
    case "MONSTER_ZONE":
      return playerState.monsterZone.find(card => card?.instanceId === instanceId) || null;
    case "SPELL_TRAP_ZONE":
      return playerState.spellTrapZone.find(card => card?.instanceId === instanceId) || null;
    case "GRAVEYARD":
      return playerState.graveyard.find(card => card.instanceId === instanceId) || null;
    default:
      return null;
  }
}

/**
 * Hilfsfunktion: Reset attack flags für alle Monster eines Spielers
 */
function resetAttackFlags(playerState: DuelPlayerState): void {
  playerState.monsterZone.forEach(card => {
    if (card) {
      card.hasAttackedThisTurn = false;
    }
  });
}

/**
 * Validiert eine Aktion gegen den aktuellen Zustand
 */
export function validateAction(state: DuelState, action: DuelAction): DuelValidationResult {
  // Erst Form-Validierung
  const formValidation = validateDuelAction(action);
  if (!formValidation.ok) {
    return formValidation;
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  const playerState = state[action.player];

  switch (action.type) {
    case "DRAW": {
      if (playerState.deck.length === 0) {
        errors.push("No cards left in deck");
      }
      break;
    }

    case "NORMAL_SUMMON": {
      if (state.normalSummonUsedThisTurn && state.turnPlayer === action.player) {
        errors.push("Normal Summon already used this turn");
      }

      const cardInHand = playerState.hand.find(card => card.instanceId === action.cardInstanceId);
      if (!cardInHand) {
        errors.push("Card not in hand");
      }

      if (playerState.monsterZone[action.targetZoneIndex] !== null) {
        errors.push("Monster zone occupied");
      }

      break;
    }

    case "SET_MONSTER": {
      const cardInHand = playerState.hand.find(card => card.instanceId === action.cardInstanceId);
      if (!cardInHand) {
        errors.push("Card not in hand");
      }

      if (playerState.monsterZone[action.targetZoneIndex] !== null) {
        errors.push("Monster zone occupied");
      }

      break;
    }

    case "ATTACK": {
      if (state.phase !== DuelPhase.BATTLE) {
        errors.push("Can only attack in Battle Phase");
      }

      const attacker = findCardInZone(playerState, action.attackerId, "MONSTER_ZONE");
      if (!attacker) {
        errors.push("Attacker not found");
      } else if (attacker.hasAttackedThisTurn) {
        errors.push("Monster already attacked this turn");
      }

      break;
    }

    case "CHANGE_PHASE": {
      // Vereinfachte Phasenübergänge
      const currentPhase = state.phase;
      const nextPhase = action.nextPhase;

      const phaseOrder = [DuelPhase.DRAW, DuelPhase.STANDBY, DuelPhase.MAIN1, DuelPhase.BATTLE, DuelPhase.MAIN2, DuelPhase.END];
      const currentIndex = phaseOrder.indexOf(currentPhase);
      const nextIndex = phaseOrder.indexOf(nextPhase);

      if (nextIndex !== (currentIndex + 1) % phaseOrder.length && nextPhase !== DuelPhase.DRAW) {
        warnings.push("Unusual phase transition");
      }

      break;
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Gibt verfügbare Aktionen für einen Spieler/Kontext zurück
 */
export function getAvailableActions(state: DuelState, cardInstanceId?: string): AvailableAction[] {
  const actions: AvailableAction[] = [];

  if (state.duelEnded) return actions;

  const player = state.turnPlayer;
  const playerState = state[player];
  const isPlayerTurn = state.turnPlayer === "PLAYER";

  // Phase-Wechsel immer verfügbar
  const phaseOrder = [DuelPhase.DRAW, DuelPhase.STANDBY, DuelPhase.MAIN1, DuelPhase.BATTLE, DuelPhase.MAIN2, DuelPhase.END];
  const currentIndex = phaseOrder.indexOf(state.phase);
  const nextPhase = phaseOrder[(currentIndex + 1) % phaseOrder.length];

  actions.push({
    action: { type: "CHANGE_PHASE", nextPhase },
    labelKey: `duel.action.changePhase.${nextPhase}`,
  });

  if (!isPlayerTurn) return actions; // Nur Spieler kann Aktionen ausführen

  // Spezifische Karte
  if (cardInstanceId) {
    const card = findCardInZone(playerState, cardInstanceId, "HAND");
    if (card) {
      // Normal Summon
      if (!state.normalSummonUsedThisTurn && state.phase === DuelPhase.MAIN1) {
        for (let i = 0; i < 5; i++) {
          if (playerState.monsterZone[i] === null) {
            actions.push({
              action: { type: "NORMAL_SUMMON", player, cardInstanceId, targetZoneIndex: i },
              labelKey: "duel.action.normalSummon",
            });
            break; // Nur ein verfügbarer Slot zeigen
          }
        }
      }

      // Set Monster
      if (state.phase === DuelPhase.MAIN1) {
        for (let i = 0; i < 5; i++) {
          if (playerState.monsterZone[i] === null) {
            actions.push({
              action: { type: "SET_MONSTER", player, cardInstanceId, targetZoneIndex: i },
              labelKey: "duel.action.setMonster",
            });
            break;
          }
        }
      }
    }

    // Attack (für Monster-Zone-Karten)
    const monster = findCardInZone(playerState, cardInstanceId, "MONSTER_ZONE");
    if (monster && state.phase === DuelPhase.BATTLE && !monster.hasAttackedThisTurn) {
      actions.push({
        action: { type: "ATTACK", player, attackerId: cardInstanceId, target: "LP" },
        labelKey: "duel.action.attackLp",
      });
    }

    return actions;
  }

  // Allgemeine Aktionen
  // Draw in Draw Phase (automatisch, aber als Fallback)
  if (state.phase === DuelPhase.DRAW && playerState.deck.length > 0) {
    actions.push({
      action: { type: "DRAW", player, count: 1 },
      labelKey: "duel.action.draw",
    });
  }

  return actions;
}

/**
 * Berechnet Kampfschaden (vereinfacht)
 */
export function calculateDamage(attacker: DuelCardInstance, defender: DuelCardInstance | null, target: "LP" | DuelCardInstance): number {
  // Vereinfacht: immer 1000 Schaden
  // In Realität würde ATK/DEF der Karten verwendet
  return 1000;
}

/**
 * Prüft Siegbedingungen
 */
export function checkWinCondition(state: DuelState): PlayerId | null {
  if (state.player.lp <= 0) return "OPPONENT";
  if (state.opponent.lp <= 0) return "PLAYER";
  return null;
}
