import { Graph, layout } from '@dagrejs/dagre';

export const NODE_WIDTH = 230;
export const NODE_HEIGHT = 84;

/** Positionen für einen Baum von oben nach unten (linke obere Ecke je Knoten, wie React Flow sie erwartet) */
export function layoutTree(
  items: { id: string; parentId: string | null }[]
): Map<string, { x: number; y: number }> {
  const graph = new Graph();
  graph.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60 });
  graph.setDefaultEdgeLabel(() => ({}));
  for (const item of items) graph.setNode(item.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  for (const item of items) {
    if (item.parentId && graph.hasNode(item.parentId)) graph.setEdge(item.parentId, item.id);
  }
  layout(graph);

  const positions = new Map<string, { x: number; y: number }>();
  for (const item of items) {
    const { x, y } = graph.node(item.id);
    positions.set(item.id, { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 });
  }
  return positions;
}
