// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { newId, newNode, removeSubtree } from '@/lib/combo/tree';

describe('tree', () => {
  it('removeSubtree entfernt den Knoten und alle Nachfahren, nicht die Geschwister', () => {
    const root = newNode(null, 'ACTION');
    const opp = newNode(root, 'OPPONENT');
    const a = newNode(opp, 'RESOLVE');
    const b = newNode(opp, 'ACTIVATE');
    const b1 = newNode(b, 'RESOLVE');
    const sibling = newNode(root, 'END');

    const left = removeSubtree([root, opp, a, b, b1, sibling], opp.id);
    expect(left.map((n) => n.id)).toEqual([root.id, sibling.id]);
  });

  it('unter einem Gegner-Knoten reagiert standardmäßig der Gegner', () => {
    const opp = newNode(newNode(null, 'ACTION'), 'OPPONENT');
    expect(newNode(opp, 'ACTIVATE').player).toBe('opponent');
    expect(newNode(opp, 'RESOLVE').player).toBe('self');
  });

  it('newId liefert eindeutige UUID v4 ohne crypto.randomUUID', () => {
    const ids = new Set(Array.from({ length: 100 }, newId));
    expect(ids.size).toBe(100);
    for (const id of ids)
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
