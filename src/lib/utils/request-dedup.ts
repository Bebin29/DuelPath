/**
 * Request-Deduplizierung für Backend-Requests
 *
 * Verhindert, dass identische Requests innerhalb eines kurzen Zeitfensters
 * mehrfach ausgeführt werden. Stattdessen wird das Ergebnis des ersten Requests
 * für alle wartenden Requests verwendet.
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

const pendingRequests = new Map<string, PendingRequest<any>>();
const DEDUP_WINDOW_MS = 100; // 100ms Fenster für Deduplizierung

/**
 * Führt eine deduplizierte Request-Funktion aus
 *
 * @param key - Eindeutiger Schlüssel für den Request
 * @param requestFn - Funktion, die den Request ausführt
 * @returns Promise mit dem Request-Ergebnis
 */
export async function deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
  const now = Date.now();

  // Prüfe ob bereits ein identischer Request läuft
  const existing = pendingRequests.get(key);
  if (existing && now - existing.timestamp < DEDUP_WINDOW_MS) {
    // Verwende das bestehende Promise
    return existing.promise;
  }

  // Erstelle neuen Request
  const promise = requestFn().finally(() => {
    // Entferne nach Abschluss (mit kurzer Verzögerung für Race Conditions)
    setTimeout(() => {
      pendingRequests.delete(key);
    }, DEDUP_WINDOW_MS);
  });

  pendingRequests.set(key, {
    promise,
    timestamp: now,
  });

  return promise;
}

/**
 * Erstellt einen Request-Key aus Method, URL und Body
 */
export function createRequestKey(method: string, url: string, body?: unknown): string {
  const bodyHash = body ? JSON.stringify(body) : '';
  return `${method}:${url}:${bodyHash}`;
}

/**
 * Bereinigt abgelaufene Requests (sollte periodisch aufgerufen werden)
 */
export function cleanupExpiredRequests(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];

  for (const [key, request] of pendingRequests.entries()) {
    if (now - request.timestamp > DEDUP_WINDOW_MS * 10) {
      expiredKeys.push(key);
    }
  }

  for (const key of expiredKeys) {
    pendingRequests.delete(key);
  }
}

// Periodische Bereinigung (alle 5 Sekunden)
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredRequests, 5000);
}
