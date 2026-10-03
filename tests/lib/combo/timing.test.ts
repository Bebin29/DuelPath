import { describe, expect, it } from 'vitest';
import type { ComboNodeData, NodeKind } from '@/lib/combo/state';
import { formatDuration, lineStepCount, practiceClock } from '@/lib/combo/timing';

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

// NS Aluber → Aluber aktiviert → Gegner-Knoten: keine Reaktion (Rang 0) oder Ash (Rang 1)
// → auflösen → Branded Fusion. Die Hauptline hat drei sichtbare Schritte, der Ash-Branch zwei.
const tree = [
  n('ns', null),
  n('alu', 'ns', 'ACTIVATE'),
  n('opp', 'alu', 'OPPONENT'),
  n('pass', 'opp', 'RESOLVE', { rank: 0 }),
  n('ash', 'opp', 'ACTIVATE', { rank: 1, player: 'opponent' }),
  n('fusion', 'pass'),
];

describe('formatDuration', () => {
  it('schreibt Minuten und Sekunden', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(7_000)).toBe('0:07');
    expect(formatDuration(63_500)).toBe('1:03');
    expect(formatDuration(12 * 60_000 + 3_000)).toBe('12:03');
  });

  it('nimmt Stunden dazu und bleibt bei Unsinn bei null', () => {
    expect(formatDuration(3_723_000)).toBe('1:02:03');
    expect(formatDuration(-5_000)).toBe('0:00');
  });
});

describe('practiceClock', () => {
  it('setzt an der Starthand zurück', () => {
    expect(practiceClock(0, 5, false)).toBe('reset');
    expect(practiceClock(0, 5, true)).toBe('reset');
    expect(practiceClock(0, 0, false)).toBe('reset');
  });

  it('läuft, solange jemand selbst durchgeht', () => {
    expect(practiceClock(1, 5, false)).toBe('run');
    expect(practiceClock(4, 5, false)).toBe('run');
  });

  it('steht beim Abspielen und am Ende der Line', () => {
    expect(practiceClock(3, 5, true)).toBe('hold');
    expect(practiceClock(5, 5, false)).toBe('hold');
    expect(practiceClock(5, 5, true)).toBe('hold');
  });
});

describe('lineStepCount', () => {
  it('zählt die Hauptline ohne RESOLVE und OPPONENT', () => {
    expect(lineStepCount(tree, null)).toBe(3);
    expect(lineStepCount(tree, 'fusion')).toBe(3);
  });

  it('zählt den Branch über seinen eigenen Pfad', () => {
    expect(lineStepCount(tree, 'ash')).toBe(3);
  });

  it('ist bei einem leeren Baum null', () => {
    expect(lineStepCount([], null)).toBe(0);
  });
});
