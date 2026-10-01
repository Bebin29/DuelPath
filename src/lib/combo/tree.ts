import type { ComboNodeData, NodeKind, Player } from '@/lib/combo/state';

/** Virtueller Wurzelknoten im Editor: steht für den Startzustand, wird nicht gespeichert */
export const START_ID = '__start';

/** UUID v4; crypto.randomUUID fehlt außerhalb von HTTPS/localhost (z. B. Aufruf per LAN-IP) */
export function newId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function newNode(parent: ComboNodeData | null, kind: NodeKind): ComboNodeData {
  // Unter einem Gegner-Knoten reagiert standardmäßig der Gegner
  const player: Player =
    kind === 'OPPONENT' || parent?.kind === 'OPPONENT' ? 'opponent' : (parent?.player ?? 'self');
  return {
    id: newId(),
    parentId: parent?.id ?? null,
    kind,
    player: kind === 'RESOLVE' || kind === 'END' ? 'self' : player,
    costMoves: [],
    resolveMoves: [],
  };
}

/** Entfernt den Knoten mit allen Nachfahren */
export function removeSubtree(nodes: ComboNodeData[], id: string): ComboNodeData[] {
  const doomed = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of nodes) {
      if (n.parentId && doomed.has(n.parentId) && !doomed.has(n.id)) {
        doomed.add(n.id);
        grew = true;
      }
    }
  }
  return nodes.filter((n) => !doomed.has(n.id));
}

export function updateNode(
  nodes: ComboNodeData[],
  id: string,
  patch: Partial<ComboNodeData>
): ComboNodeData[] {
  return nodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
}

export function newInstanceId(cardId: string): string {
  return `${cardId}-${newId().slice(0, 8)}`;
}
