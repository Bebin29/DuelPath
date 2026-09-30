import { describe, expect, it } from 'vitest';
import type { ComboNodeData, NodeKind } from '@/lib/combo/state';
import { childrenOf, lineSteps, lineThrough, nextRank, rootAlternatives } from '@/lib/combo/lines';

const n = (
  id: string,
  parentId: string | null,
  kind: NodeKind = 'ACTION',
  extra: Partial<ComboNodeData> = {}
): ComboNodeData => ({
  id,
  parentId,
  kind,
  player: 'self',
  ...extra,
});

// NS Aluber → Aluber aktiviert → Gegner-Knoten: Keine Reaktion (Rang 0) oder Ash (Rang 1) → auflösen → Branded Fusion
const tree = [
  n('ns', null),
  n('alu', 'ns', 'ACTIVATE'),
  n('opp', 'alu', 'OPPONENT'),
  n('ash', 'opp', 'ACTIVATE', { rank: 1, player: 'opponent', edgeLabel: 'Ash Blossom' }),
  n('none', 'opp', 'RESOLVE', { rank: 0, edgeLabel: 'Keine Reaktion' }),
  n('bf', 'none', 'ACTIVATE'),
  n('alt', null, 'ACTION', { rank: 1 }),
];

describe('childrenOf und nextRank', () => {
  it('sortiert nach Rang und vergibt den nächsten freien Rang', () => {
    expect(childrenOf(tree, 'opp').map((c) => c.id)).toEqual(['none', 'ash']);
    expect(nextRank(tree, 'opp')).toBe(2);
    expect(nextRank(tree, 'bf')).toBe(0);
  });
});

describe('lineThrough', () => {
  it('folgt nach dem gewählten Knoten der Hauptline bis zum Blatt', () => {
    expect(lineThrough(tree, 'alu').map((x) => x.id)).toEqual(['ns', 'alu', 'opp', 'none', 'bf']);
  });

  it('zeigt im Branch den Pfad dorthin', () => {
    expect(lineThrough(tree, 'ash').map((x) => x.id)).toEqual(['ns', 'alu', 'opp', 'ash']);
  });

  it('beginnt ohne Auswahl bei der ersten Wurzel', () => {
    expect(lineThrough(tree, null).map((x) => x.id)).toEqual(['ns', 'alu', 'opp', 'none', 'bf']);
  });
});

describe('lineSteps', () => {
  it('blendet RESOLVE und OPPONENT aus und hängt deren Branches an den vorigen Schritt', () => {
    const steps = lineSteps(tree, lineThrough(tree, 'alu'), (x) => x.id);
    expect(steps.map((s) => [s.node.id, s.number])).toEqual([
      ['ns', 1],
      ['alu', 2],
      ['bf', 3],
    ]);
    expect(steps[1].branches).toEqual([{ nodeId: 'ash', letter: 'B', label: 'Ash Blossom' }]);
  });

  it('rückt gechainte Aktivierungen ein', () => {
    const chain = [
      n('a', null, 'ACTIVATE'),
      n('b', 'a', 'ACTIVATE'),
      n('r', 'b', 'RESOLVE'),
      n('c', 'r', 'ACTIVATE'),
    ];
    const steps = lineSteps(chain, lineThrough(chain, null), (x) => x.id);
    expect(steps.map((s) => s.chainDepth)).toEqual([0, 1, 0]);
  });
});

describe('rootAlternatives', () => {
  it('liefert die weiteren Lines ab der Starthand', () => {
    expect(rootAlternatives(tree).map((x) => x.id)).toEqual(['alt']);
  });
});
