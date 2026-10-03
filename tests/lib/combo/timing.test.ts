import { describe, expect, it } from 'vitest';
import type { ComboNodeData, NodeKind } from '@/lib/combo/state';
import {
  SLOW_PLAY_MS,
  SLOW_PLAY_WARN_MS,
  formatDuration,
  lineStepCount,
  paceOf,
} from '@/lib/combo/timing';

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

describe('paceOf', () => {
  it('warnt vor der Grenze und meldet Slow Play ab sieben Minuten', () => {
    expect(paceOf(0)).toBe('ok');
    expect(paceOf(SLOW_PLAY_WARN_MS - 1)).toBe('ok');
    expect(paceOf(SLOW_PLAY_WARN_MS)).toBe('warn');
    expect(paceOf(SLOW_PLAY_MS - 1)).toBe('warn');
    expect(paceOf(SLOW_PLAY_MS)).toBe('slow');
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
