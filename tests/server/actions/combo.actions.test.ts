// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const prisma = vi.hoisted(() => {
  const p = {
    combo: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    deck: { findUnique: vi.fn() },
    comboNode: { deleteMany: vi.fn(), createMany: vi.fn() },
    $transaction: vi.fn(),
  };
  // Interaktive Transaktion: der Callback bekommt denselben Client
  p.$transaction.mockImplementation((fn: (tx: typeof p) => unknown) => fn(p));
  return p;
});
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
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) => fn(prisma));
    auth.mockResolvedValue({ user: { id: 'user-1' } });
    prisma.combo.updateMany.mockResolvedValue({ count: 1 });
    prisma.combo.findUnique.mockResolvedValue({ revision: 4 });
  });

  it('lehnt fremde Combos ab', async () => {
    prisma.combo.updateMany.mockResolvedValue({ count: 0 });
    prisma.combo.findFirst.mockResolvedValue(null);
    expect(await saveCombo('c1', input([]))).toEqual({ error: 'Not found' });
    expect(prisma.comboNode.createMany).not.toHaveBeenCalled();
    expect(prisma.combo.updateMany.mock.calls[0][0].where).toMatchObject({ userId: 'user-1' });
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

  it('speichert Eltern vor Kindern und liefert die neue Revision', async () => {
    const result = await saveCombo('c1', input([node('c', 'b'), node('b', 'a'), node('a', null)]));
    const data = prisma.comboNode.createMany.mock.calls[0][0].data as { id: string }[];
    expect(data.map((n) => n.id)).toEqual(['a', 'b', 'c']);
    expect(result).toEqual({ data: { revision: 4 } });
  });

  it('meldet einen Konflikt, wenn jemand anderes inzwischen gespeichert hat', async () => {
    prisma.combo.updateMany.mockResolvedValue({ count: 0 });
    prisma.combo.findFirst.mockResolvedValue({ id: 'c1' });
    expect(await saveCombo('c1', input([]), 2)).toEqual({ error: 'CONFLICT' });
    expect(prisma.combo.updateMany.mock.calls[0][0].where).toMatchObject({ revision: 2 });
    expect(prisma.comboNode.deleteMany).not.toHaveBeenCalled();
  });
});
