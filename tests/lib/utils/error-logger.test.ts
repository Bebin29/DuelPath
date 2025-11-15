/**
 * Unit-Tests für Error-Logger-Utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logError, getErrorMessage, isRetryableError } from "@/lib/utils/error-logger";

describe("error-logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("logError", () => {
    it("sollte Fehler mit Kontext loggen", () => {
      const error = new Error("Test error");
      const context = { component: "TestComponent", action: "test" };

      logError(error, context);

      expect(console.error).toHaveBeenCalled();
      const callArgs = (console.error as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs).toMatchObject({
        message: "Test error",
        context,
      });
    });

    it("sollte Fehler ohne Kontext loggen", () => {
      const error = new Error("Test error");

      logError(error);

      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("getErrorMessage", () => {
    it("sollte benutzerfreundliche Fehlermeldung für NetworkError zurückgeben", () => {
      const error = new Error("NetworkError");
      error.name = "NetworkError";
      const result = getErrorMessage(error);
      expect(result).toContain("Netzwerkfehler");
    });

    it("sollte benutzerfreundliche Fehlermeldung für ChunkLoadError zurückgeben", () => {
      const error = new Error("ChunkLoadError");
      error.name = "ChunkLoadError";
      const result = getErrorMessage(error);
      expect(result).toContain("Laden der Anwendung");
    });

    it("sollte benutzerfreundliche Fehlermeldung für Timeout zurückgeben", () => {
      const error = new Error("Request timeout");
      const result = getErrorMessage(error);
      expect(result).toContain("zu lange gedauert");
    });

    it("sollte Standard-Fehlermeldung zurückgeben wenn unbekannter Fehler", () => {
      const error = new Error("Unknown error");
      const result = getErrorMessage(error, "Custom fallback");
      expect(result).toBe("Unknown error");
    });

    it("sollte Fallback verwenden wenn kein Error-Objekt", () => {
      const result = getErrorMessage(null, "Custom fallback");
      expect(result).toBe("Custom fallback");
    });
  });

  describe("isRetryableError", () => {
    it("sollte true für NetworkError zurückgeben", () => {
      const error = new Error("NetworkError");
      error.name = "NetworkError";
      expect(isRetryableError(error)).toBe(true);
    });

    it("sollte true für Timeout-Fehler zurückgeben", () => {
      const error = new Error("Request timeout");
      expect(isRetryableError(error)).toBe(true);
    });

    it("sollte true für 5xx Server-Fehler zurückgeben", () => {
      const error = new Error("500 Internal Server Error");
      expect(isRetryableError(error)).toBe(true);
    });

    it("sollte false für 4xx Client-Fehler zurückgeben", () => {
      const error = new Error("404 Not Found");
      expect(isRetryableError(error)).toBe(false);
    });

    it("sollte false für unbekannte Fehler zurückgeben", () => {
      const error = new Error("Unknown error");
      expect(isRetryableError(error)).toBe(false);
    });

    it("sollte false zurückgeben wenn kein Error-Objekt", () => {
      expect(isRetryableError(null)).toBe(false);
    });
  });
});

