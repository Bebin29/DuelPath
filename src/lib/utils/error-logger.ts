/**
 * Error-Logging-Utility für zentrale Fehlerbehandlung
 */

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  deckId?: string;
  cardId?: string;
  [key: string]: unknown;
}

/**
 * Loggt einen Fehler mit Kontext-Informationen
 */
export function logError(error: Error, context?: ErrorContext): void {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    timestamp: new Date().toISOString(),
    context,
    userAgent: typeof window !== "undefined" ? window.navigator.userAgent : undefined,
    url: typeof window !== "undefined" ? window.location.href : undefined,
  };

  // Console-Logging für Development
  if (process.env.NODE_ENV === "development") {
    console.error("Error logged:", errorInfo);
  }

  // TODO: Integration mit Error-Tracking-Service (z.B. Sentry, LogRocket)
  // if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  //   Sentry.captureException(error, { extra: context });
  // }

  // Optional: Sende an Backend für zentrale Logging
  if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
    // fetch("/api/log-error", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(errorInfo),
    // }).catch(() => {
    //   // Ignore logging errors
    // });
  }
}

/**
 * Erstellt eine benutzerfreundliche Fehlermeldung
 */
export function getErrorMessage(error: Error | unknown, fallback: string = "Ein unerwarteter Fehler ist aufgetreten"): string {
  if (error instanceof Error) {
    // Bekannte Fehlertypen
    if (error.name === "NetworkError" || error.message.includes("fetch")) {
      return "Netzwerkfehler. Bitte überprüfe deine Internetverbindung.";
    }
    if (error.name === "ChunkLoadError") {
      return "Fehler beim Laden der Anwendung. Bitte lade die Seite neu.";
    }
    if (error.message.includes("timeout")) {
      return "Die Anfrage hat zu lange gedauert. Bitte versuche es erneut.";
    }
    return error.message || fallback;
  }
  return fallback;
}

/**
 * Prüft ob ein Fehler retry-fähig ist
 */
export function isRetryableError(error: Error | unknown): boolean {
  if (error instanceof Error) {
    // Netzwerkfehler sind meist retry-fähig
    if (error.name === "NetworkError" || error.message.includes("fetch")) {
      return true;
    }
    // Timeout-Fehler sind retry-fähig
    if (error.message.includes("timeout")) {
      return true;
    }
    // 5xx Server-Fehler sind retry-fähig
    if (error.message.includes("500") || error.message.includes("502") || error.message.includes("503")) {
      return true;
    }
  }
  return false;
}

