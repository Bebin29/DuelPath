/**
 * Integration-Tests für Duel-Flow
 */

import { describe, it, expect } from "vitest";
import { createInitialDuelState, applyAction } from "@/lib/utils/duel.utils";
import type { DuelAction, DuelDeck } from "@/types/duel.types";
import type { Card } from "@prisma/client";

describe("Duel Flow Integration", () => {
  let mockDeck: DuelDeck;

  beforeEach(() => {
    const mockCards: Card[] = [
      {
        id: "monster-1",
        name: "Blue-Eyes White Dragon",
        type: "Normal Monster",
        race: "Dragon",
        attribute: "LIGHT",
        level: 8,
        atk: 3000,
        def: 2500,
        desc: "A powerful dragon",
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
        id: "monster-2",
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
      // Füge mehr Karten für ein vollständiges Deck hinzu
      ...Array.from({ length: 38 }, (_, i) => ({
        id: `card-${i + 3}`,
        name: `Card ${i + 3}`,
        type: i % 2 === 0 ? "Normal Monster" : "Spell Card",
        race: i % 2 === 0 ? "Warrior" : undefined,
        attribute: i % 2 === 0 ? "LIGHT" : undefined,
        level: i % 2 === 0 ? 4 : undefined,
        atk: i % 2 === 0 ? 1500 : undefined,
        def: i % 2 === 0 ? 1000 : undefined,
        desc: `Description ${i + 3}`,
        archetype: null,
        banlistInfo: null,
        imageUrl: null,
        imageSmall: null,
        passcode: `${10000000 + i}`,
        nameLower: `card ${i + 3}`,
        typeLower: i % 2 === 0 ? "normal monster" : "spell card",
        raceLower: i % 2 === 0 ? "warrior" : undefined,
        archetypeLower: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    ];

    mockDeck = {
      id: "test-deck",
      name: "Test Deck",
      cards: mockCards,
    };
  });

  it("should complete a full turn sequence", () => {
    // 1. Starte Duell
    let state = createInitialDuelState(mockDeck);
    expect(state.phase).toBe("DRAW");
    expect(state.turnCount).toBe(1);
    expect(state.player.hand).toHaveLength(5);

    // 2. Draw Phase - automatische Karte ziehen
    const drawAction: DuelAction = { type: "DRAW", player: "PLAYER", count: 1 };
    state = applyAction(state, drawAction);
    expect(state.player.hand).toHaveLength(6);

    // 3. Wechsle zu Standby Phase
    state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "STANDBY" });
    expect(state.phase).toBe("STANDBY");

    // 4. Wechsle zu Main Phase 1
    state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "MAIN1" });
    expect(state.phase).toBe("MAIN1");

    // 5. Normal Summon eine Karte
    const handCard = state.player.hand[0];
    const summonAction: DuelAction = {
      type: "NORMAL_SUMMON",
      player: "PLAYER",
      cardInstanceId: handCard.instanceId,
      targetZoneIndex: 0,
    };
    state = applyAction(state, summonAction);
    expect(state.player.hand).toHaveLength(5);
    expect(state.player.monsterZone[0]).toBeDefined();
    expect(state.normalSummonUsedThisTurn).toBe(true);

    // 6. Wechsle zu Battle Phase
    state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "BATTLE" });
    expect(state.phase).toBe("BATTLE");

    // 7. Attack direkt auf LP
    const attackAction: DuelAction = {
      type: "ATTACK",
      player: "PLAYER",
      attackerId: handCard.instanceId,
      target: "LP",
    };
    state = applyAction(state, attackAction);
    expect(state.opponent.lp).toBeLessThan(8000);
    expect(state.player.monsterZone[0]?.hasAttackedThisTurn).toBe(true);

    // 8. Wechsle zu Main Phase 2
    state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "MAIN2" });
    expect(state.phase).toBe("MAIN2");

    // 9. Wechsle zu End Phase
    state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "END" });
    expect(state.phase).toBe("END");

    // 10. Beende den Zug (automatisch zu DRAW)
    state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "DRAW" });
    expect(state.phase).toBe("DRAW");
    expect(state.turnCount).toBe(2);
    expect(state.normalSummonUsedThisTurn).toBe(false); // Reset
  });

  it("should handle deck out condition", () => {
    // Erstelle ein kleines Deck mit wenigen Karten
    const smallDeck: DuelDeck = {
      id: "small-deck",
      name: "Small Deck",
      cards: mockDeck.cards.slice(0, 10),
    };

    let state = createInitialDuelState(smallDeck);

    // Ziehe alle Karten vom Deck
    for (let i = 0; i < 10; i++) {
      state = applyAction(state, { type: "DRAW", player: "PLAYER", count: 1 });
    }

    // Versuche weitere Karten zu ziehen - sollte keine Wirkung haben
    state = applyAction(state, { type: "DRAW", player: "PLAYER", count: 1 });
    expect(state.player.deck).toHaveLength(0);
  });

  it("should maintain game state consistency", () => {
    let state = createInitialDuelState(mockDeck);
    const initialCardCount = mockDeck.cards.length;

    // Führe mehrere Aktionen aus
    state = applyAction(state, { type: "DRAW", player: "PLAYER", count: 1 });
    state = applyAction(state, { type: "CHANGE_PHASE", nextPhase: "MAIN1" });

    // Summone eine Karte
    const handCard = state.player.hand[0];
    state = applyAction(state, {
      type: "NORMAL_SUMMON",
      player: "PLAYER",
      cardInstanceId: handCard.instanceId,
      targetZoneIndex: 0,
    });

    // Prüfe Konsistenz: Alle Karten sollten noch vorhanden sein
    const totalCards =
      state.player.hand.length +
      state.player.deck.length +
      state.player.monsterZone.filter(c => c !== null).length +
      state.player.spellTrapZone.filter(c => c !== null).length +
      state.player.graveyard.length;

    expect(totalCards).toBe(initialCardCount);
  });
});
