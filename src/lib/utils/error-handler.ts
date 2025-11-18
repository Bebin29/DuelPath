/**
 * Error Handler Utility für Duel-spezifische Fehlerbehandlung
 */

export interface DuelError {
  code: string;
  message: string;
  context?: Record<string, any>;
  recoverable: boolean;
  timestamp: number;
}

export class DuelErrorHandler {
  private errors: DuelError[];
  private maxErrors: number;

  constructor() {
    this.errors = [];
    this.maxErrors = 100;
  }

  /**
   * Erstellt einen strukturierten Duel-Fehler
   */
  createError(
    code: string,
    message: string,
    context?: Record<string, any>,
    recoverable: boolean = true
  ): DuelError {
    // Stelle sicher, dass die Parameter gültig sind
    if (!code || !message) {
      console.error("[DuelError] Invalid error parameters:", { code, message, context });
      // Erstelle einen Fallback-Fehler
      const fallbackError: DuelError = {
        code: "UNKNOWN_ERROR",
        message: "An unknown error occurred",
        context: { originalParams: { code, message, context } },
        recoverable: false,
        timestamp: Date.now(),
      };
      this.errors.push(fallbackError);
      return fallbackError;
    }

    const error: DuelError = {
      code,
      message,
      context,
      recoverable,
      timestamp: Date.now(),
    };

    this.errors.push(error);

    // Begrenze Fehler-Historie
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    return error;
  }

  /**
   * Loggt einen Fehler für Debugging
   */
  logError(error: DuelError, additionalContext?: Record<string, any>): void {
    // Stelle sicher, dass der Fehler gültig ist
    if (!error || !error.code || !error.message) {
      console.error("[DuelError] Invalid error object:", error);
      return;
    }

    const logData = {
      ...error,
      additionalContext,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    console.error("[DuelError]", logData);

    // In Produktion könnte hier eine Logging-API aufgerufen werden
    if (process.env.NODE_ENV === "production") {
      // TODO: Send to error reporting service (Sentry, etc.)
    }
  }

  /**
   * Gibt alle Fehler zurück
   */
  getErrors(): DuelError[] {
    return [...this.errors];
  }

  /**
   * Gibt die neuesten Fehler zurück
   */
  getRecentErrors(count: number = 5): DuelError[] {
    return this.errors.slice(-count);
  }

  /**
   * Löscht alle Fehler
   */
  clearErrors(): void {
    this.errors = [];
  }

  /**
   * Prüft ob ein bestimmter Fehler-Typ aufgetreten ist
   */
  hasError(code: string): boolean {
    return this.errors.some(error => error.code === code);
  }

  /**
   * Exportiert Fehler für Debugging
   */
  exportErrors(): string {
    return JSON.stringify({
      version: "1.0",
      exportedAt: new Date().toISOString(),
      errors: this.errors,
    }, null, 2);
  }
}

/**
 * Singleton-Instanz des Error Handlers
 */
export const duelErrorHandler = new DuelErrorHandler();

/**
 * Hook für Error Handling
 */
export function useDuelErrorHandler() {
  return {
    createError: (code?: string, message?: string, context?: Record<string, any>, recoverable = true) =>
      duelErrorHandler.createError(code || "UNKNOWN_ERROR", message || "An unknown error occurred", context, recoverable),
    logError: (error: DuelError, context?: Record<string, any>) =>
      duelErrorHandler.logError(error, context),
    getErrors: () => duelErrorHandler.getErrors(),
    getRecentErrors: (count = 5) => duelErrorHandler.getRecentErrors(count),
    clearErrors: () => duelErrorHandler.clearErrors(),
    hasError: (code: string) => duelErrorHandler.hasError(code),
    exportErrors: () => duelErrorHandler.exportErrors(),
  };
}

/**
 * Hilfsfunktion für häufige Fehler
 */
export const DuelErrors = {
  INVALID_ACTION: "INVALID_ACTION",
  STATE_CORRUPTION: "STATE_CORRUPTION",
  NETWORK_ERROR: "NETWORK_ERROR",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  DECK_LOAD_FAILED: "DECK_LOAD_FAILED",
  CARD_NOT_FOUND: "CARD_NOT_FOUND",
  PHASE_TRANSITION_INVALID: "PHASE_TRANSITION_INVALID",
  GAME_STATE_INCONSISTENT: "GAME_STATE_INCONSISTENT",
} as const;

/**
 * Hilfsfunktion zur Erstellung von Recovery-Vorschlägen
 */
export function getRecoverySuggestion(error: DuelError): string {
  switch (error.code) {
    case DuelErrors.INVALID_ACTION:
      return "Try a different action or check the current game phase.";
    case DuelErrors.STATE_CORRUPTION:
      return "Reload the duel to restore a clean state.";
    case DuelErrors.NETWORK_ERROR:
      return "Check your internet connection and try again.";
    case DuelErrors.VALIDATION_FAILED:
      return "The action is not allowed in the current game state.";
    case DuelErrors.DECK_LOAD_FAILED:
      return "Try selecting a different deck or reload the page.";
    case DuelErrors.CARD_NOT_FOUND:
      return "The card data could not be loaded. Try refreshing.";
    case DuelErrors.PHASE_TRANSITION_INVALID:
      return "Phase transition not allowed. Follow the correct turn order.";
    case DuelErrors.GAME_STATE_INCONSISTENT:
      return "Game state is corrupted. Starting a new duel is recommended.";
    default:
      return "An unexpected error occurred. Please reload the page.";
  }
}
