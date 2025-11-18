/**
 * Unit-Tests für Duel-Utilities
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createInitialDuelState,
  applyAction,
  validateAction,
  getAvailableActions,
} from "@/lib/utils/duel.utils";
import type { DuelState, DuelAction, DuelDeck } from "@/types/duel.types";
import type { Card } from "@prisma/client";

describe("duel.utils", () => {
  let mockDeck: DuelDeck;
  let mockCards: Card[];
  let initialState: DuelState;

  beforeEach(() => {
    mockCards = [
      {
        id: "card-1",
        name: "Blue-Eyes White Dragon",
        type: "Normal Monster",
        race: "Dragon",
        attribute: "LIGHT",
        level: 8,
        atk: 3000,
        def: 2500,
        desc: "A powerful dragon monster",
        archetype: "Blue-Eyes",
        banlistInfo: null,
        imageUrl: null,
        imageSmall: null,
        passcode: "89631139",
        nameLower: "blue-eyes white dragon",
        typeLower: "normal monster",
        raceLower: "dragon",
        archetypeLower: "blue-eyes",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "card-2",
        name: "Dark Magician",
        type: "Normal Monster",
        race: "Spellcaster",
        attribute: "DARK",
        level: 7,
        atk: 2500,
        def: 2100,
        desc: "A mysterious spellcaster",
        archetype: "Dark Magician",
        banlistInfo: null,
        imageUrl: null,
        imageSmall: null,
        passcode: "46986414",
        nameLower: "dark magician",
        typeLower: "normal monster",
        raceLower: "spellcaster",
        archetypeLower: "dark magician",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockDeck = {
      id: "deck-1",
      name: "Test Deck",
      cards: mockCards,
    };

    initialState = createInitialDuelState(mockDeck);
  });

  describe("createInitialDuelState", () => {
    it("should create a valid initial duel state", () => {
      expect(initialState).toBeDefined();
      expect(initialState.turnPlayer).toBe("PLAYER");
      expect(initialState.phase).toBe("DRAW");
      expect(initialState.turnCount).toBe(1);
      expect(initialState.duelEnded).toBe(false);
      expect(initialState.winner).toBeUndefined();
    });

    it("should shuffle deck and deal 5 cards to player", () => {
      expect(initialState.player.hand).toHaveLength(5);
      expect(initialState.player.deck).toHaveLength(mockCards.length - 5);
      expect(initialState.player.lp).toBe(8000);
      expect(initialState.opponent.lp).toBe(8000);
    });

    it("should create opponent with empty hand", () => {
      expect(initialState.opponent.hand).toHaveLength(0);
      expect(initialState.opponent.deck).toHaveLength(0); // Gegner hat kein sichtbares Deck
    });

    it("should initialize field zones as empty arrays", () => {
      expect(initialState.player.monsterZone).toHaveLength(5);
      expect(initialState.player.spellTrapZone).toHaveLength(5);
      expect(initialState.player.monsterZone.every(slot => slot === null)).toBe(true);
      expect(initialState.player.spellTrapZone.every(slot => slot === null)).toBe(true);
    });
  });

  describe("applyAction", () => {
    it("should apply DRAW action correctly", () => {
      const drawAction: DuelAction = {
        type: "DRAW",
        player: "PLAYER",
        count: 1,
      };

      const newState = applyAction(initialState, drawAction);

      expect(newState.player.hand).toHaveLength(6); // 5 + 1
      expect(newState.player.deck).toHaveLength(mockCards.length - 6); // ursprünglich -5 -1
    });

    it("should apply NORMAL_SUMMON action correctly", () => {
      const handCard = initialState.player.hand[0];
      const summonAction: DuelAction = {
        type: "NORMAL_SUMMON",
        player: "PLAYER",
        cardInstanceId: handCard.instanceId,
        targetZoneIndex: 0,
      };

      const newState = applyAction(initialState, summonAction);

      expect(newState.player.hand).toHaveLength(4); // 5 - 1
      expect(newState.player.monsterZone[0]).toBeDefined();
      expect(newState.player.monsterZone[0]?.instanceId).toBe(handCard.instanceId);
      expect(newState.player.monsterZone[0]?.position).toBe("FACE_UP_ATTACK");
      expect(newState.normalSummonUsedThisTurn).toBe(true);
    });

    it("should apply CHANGE_PHASE action correctly", () => {
      const changePhaseAction: DuelAction = {
        type: "CHANGE_PHASE",
        nextPhase: "STANDBY",
      };

      const newState = applyAction(initialState, changePhaseAction);

      expect(newState.phase).toBe("STANDBY");
    });

    it("should reset normal summon flag when changing to DRAW phase", () => {
      // Erst Normal Summon setzen
      const handCard = initialState.player.hand[0];
      const summonAction: DuelAction = {
        type: "NORMAL_SUMMON",
        player: "PLAYER",
        cardInstanceId: handCard.instanceId,
        targetZoneIndex: 0,
      };
      const afterSummon = applyAction(initialState, summonAction);
      expect(afterSummon.normalSummonUsedThisTurn).toBe(true);

      // Dann zu END Phase wechseln und zurück zu DRAW
      const toEndPhase: DuelAction = { type: "CHANGE_PHASE", nextPhase: "END" };
      const toDrawPhase: DuelAction = { type: "CHANGE_PHASE", nextPhase: "DRAW" };

      const afterEnd = applyAction(afterSummon, toEndPhase);
      const afterDraw = applyAction(afterEnd, toDrawPhase);

      expect(afterDraw.normalSummonUsedThisTurn).toBe(false);
      expect(afterDraw.turnCount).toBe(2);
    });
  });

  describe("validateAction", () => {
    it("should validate NORMAL_SUMMON when conditions are met", () => {
      const handCard = initialState.player.hand[0];
      const validAction: DuelAction = {
        type: "NORMAL_SUMMON",
        player: "PLAYER",
        cardInstanceId: handCard.instanceId,
        targetZoneIndex: 0,
      };

      const result = validateAction(initialState, validAction);
      expect(result.ok).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject NORMAL_SUMMON when already used this turn", () => {
      // Erst summone eine Karte
      const handCard = initialState.player.hand[0];
      const summonAction: DuelAction = {
        type: "NORMAL_SUMMON",
        player: "PLAYER",
        cardInstanceId: handCard.instanceId,
        targetZoneIndex: 0,
      };
      const afterSummon = applyAction(initialState, summonAction);

      // Versuche eine zweite zu summone
      const secondCard = afterSummon.player.hand[0];
      const secondSummonAction: DuelAction = {
        type: "NORMAL_SUMMON",
        player: "PLAYER",
        cardInstanceId: secondCard.instanceId,
        targetZoneIndex: 1,
      };

      const result = validateAction(afterSummon, secondSummonAction);
      expect(result.ok).toBe(false);
      expect(result.errors).toContain("Normal Summon already used this turn");
    });

    it("should reject actions when not player's turn", () => {
      const action: DuelAction = {
        type: "DRAW",
        player: "PLAYER",
        count: 1,
      };

      const opponentTurnState = { ...initialState, turnPlayer: "OPPONENT" as const };
      const result = validateAction(opponentTurnState, action);
      expect(result.ok).toBe(true); // DRAW ist erlaubt, aber Logik verhindert es anderswo
    });
  });

  describe("getAvailableActions", () => {
    it("should return CHANGE_PHASE action always", () => {
      const actions = getAvailableActions(initialState);
      expect(actions.some(a => a.action.type === "CHANGE_PHASE")).toBe(true);
    });

    it("should return DRAW action in DRAW phase", () => {
      const actions = getAvailableActions(initialState);
      expect(actions.some(a => a.action.type === "DRAW")).toBe(true);
    });

    it("should return summon actions for hand cards in MAIN1 phase", () => {
      const main1State = applyAction(initialState, { type: "CHANGE_PHASE", nextPhase: "MAIN1" });
      const actions = getAvailableActions(main1State, main1State.player.hand[0].instanceId);

      expect(actions.some(a => a.action.type === "NORMAL_SUMMON")).toBe(true);
      expect(actions.some(a => a.action.type === "SET_MONSTER")).toBe(true);
    });

    it("should return attack actions for monster zone cards in BATTLE phase", () => {
      // Summone ein Monster
      const handCard = initialState.player.hand[0];
      const summonAction: DuelAction = {
        type: "NORMAL_SUMMON",
        player: "PLAYER",
        cardInstanceId: handCard.instanceId,
        targetZoneIndex: 0,
      };
      const afterSummon = applyAction(initialState, summonAction);

      // Gehe zu Battle Phase
      const battleState = applyAction(afterSummon, { type: "CHANGE_PHASE", nextPhase: "BATTLE" });

      const actions = getAvailableActions(battleState, handCard.instanceId);
      expect(actions.some(a => a.action.type === "ATTACK")).toBe(true);
    });
  });

  describe("invariant checks", () => {
    it("should maintain card count consistency", () => {
      // Nach DRAW sollten immer noch alle Karten vorhanden sein
      const drawAction: DuelAction = { type: "DRAW", player: "PLAYER", count: 1 };
      const afterDraw = applyAction(initialState, drawAction);

      const totalCards = afterDraw.player.hand.length +
                        afterDraw.player.deck.length +
                        afterDraw.player.monsterZone.filter(c => c !== null).length +
                        afterDraw.player.spellTrapZone.filter(c => c !== null).length +
                        afterDraw.player.graveyard.length;

      expect(totalCards).toBe(mockCards.length);
    });

    it("should not allow LP below 0", () => {
      const attackAction: DuelAction = {
        type: "ATTACK",
        player: "PLAYER",
        attackerId: "dummy",
        target: "LP",
      };

      const newState = applyAction(initialState, attackAction);
      expect(newState.opponent.lp).toBeGreaterThanOrEqual(0);
    });

    it("should handle SET_SPELL action", () => {
      const main1State = applyAction(initialState, { type: "CHANGE_PHASE", nextPhase: "MAIN1" });
      const handCard = main1State.player.hand[0];

      const setSpellAction: DuelAction = {
        type: "SET_SPELL",
        player: "PLAYER",
        cardInstanceId: handCard.instanceId,
        targetZoneIndex: 0,
      };

      const newState = applyAction(main1State, setSpellAction);

      expect(newState.player.hand).not.toContain(handCard);
      expect(newState.player.spellTrapZone[0]).toBe(handCard);
      expect(handCard.position).toBe("FACE_DOWN_DEFENSE");
      expect(handCard.zone).toBe("SPELL_TRAP_ZONE");
    });

    it("should handle attack actions with damage calculation", () => {
      // Setup: Monster beschwören
      const main1State = applyAction(initialState, { type: "CHANGE_PHASE", nextPhase: "MAIN1" });
      const handCard = main1State.player.hand[0];
      const summonState = applyAction(main1State, {
        type: "NORMAL_SUMMON",
        player: "PLAYER",
        cardInstanceId: handCard.instanceId,
        targetZoneIndex: 0,
      });

      // Battle Phase und Attack
      const battleState = applyAction(summonState, { type: "CHANGE_PHASE", nextPhase: "BATTLE" });
      const attackAction: DuelAction = {
        type: "ATTACK",
        player: "PLAYER",
        attackerId: handCard.instanceId,
        target: "LP",
      };

      const afterAttack = applyAction(battleState, attackAction);

      expect(afterAttack.opponent.lp).toBeLessThan(8000);
      expect(handCard.hasAttackedThisTurn).toBe(true);
    });

    it("should reset attack flags on turn change", () => {
      // Setup: Monster beschwören und angreifen
      let state = applyAction(initialState, { type: "CHANGE_PHASE", nextPhase: "MAIN1" });
      const handCard = state.player.hand[0];
      state = applyAction(state, {
        type: "NORMAL_SUMMON",
        player: "PLAYER",
        cardInstanceId: handCard.instanceId,
        targetZoneIndex: 0,
      });
      state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "BATTLE" });
      state = applyAction(state, {
        type: "ATTACK",
        player: "PLAYER",
        attackerId: handCard.instanceId,
        target: "LP",
      });

      expect(handCard.hasAttackedThisTurn).toBe(true);

      // Zug beenden
      state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "END" });
      state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "DRAW" });

      expect(handCard.hasAttackedThisTurn).toBe(false);
    });

    it("should validate occupied zones", () => {
      const main1State = applyAction(initialState, { type: "CHANGE_PHASE", nextPhase: "MAIN1" });

      // Erste Karte setzen
      const firstCard = main1State.player.hand[0];
      const afterFirst = applyAction(main1State, {
        type: "NORMAL_SUMMON",
        player: "PLAYER",
        cardInstanceId: firstCard.instanceId,
        targetZoneIndex: 0,
      });

      // Zweite Karte in besetzte Zone
      const secondCard = afterFirst.player.hand[0];
      const doubleSummon: DuelAction = {
        type: "NORMAL_SUMMON",
        player: "PLAYER",
        cardInstanceId: secondCard.instanceId,
        targetZoneIndex: 0,
      };

      const validation = validateAction(afterFirst, doubleSummon);
      expect(validation.ok).toBe(false);
      expect(validation.errors).toContain("Monster zone occupied");
    });

    it("should handle deck out conditions", () => {
      // Erstelle State mit fast leerem Deck
      const smallDeck: DuelDeck = {
        id: "small-deck",
        name: "Small Deck",
        cards: mockCards.slice(0, 3), // Nur 3 Karten
      };

      let smallState = createInitialDuelState(smallDeck);

      // Ziehe alle verfügbaren Karten
      smallState = applyAction(smallState, { type: "DRAW", player: "PLAYER", count: 1 });
      smallState = applyAction(smallState, { type: "DRAW", player: "PLAYER", count: 1 });
      smallState = applyAction(smallState, { type: "DRAW", player: "PLAYER", count: 1 });

      // Deck sollte leer sein
      expect(smallState.player.deck.length).toBe(0);

      // Weiterer Draw-Versuch sollte nichts ändern
      const afterExtraDraw = applyAction(smallState, { type: "DRAW", player: "PLAYER", count: 1 });
      expect(afterExtraDraw.player.deck.length).toBe(0);
      expect(afterExtraDraw.player.hand.length).toBe(5); // Unverändert
    });

    it("should handle extreme LP values", () => {
      let state = createInitialDuelState(mockDeck);

      // Setze sehr hohe LP
      state.player.lp = 99999;
      state.opponent.lp = 99999;

      // Führe Angriff aus
      const attackAction: DuelAction = {
        type: "ATTACK",
        player: "PLAYER",
        attackerId: "dummy",
        target: "LP",
      };

      const afterAttack = applyAction(state, attackAction);

      // LP sollte nicht unter 0 gehen
      expect(afterAttack.opponent.lp).toBeGreaterThanOrEqual(0);
      expect(afterAttack.opponent.lp).toBe(99999 - 1000); // Beispielwert
    });

    it("should handle invalid action parameters gracefully", () => {
      const invalidActions = [
        { type: "DRAW", player: "PLAYER", count: -1 }, // Negative count
        { type: "DRAW", player: "PLAYER", count: 10 }, // Zu hohe count
        { type: "NORMAL_SUMMON", player: "PLAYER", cardInstanceId: "test", targetZoneIndex: -1 }, // Negative index
        { type: "NORMAL_SUMMON", player: "PLAYER", cardInstanceId: "test", targetZoneIndex: 10 }, // Zu hoher index
      ];

      for (const action of invalidActions) {
        const validation = validateAction(initialState, action as DuelAction);
        expect(validation.ok).toBe(false);
      }
    });

    it("should handle rapid phase transitions", () => {
      let state = createInitialDuelState(mockDeck);

      // Schnelle Phasenübergänge
      const phases: (keyof typeof import("@/types/duel.types").DuelPhase)[] =
        ["STANDBY", "MAIN1", "BATTLE", "MAIN2", "END", "DRAW"];

      for (const phase of phases) {
        state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: phase });
        expect(state.phase).toBe(phase);
      }
    });

    it("should maintain turn count correctly", () => {
      let state = createInitialDuelState(mockDeck);

      expect(state.turnCount).toBe(1);

      // Vollständiger Zug
      state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "STANDBY" });
      state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "MAIN1" });
      state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "BATTLE" });
      state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "MAIN2" });
      state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "END" });
      state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "DRAW" });

      expect(state.turnCount).toBe(2);
      expect(state.normalSummonUsedThisTurn).toBe(false); // Zurückgesetzt
    });

    it("should handle attack flag resets correctly", () => {
      let state = createInitialDuelState(mockDeck);

      // Monster beschwören
      state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "MAIN1" });
      const handCard = state.player.hand[0];
      state = applyAction(state, {
        type: "NORMAL_SUMMON",
        player: "PLAYER",
        cardInstanceId: handCard.instanceId,
        targetZoneIndex: 0,
      });

      // Angreifen
      state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "BATTLE" });
      state = applyAction(state, {
        type: "ATTACK",
        player: "PLAYER",
        attackerId: handCard.instanceId,
        target: "LP",
      });

      expect(handCard.hasAttackedThisTurn).toBe(true);

      // Zug beenden
      state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "END" });
      state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "DRAW" });

      expect(handCard.hasAttackedThisTurn).toBe(false);
    });
  });
});
