import type { ComboNodeData } from '@/lib/combo/state';

/**
 * Lines aus dem Combo-Baum (UX-Plan 3 und 6.6).
 * Eine Line ist der Pfad bis zu einem Knoten, danach geht es immer über das erste Kind (kleinster Rang) weiter.
 * RESOLVE erscheint nicht als eigene Zeile, OPPONENT ist eine durchlässige Verzweigung: seine Kinder
 * sind Branches des vorigen Schritts (UX-Plan 15).
 */

export interface LineBranch {
  /** Erster Knoten des Branches, dorthin springt ein Klick */
  nodeId: string;
  letter: string;
  label: string;
}

export interface LineStep {
  node: ComboNodeData;
  /** Laufende Nummer der sichtbaren Schritte, ab 1 */
  number: number;
  /** Tiefe in der offenen Chain: 0 außerhalb, 1 ab CL2 usw. */
  chainDepth: number;
  branches: LineBranch[];
}

const rankOf = (n: ComboNodeData) => n.rank ?? 0;

/** Kinder in fester Reihenfolge: Rang, bei Gleichstand die Reihenfolge im Array */
export function childrenOf(nodes: ComboNodeData[], parentId: string | null): ComboNodeData[] {
  return nodes
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => n.parentId === parentId)
    .sort((a, b) => rankOf(a.n) - rankOf(b.n) || a.i - b.i)
    .map(({ n }) => n);
}

/** Rang für ein neues Kind: hinter allen vorhandenen Geschwistern */
export function nextRank(nodes: ComboNodeData[], parentId: string | null): number {
  const siblings = nodes.filter((n) => n.parentId === parentId);
  return siblings.length ? Math.max(...siblings.map(rankOf)) + 1 : 0;
}

/** Knoten der Line durch nodeId: Pfad von der Wurzel, dann weiter über die ersten Kinder bis zum Blatt */
export function lineThrough(nodes: ComboNodeData[], nodeId: string | null): ComboNodeData[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const head: ComboNodeData[] = [];
  const seen = new Set<string>();
  for (
    let n = nodeId ? byId.get(nodeId) : undefined;
    n;
    n = n.parentId ? byId.get(n.parentId) : undefined
  ) {
    if (seen.has(n.id)) break;
    seen.add(n.id);
    head.unshift(n);
  }
  const line = [...head];
  let last: string | null = line.at(-1)?.id ?? null;
  for (;;) {
    const next = childrenOf(nodes, last)[0];
    if (!next || seen.has(next.id)) break;
    seen.add(next.id);
    line.push(next);
    last = next.id;
  }
  return line;
}

const isVisible = (n: ComboNodeData) => n.kind !== 'RESOLVE' && n.kind !== 'OPPONENT';
const LETTERS = 'BCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Sichtbare Schritte einer Line mit Nummer, Chain-Tiefe und Branches */
export function lineSteps(
  nodes: ComboNodeData[],
  line: ComboNodeData[],
  labelOf: (n: ComboNodeData) => string
): LineStep[] {
  const steps: LineStep[] = [];
  let openLinks = 0;
  let letter = 0;
  line.forEach((node, i) => {
    const next = line[i + 1];
    // Alternativen an diesem Knoten: alle Kinder außer dem, das die Line fortsetzt.
    // Hinter einem OPPONENT-Knoten gehören dessen Alternativen zum vorigen sichtbaren Schritt.
    const alternatives = childrenOf(nodes, node.id).filter((c) => c.id !== next?.id);
    const branches = alternatives.map((c) => ({
      nodeId: c.id,
      letter: LETTERS[letter++ % LETTERS.length],
      label: c.edgeLabel || labelOf(c),
    }));

    if (node.kind === 'RESOLVE') {
      openLinks = 0;
    }
    if (!isVisible(node)) {
      steps.at(-1)?.branches.push(...branches);
      return;
    }
    const chainDepth = node.kind === 'ACTIVATE' ? openLinks : 0;
    if (node.kind === 'ACTIVATE') openLinks++;
    else if (node.kind === 'ACTION') openLinks = 0;
    steps.push({ node, number: steps.length + 1, chainDepth, branches });
  });
  return steps;
}

/** Alternativen ab dem Startzustand: weitere Wurzeln neben der ersten */
export function rootAlternatives(nodes: ComboNodeData[]): ComboNodeData[] {
  return childrenOf(nodes, null).slice(1);
}

/**
 * Line zur Hauptline befördern (UX-Plan 6.7): Jeder Knoten auf dem Pfad wird das erste Kind
 * seines Elternknotens, die bisherigen Geschwister rücken in ihrer Reihenfolge nach.
 */
export function promoteLine(nodes: ComboNodeData[], nodeId: string): ComboNodeData[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ranks = new Map<string, number>();
  for (let n = byId.get(nodeId); n; n = n.parentId ? byId.get(n.parentId) : undefined) {
    const siblings = childrenOf(nodes, n.parentId).filter((s) => s.id !== n!.id);
    ranks.set(n.id, 0);
    siblings.forEach((s, i) => ranks.set(s.id, i + 1));
  }
  return nodes.map((n) => (ranks.has(n.id) ? { ...n, rank: ranks.get(n.id) } : n));
}

/** Liegt der Knoten auf der Hauptline (überall das erste Kind)? */
export function isMainLine(nodes: ComboNodeData[], nodeId: string): boolean {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (let n = byId.get(nodeId); n; n = n.parentId ? byId.get(n.parentId) : undefined) {
    if (childrenOf(nodes, n.parentId)[0]?.id !== n.id) return false;
  }
  return true;
}
