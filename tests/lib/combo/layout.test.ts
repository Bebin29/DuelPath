// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { layoutTree } from '@/lib/combo/layout';

describe('layoutTree', () => {
  it('legt Kinder unter ihre Eltern und Geschwister nebeneinander', () => {
    const pos = layoutTree([
      { id: 'root', parentId: null },
      { id: 'a', parentId: 'root' },
      { id: 'b', parentId: 'root' },
      { id: 'a1', parentId: 'a' },
    ]);
    expect(pos.get('a')!.y).toBeGreaterThan(pos.get('root')!.y);
    expect(pos.get('a1')!.y).toBeGreaterThan(pos.get('a')!.y);
    expect(pos.get('a')!.y).toBe(pos.get('b')!.y);
    expect(pos.get('a')!.x).not.toBe(pos.get('b')!.x);
  });
});
