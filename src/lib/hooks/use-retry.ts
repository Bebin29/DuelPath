import { useCallback, useRef } from "react";

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

/**
 * Hook für Retry-Logik mit exponential backoff
 * 
 * @param options - Retry-Optionen
 * @returns Retry-Funktion
 */
export function useRetry(options: RetryOptions = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
  } = options;

  const retryCountRef = useRef<Map<string, number>>(new Map());

  /**
   * Führt eine Funktion mit Retry-Logik aus
   * 
   * @param key - Eindeutiger Key für die Operation (für Retry-Tracking)
   * @param fn - Funktion die ausgeführt werden soll
   * @returns Promise mit dem Ergebnis
   */
  const retry = useCallback(
    async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
      let attempt = retryCountRef.current.get(key) || 0;
      let delay = initialDelay;

      while (attempt < maxRetries) {
        try {
          const result = await fn();
          // Erfolg: Reset Retry-Count
          retryCountRef.current.delete(key);
          return result;
        } catch (error) {
          attempt++;
          retryCountRef.current.set(key, attempt);

          if (attempt >= maxRetries) {
            // Max Retries erreicht: Reset und Fehler werfen
            retryCountRef.current.delete(key);
            throw error;
          }

          // Exponential backoff: Warte bevor nächster Versuch
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * backoffMultiplier, maxDelay);
        }
      }

      throw new Error("Retry failed: Max attempts reached");
    },
    [maxRetries, initialDelay, maxDelay, backoffMultiplier]
  );

  /**
   * Setzt den Retry-Count für einen Key zurück
   */
  const resetRetry = useCallback((key: string) => {
    retryCountRef.current.delete(key);
  }, []);

  /**
   * Setzt alle Retry-Counts zurück
   */
  const resetAllRetries = useCallback(() => {
    retryCountRef.current.clear();
  }, []);

  return {
    retry,
    resetRetry,
    resetAllRetries,
  };
}

