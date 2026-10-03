// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock('@/lib/auth/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    banlist: {
      findMany: mocks.findMany,
      findUnique: mocks.findUnique,
      upsert: mocks.upsert,
      deleteMany: mocks.deleteMany,
    },
    $transaction: mocks.transaction,
  },
}));
import {
  getBanlists,
  deleteNextBanlist,
  saveNextBanlist,
  setCurrentBanlistDate,
} from '@/server/actions/banlist.actions';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: 'alice' } });
  mocks.findMany.mockResolvedValue([]);
});

it('reads only the current list and the caller’s private comparison list', async () => {
  await getBanlists();
  expect(mocks.findMany.mock.lastCall?.[0].where).toEqual({
    key: { in: ['current', 'current:alice', 'next:alice'] },
  });
  mocks.auth.mockResolvedValue({ user: { id: 'bob' } });
  await getBanlists();
  expect(mocks.findMany.mock.lastCall?.[0].where).toEqual({
    key: { in: ['current', 'current:bob', 'next:bob'] },
  });
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

it('confirms a date privately and ignores it after another import', async () => {
  const importedAt = new Date('2026-10-03T12:00:00Z');
  mocks.findUnique.mockResolvedValue({ importedAt });
  expect(await setCurrentBanlistDate('2026-10-01')).toEqual({ data: true });
  expect(mocks.upsert.mock.lastCall?.[0].where).toEqual({ key: 'current:alice' });
  mocks.findMany.mockResolvedValue([
    { key: 'current', name: 'TCG', effectiveOn: null, importedAt, cards: [] },
    {
      key: 'current:alice',
      name: 'TCG',
      effectiveOn: new Date('2026-10-01T00:00:00Z'),
      importedAt,
      cards: [],
    },
  ]);
  expect((await getBanlists()).current?.effectiveOn).toBe('2026-10-01');
  mocks.findMany.mockResolvedValue([
    {
      key: 'current',
      name: 'TCG',
      effectiveOn: null,
      importedAt: new Date('2026-10-04T12:00:00Z'),
      cards: [],
    },
    {
      key: 'current:alice',
      name: 'TCG',
      effectiveOn: new Date('2026-10-01T00:00:00Z'),
      importedAt,
      cards: [],
    },
  ]);
  expect((await getBanlists()).current?.effectiveOn).toBeNull();
});
