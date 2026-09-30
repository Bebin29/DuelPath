// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const prisma = vi.hoisted(() => ({
  combo: { findUnique: vi.fn(), update: vi.fn() },
  comboNode: { deleteMany: vi.fn(), createMany: vi.fn() },
  $transaction: vi.fn(),
}));
const auth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/prisma/client', () => ({ prisma }));
vi.mock('@/lib/auth/auth', () => ({ auth }));

import { saveCombo } from '@/server/actions/combo.actions';
import type { SaveComboInput } from '@/lib/validations/combo.schema';

// Absichtlich ungeprüfte Daten, wie sie von einem Client kommen könnten
const input = (nodes: object[]) =>
  ({ title: 'Test', startState: { cards: [] }, nodes }) as unknown as SaveComboInput;
const node = (id: string, parentId: string | null) => ({
  id,
  parentId,
  kind: 'ACTION',
  player: 'self',
});

describe('saveCombo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: 'user-1' } });
    prisma.combo.findUnique.mockResolvedValue({ id: 'c1', userId: 'user-1' });
  });

  it('lehnt fremde Combos ab', async () => {
    prisma.combo.findUnique.mockResolvedValue({ id: 'c1', userId: 'someone-else' });
    expect(await saveCombo('c1', input([]))).toEqual({ error: 'Not found' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lehnt nicht angemeldete Nutzer ab', async () => {
    auth.mockResolvedValue(null);
    expect(await saveCombo('c1', input([]))).toEqual({ error: 'Unauthorized' });
  });

  it('lehnt ungültige Knoten und unbekannte Eltern ab', async () => {
    expect(
      (await saveCombo('c1', input([{ ...node('a', null), kind: 'HACK' }]))).error
    ).toBeTruthy();
    expect(await saveCombo('c1', input([node('a', 'missing')]))).toEqual({
      error: 'Knoten verweist auf unbekannten Elternknoten',
    });
  });

  it('speichert Eltern vor Kindern', async () => {
    await saveCombo('c1', input([node('c', 'b'), node('b', 'a'), node('a', null)]));
    const data = prisma.comboNode.createMany.mock.calls[0][0].data as { id: string }[];
    expect(data.map((n) => n.id)).toEqual(['a', 'b', 'c']);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });
});
