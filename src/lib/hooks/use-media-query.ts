'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Trifft die Media-Query zu? Auf dem Server und beim Hydrieren `null`, damit nichts
 * Falsches aufblitzt; danach der echte Wert, der beim Ändern der Fenstergröße mitgeht.
 */
export function useMediaQuery(query: string): boolean | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query]
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => null
  );
}
