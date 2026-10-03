import { effectsOf } from '@/lib/cards/effect-override';
import type { CardData, ComboNodeData } from '@/lib/combo/state';

/** Kartendaten im Combo-Editor: Regeldaten für stateAt plus Anzeige */
export interface ComboCard extends CardData {
  nameDe: string | null;
  imageSmall: string | null;
}

/** Karte aus /api/cards (effects als ParsedEffects-JSON) */
export function toComboCard(row: {
  id: string;
  name: string;
  nameDe?: string | null;
  type: string;
  race?: string | null;
  imageSmall?: string | null;
  effects?: unknown;
  effectsOverride?: unknown;
  linkMarkers?: string[] | null;
}): ComboCard {
  return {
    id: row.id,
    name: row.name,
    nameDe: row.nameDe ?? null,
    type: row.type,
    race: row.race ?? null,
    imageSmall: row.imageSmall ?? null,
    effects: effectsOf(row),
    ...(row.linkMarkers?.length && { linkMarkers: row.linkMarkers }),
  };
}

export function displayName(
  card: { name: string; nameDe: string | null } | undefined,
  language: string
): string {
  if (!card) return '?';
  return language.startsWith('de') && card.nameDe ? card.nameDe : card.name;
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
