'use client';

import { useEffect, useRef } from 'react';

/**
 * Löschen mit „Rückgängig“ (UX-Plan 10): Das vorgemerkte Löschen läuft beim Verlassen der Seite
 * über die Server-Aktion und beim Schließen des Tabs per sendBeacon, damit nichts liegen bleibt.
 */
export function usePendingDelete(
  kind: 'combo' | 'deck',
  pendingId: string | null,
  commit: (id: string) => void
) {
  const ref = useRef(pendingId);
  const commitRef = useRef(commit);
  useEffect(() => {
    ref.current = pendingId;
    commitRef.current = commit;
  });
  useEffect(() => {
    const onHide = () => {
      if (!ref.current) return;
      navigator.sendBeacon(
        '/api/pending-delete',
        new Blob([JSON.stringify({ kind, id: ref.current })], { type: 'application/json' })
      );
      ref.current = null;
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      if (ref.current) commitRef.current(ref.current);
    };
  }, [kind]);
}
