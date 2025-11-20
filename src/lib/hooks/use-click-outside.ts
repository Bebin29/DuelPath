import { useEffect, useRef, type RefObject } from 'react';

/**
 * Hook zum Erkennen von Klicks außerhalb eines Elements
 *
 * @param ref - Ref zum Element, außerhalb dessen Klicks erkannt werden sollen
 * @param handler - Callback-Funktion, die bei Klick außerhalb aufgerufen wird
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  const handlerRef = useRef(handler);

  // Aktualisiere den Handler-Ref bei Änderungen
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref?.current;
      if (!el || el.contains(event.target as Node)) {
        return;
      }

      handlerRef.current(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref]);
}
