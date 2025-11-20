import { useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOptions<T> {
  /**
   * Die zu speichernden Daten
   */
  data: T;
  /**
   * Callback-Funktion, die aufgerufen wird, wenn gespeichert werden soll
   */
  onSave: (data: T) => Promise<void> | void;
  /**
   * Debounce-Zeit in Millisekunden (Standard: 500ms)
   */
  debounceMs?: number;
  /**
   * Ob Auto-Save aktiviert ist (Standard: true)
   */
  enabled?: boolean;
  /**
   * Vergleichsfunktion, um zu prüfen, ob sich die Daten geändert haben
   */
  compareFn?: (prev: T, current: T) => boolean;
}

/**
 * Custom Hook für Auto-Save mit Debouncing
 *
 * Features:
 * - Automatisches Speichern nach Debounce-Zeit
 * - Vergleichsfunktion um unnötige Speicherungen zu vermeiden
 * - Aktivierung/Deaktivierung möglich
 *
 * @example
 * ```tsx
 * const { isSaving, lastSaved } = useAutoSave({
 *   data: { title, description },
 *   onSave: async (data) => {
 *     await updateCombo(comboId, data);
 *   },
 *   debounceMs: 500,
 * });
 * ```
 */
export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 500,
  enabled = true,
  compareFn,
}: UseAutoSaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<T | null>(null);
  const isSavingRef = useRef(false);
  const onSaveRef = useRef(onSave);

  // Aktualisiere onSave-Ref, wenn sich die Funktion ändert
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Vergleichsfunktion: Standard ist Referenzgleichheit
  const hasChanged = useCallback(
    (prev: T | null, current: T): boolean => {
      if (prev === null) return true;
      if (compareFn) {
        return !compareFn(prev, current);
      }
      return prev !== current;
    },
    [compareFn]
  );

  useEffect(() => {
    if (!enabled) {
      // Lösche Timeout wenn Auto-Save deaktiviert ist
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Prüfe ob sich die Daten geändert haben
    if (!hasChanged(lastSavedRef.current, data)) {
      return;
    }

    // Lösche vorherigen Timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Setze neuen Timeout
    timeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) {
        return; // Verhindere gleichzeitige Speicherungen
      }

      isSavingRef.current = true;
      try {
        await onSaveRef.current(data);
        lastSavedRef.current = data;
      } catch (error) {
        console.error('Auto-save failed:', error);
      } finally {
        isSavingRef.current = false;
      }
    }, debounceMs);

    // Cleanup: Lösche Timeout beim Unmount oder wenn sich Daten ändern
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [data, debounceMs, enabled, hasChanged]);

  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving: isSavingRef.current,
  };
}
