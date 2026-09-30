import type { CardData, ComboNodeData } from '@/lib/combo/state';

/** Kartendaten im Combo-Editor: Regeldaten für stateAt plus Anzeige */
export interface ComboCard extends CardData {
  nameDe: string | null;
  imageSmall: string | null;
}

/** Eltern vor Kindern, damit Fremdschlüssel beim Einfügen immer auflösbar sind */
export function sortByDepth<T extends Pick<ComboNodeData, 'id' | 'parentId'>>(nodes: T[]): T[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depth = new Map<string, number>();
  const depthOf = (node: T, seen = new Set<string>()): number => {
    const cached = depth.get(node.id);
    if (cached !== undefined) return cached;
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    const d = parent && !seen.has(node.id) ? depthOf(parent, seen.add(node.id)) + 1 : 0;
    depth.set(node.id, d);
    return d;
  };
  return [...nodes].sort((a, b) => depthOf(a) - depthOf(b));
}
