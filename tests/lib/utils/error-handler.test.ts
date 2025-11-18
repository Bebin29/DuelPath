import { describe, it, expect, vi, beforeEach } from "vitest";
import { duelErrorHandler, DuelErrors } from "@/lib/utils/error-handler";

describe("DuelErrorHandler", () => {
  beforeEach(() => {
    // Reset error handler state
    duelErrorHandler.clearErrors();
  });

  it("should create and store errors", () => {
    const error = duelErrorHandler.createError(
      DuelErrors.INVALID_ACTION,
      "Invalid action performed",
      { actionType: "DRAW", player: "PLAYER" },
      true
    );

    expect(error.code).toBe(DuelErrors.INVALID_ACTION);
    expect(error.message).toBe("Invalid action performed");
    expect(error.context).toEqual({ actionType: "DRAW", player: "PLAYER" });
    expect(error.recoverable).toBe(true);
    expect(error.timestamp).toBeDefined();
  });

  it("should limit stored errors to maximum", () => {
    // Create more errors than the limit (100)
    for (let i = 0; i < 105; i++) {
      duelErrorHandler.createError(
        DuelErrors.STATE_CORRUPTION,
        `Error ${i}`,
        {},
        false
      );
    }

    const errors = duelErrorHandler.getErrors();
    expect(errors.length).toBeLessThanOrEqual(100);
  });

  it("should log errors with additional context", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const logErrorSpy = vi.spyOn(duelErrorHandler, "logError");

    const error = duelErrorHandler.createError(
      DuelErrors.NETWORK_ERROR,
      "Network connection failed",
      { url: "/api/cards" },
      true
    );

    duelErrorHandler.logError(error, {
      component: "CardService",
      attemptCount: 3,
    });

    expect(logErrorSpy).toHaveBeenCalledWith(error, {
      component: "CardService",
      attemptCount: 3,
    });

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should check for specific error codes", () => {
    expect(duelErrorHandler.hasError(DuelErrors.INVALID_ACTION)).toBe(false);

    duelErrorHandler.createError(DuelErrors.INVALID_ACTION, "Test error");

    expect(duelErrorHandler.hasError(DuelErrors.INVALID_ACTION)).toBe(true);
    expect(duelErrorHandler.hasError(DuelErrors.STATE_CORRUPTION)).toBe(false);
  });

  it("should return recent errors", () => {
    duelErrorHandler.createError(DuelErrors.INVALID_ACTION, "Error 1");
    duelErrorHandler.createError(DuelErrors.STATE_CORRUPTION, "Error 2");
    duelErrorHandler.createError(DuelErrors.NETWORK_ERROR, "Error 3");

    const recentErrors = duelErrorHandler.getRecentErrors(2);
    expect(recentErrors.length).toBe(2);
    expect(recentErrors[1].code).toBe(DuelErrors.NETWORK_ERROR);
    expect(recentErrors[0].code).toBe(DuelErrors.STATE_CORRUPTION);
  });

  it("should export errors as JSON", () => {
    const error = duelErrorHandler.createError(
      DuelErrors.DECK_LOAD_FAILED,
      "Deck loading failed",
      { deckId: "test-deck" },
      false
    );

    const exported = duelErrorHandler.exportErrors();

    expect(() => JSON.parse(exported)).not.toThrow();

    const parsed = JSON.parse(exported);
    expect(parsed.version).toBe("1.0");
    expect(parsed.exportedAt).toBeDefined();
    expect(Array.isArray(parsed.errors)).toBe(true);
    expect(parsed.errors[0].code).toBe(DuelErrors.DECK_LOAD_FAILED);
  });

  it("should import errors from JSON", () => {
    const mockErrors = [
      {
        code: DuelErrors.CARD_NOT_FOUND,
        message: "Card not found",
        context: { cardId: "test-card" },
        recoverable: true,
        timestamp: Date.now(),
      },
    ];

    const jsonData = JSON.stringify({
      version: "1.0",
      exportedAt: new Date().toISOString(),
      errors: mockErrors,
    });

    const success = duelErrorHandler.importFromJSON(jsonData);

    expect(success).toBe(true);
    expect(duelErrorHandler.hasError(DuelErrors.CARD_NOT_FOUND)).toBe(true);
  });

  it("should handle invalid JSON during import", () => {
    const success = duelErrorHandler.importFromJSON("invalid json");

    expect(success).toBe(false);
  });

  it("should handle malformed import data", () => {
    const jsonData = JSON.stringify({
      version: "1.0",
      exportedAt: new Date().toISOString(),
      // Missing errors array
    });

    const success = duelErrorHandler.importFromJSON(jsonData);

    expect(success).toBe(false);
  });

  it("should clear all errors", () => {
    duelErrorHandler.createError(DuelErrors.INVALID_ACTION, "Test error");
    duelErrorHandler.createError(DuelErrors.STATE_CORRUPTION, "Another error");

    expect(duelErrorHandler.getErrors().length).toBe(2);

    duelErrorHandler.clearErrors();

    expect(duelErrorHandler.getErrors().length).toBe(0);
  });

  it("should provide error statistics", () => {
    duelErrorHandler.createError(DuelErrors.INVALID_ACTION, "Action error");
    duelErrorHandler.createError(DuelErrors.INVALID_ACTION, "Another action error");
    duelErrorHandler.createError(DuelErrors.NETWORK_ERROR, "Network error");

    const stats = duelErrorHandler.getStats();

    expect(stats.totalLogs).toBe(3);
    expect(stats.actionCounts[DuelErrors.INVALID_ACTION]).toBe(2);
    expect(stats.actionCounts[DuelErrors.NETWORK_ERROR]).toBe(1);
    expect(stats.playerCounts["PLAYER"]).toBeUndefined(); // No player context in these errors
  });
});
