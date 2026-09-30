import type { ComboNodeData, NodeKind, Player } from '@/lib/combo/state';

/** Virtueller Wurzelknoten im Editor: steht für den Startzustand, wird nicht gespeichert */
export const START_ID = '__start';

export function newNode(parent: ComboNodeData | null, kind: NodeKind): ComboNodeData {
  // Unter einem Gegner-Knoten reagiert standardmäßig der Gegner
  const player: Player =
    kind === 'OPPONENT' || parent?.kind === 'OPPONENT' ? 'opponent' : (parent?.player ?? 'self');
  return {
    id: crypto.randomUUID(),
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
  return `${cardId}-${crypto.randomUUID().slice(0, 8)}`;
}
