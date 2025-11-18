import { describe, it, expect, beforeEach } from "vitest";
import { duelLogger } from "@/lib/utils/duel.logger";
import type { DuelState, DuelAction } from "@/types/duel.types";

describe("DuelLogger", () => {
  beforeEach(() => {
    duelLogger.clearLogs();
  });

  const mockState: DuelState = {
    turnPlayer: "PLAYER",
    phase: "MAIN1",
    turnCount: 1,
    player: {
      lp: 8000,
      hand: [],
      monsterZone: Array(5).fill(null),
      spellTrapZone: Array(5).fill(null),
      graveyard: [],
      deck: [],
      extraDeck: [],
    },
    opponent: {
      lp: 8000,
      hand: [],
      monsterZone: Array(5).fill(null),
      spellTrapZone: Array(5).fill(null),
      graveyard: [],
      deck: [],
      extraDeck: [],
    },
    normalSummonUsedThisTurn: false,
    duelEnded: false,
  };

  it("should add log entries", () => {
    const action: DuelAction = {
      type: "DRAW",
      player: "PLAYER",
      count: 1,
    };

    duelLogger.addLogEntry(mockState, action);

    const logs = duelLogger.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].action).toEqual(action);
    expect(logs[0].turn).toBe(1);
    expect(logs[0].phase).toBe("MAIN1");
    expect(logs[0].player).toBe("PLAYER");
    expect(logs[0].timestamp).toBeDefined();
  });

  it("should limit logs to maximum size", () => {
    const maxLogs = 1000;
    const action: DuelAction = {
      type: "DRAW",
      player: "PLAYER",
      count: 1,
    };

    // Add more logs than the limit
    for (let i = 0; i < maxLogs + 50; i++) {
      duelLogger.addLogEntry({
        ...mockState,
        turnCount: i + 1,
      }, action);
    }

    const logs = duelLogger.getLogs();
    expect(logs.length).toBeLessThanOrEqual(maxLogs);
  });

  it("should filter logs by turn", () => {
    duelLogger.addLogEntry({ ...mockState, turnCount: 1 }, {
      type: "DRAW",
      player: "PLAYER",
      count: 1,
    });
    duelLogger.addLogEntry({ ...mockState, turnCount: 2 }, {
      type: "NORMAL_SUMMON",
      player: "PLAYER",
      cardInstanceId: "card-1",
      targetZoneIndex: 0,
    });

    const filtered = duelLogger.filterLogs({ turn: 1 });
    expect(filtered.length).toBe(1);
    expect(filtered[0].turn).toBe(1);
  });

  it("should filter logs by phase", () => {
    duelLogger.addLogEntry({ ...mockState, phase: "DRAW" }, {
      type: "DRAW",
      player: "PLAYER",
      count: 1,
    });
    duelLogger.addLogEntry({ ...mockState, phase: "MAIN1" }, {
      type: "NORMAL_SUMMON",
      player: "PLAYER",
      cardInstanceId: "card-1",
      targetZoneIndex: 0,
    });

    const filtered = duelLogger.filterLogs({ phase: "DRAW" });
    expect(filtered.length).toBe(1);
    expect(filtered[0].phase).toBe("DRAW");
  });

  it("should filter logs by player", () => {
    duelLogger.addLogEntry(mockState, {
      type: "DRAW",
      player: "PLAYER",
      count: 1,
    });
    duelLogger.addLogEntry(mockState, {
      type: "DRAW",
      player: "OPPONENT",
      count: 1,
    });

    const playerLogs = duelLogger.filterLogs({ player: "PLAYER" });
    const opponentLogs = duelLogger.filterLogs({ player: "OPPONENT" });

    expect(playerLogs.length).toBe(1);
    expect(opponentLogs.length).toBe(1);
    expect(playerLogs[0].player).toBe("PLAYER");
    expect(opponentLogs[0].player).toBe("OPPONENT");
  });

  it("should filter logs by action type", () => {
    duelLogger.addLogEntry(mockState, {
      type: "DRAW",
      player: "PLAYER",
      count: 1,
    });
    duelLogger.addLogEntry(mockState, {
      type: "NORMAL_SUMMON",
      player: "PLAYER",
      cardInstanceId: "card-1",
      targetZoneIndex: 0,
    });

    const drawLogs = duelLogger.filterLogs({ actionType: "DRAW" });
    const summonLogs = duelLogger.filterLogs({ actionType: "NORMAL_SUMMON" });

    expect(drawLogs.length).toBe(1);
    expect(summonLogs.length).toBe(1);
    expect(drawLogs[0].action.type).toBe("DRAW");
    expect(summonLogs[0].action.type).toBe("NORMAL_SUMMON");
  });

  it("should filter logs by search term", () => {
    duelLogger.addLogEntry(mockState, {
      type: "NORMAL_SUMMON",
      player: "PLAYER",
      cardInstanceId: "card-1",
      targetZoneIndex: 0,
    });
    duelLogger.addLogEntry(mockState, {
      type: "ATTACK",
      player: "PLAYER",
      attackerId: "card-1",
      target: "LP",
    });

    const searchLogs = duelLogger.filterLogs({ searchTerm: "summon" });
    expect(searchLogs.length).toBe(1);
    expect(searchLogs[0].action.type).toBe("NORMAL_SUMMON");
  });

  it("should get logs for specific turn", () => {
    duelLogger.addLogEntry({ ...mockState, turnCount: 1 }, {
      type: "DRAW",
      player: "PLAYER",
      count: 1,
    });
    duelLogger.addLogEntry({ ...mockState, turnCount: 2 }, {
      type: "DRAW",
      player: "PLAYER",
      count: 1,
    });

    const turn1Logs = duelLogger.getLogsForTurn(1);
    const turn2Logs = duelLogger.getLogsForTurn(2);

    expect(turn1Logs.length).toBe(1);
    expect(turn2Logs.length).toBe(1);
    expect(turn1Logs[0].turn).toBe(1);
    expect(turn2Logs[0].turn).toBe(2);
  });

  it("should get logs for specific phase", () => {
    duelLogger.addLogEntry({ ...mockState, phase: "DRAW" }, {
      type: "DRAW",
      player: "PLAYER",
      count: 1,
    });
    duelLogger.addLogEntry({ ...mockState, phase: "MAIN1" }, {
      type: "NORMAL_SUMMON",
      player: "PLAYER",
      cardInstanceId: "card-1",
      targetZoneIndex: 0,
    });

    const drawPhaseLogs = duelLogger.getLogsForPhase("DRAW");
    const mainPhaseLogs = duelLogger.getLogsForPhase("MAIN1");

    expect(drawPhaseLogs.length).toBe(1);
    expect(mainPhaseLogs.length).toBe(1);
    expect(drawPhaseLogs[0].phase).toBe("DRAW");
    expect(mainPhaseLogs[0].phase).toBe("MAIN1");
  });

  it("should export logs as valid JSON", () => {
    duelLogger.addLogEntry(mockState, {
      type: "DRAW",
      player: "PLAYER",
      count: 1,
    });

    const exported = duelLogger.exportAsJSON();

    expect(() => JSON.parse(exported)).not.toThrow();

    const parsed = JSON.parse(exported);
    expect(parsed.version).toBe("1.0");
    expect(parsed.exportedAt).toBeDefined();
    expect(Array.isArray(parsed.logs)).toBe(true);
    expect(parsed.logs.length).toBe(1);
  });

  it("should import logs from valid JSON", () => {
    const mockLogs = [
      {
        id: "test-log-1",
        turn: 1,
        phase: "DRAW",
        player: "PLAYER",
        action: {
          type: "DRAW",
          player: "PLAYER",
          count: 1,
        },
        timestamp: Date.now(),
      },
    ];

    const jsonData = JSON.stringify({
      version: "1.0",
      exportedAt: new Date().toISOString(),
      logs: mockLogs,
    });

    const success = duelLogger.importFromJSON(jsonData);

    expect(success).toBe(true);
    const logs = duelLogger.getLogs();
    expect(logs.length).toBe(1);
    expect(logs[0].id).toBe("test-log-1");
  });

  it("should handle invalid JSON during import", () => {
    const success = duelLogger.importFromJSON("invalid json");

    expect(success).toBe(false);
  });

  it("should clear all logs", () => {
    duelLogger.addLogEntry(mockState, {
      type: "DRAW",
      player: "PLAYER",
      count: 1,
    });

    expect(duelLogger.getLogs().length).toBe(1);

    duelLogger.clearLogs();

    expect(duelLogger.getLogs().length).toBe(0);
  });

  it("should provide statistics", () => {
    duelLogger.addLogEntry(mockState, {
      type: "DRAW",
      player: "PLAYER",
      count: 1,
    });
    duelLogger.addLogEntry(mockState, {
      type: "NORMAL_SUMMON",
      player: "PLAYER",
      cardInstanceId: "card-1",
      targetZoneIndex: 0,
    });
    duelLogger.addLogEntry({ ...mockState, turnCount: 2 }, {
      type: "DRAW",
      player: "PLAYER",
      count: 1,
    });

    const stats = duelLogger.getStats();

    expect(stats.totalLogs).toBe(3);
    expect(stats.actionCounts["DRAW"]).toBe(2);
    expect(stats.actionCounts["NORMAL_SUMMON"]).toBe(1);
    expect(stats.turnsCovered).toBe(2); // Turn 1 and 2
  });
});
