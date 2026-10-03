// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findMany: vi.fn(),
  deleteMany: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock('@/lib/auth/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    banlist: { findMany: mocks.findMany, deleteMany: mocks.deleteMany },
    $transaction: mocks.transaction,
  },
}));
import { getBanlists, deleteNextBanlist, saveNextBanlist } from '@/server/actions/banlist.actions';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'alice' } });
  mocks.findMany.mockResolvedValue([]);
});

it('reads only the current list and the caller’s private comparison list', async () => {
  await getBanlists();
  expect(mocks.findMany.mock.lastCall?.[0].where).toEqual({
    key: { in: ['current', 'next:alice'] },
  });
  mocks.auth.mockResolvedValue({ user: { id: 'bob' } });
  await getBanlists();
  expect(mocks.findMany.mock.lastCall?.[0].where).toEqual({ key: { in: ['current', 'next:bob'] } });
});

it('deletes only the caller’s comparison list', async () => {
  await deleteNextBanlist();
  expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { key: 'next:alice' } });
});

it('rejects unauthenticated writes and duplicate card entries before a transaction', async () => {
  mocks.auth.mockResolvedValue(null);
  expect(await deleteNextBanlist()).toEqual({ error: 'Unauthorized' });
  expect(mocks.deleteMany).not.toHaveBeenCalled();
  mocks.auth.mockResolvedValue({ user: { id: 'alice' } });
  const result = await saveNextBanlist({
    name: 'Next',
    effectiveOn: '2026-11-01',
    changes: [
      { cardId: '1', status: 'Limited' },
      { cardId: '1', status: 'Forbidden' },
    ],
  });
  expect(result.error).toBeDefined();
  expect(mocks.transaction).not.toHaveBeenCalled();
});
