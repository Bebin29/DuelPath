// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  upsert: vi.fn(),
  transaction: vi.fn(),
  listUpsert: vi.fn(),
  listUpdate: vi.fn(),
}));
vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    card: { findMany: mocks.findMany, upsert: mocks.upsert },
    banlist: { upsert: mocks.listUpsert, updateMany: mocks.listUpdate },
    $transaction: mocks.transaction,
  },
}));

import {
  mapCard,
  importTcgCards,
  type YGOPRODeckCard,
} from '@/server/services/card-import.service';

const ASH: YGOPRODeckCard = {
  id: 14558127,
  name: 'Ash Blossom & Joyous Spring',
  type: 'Effect Monster',
  race: 'Zombie',
  attribute: 'FIRE',
  level: 3,
  atk: 0,
  def: 1800,
  desc: 'When a card or effect is activated that includes any of these effects (Quick Effect): You can discard this card; negate that effect.\r\n● Add a card from the Deck to the hand.\r\nYou can only use this effect of "Ash Blossom & Joyous Spring" once per turn.',
  banlist_info: { ban_ocg: 'Semi-Limited' },
  misc_info: [{ tcg_date: '2017-05-04' }],
};

describe('mapCard', () => {
  it('übernimmt TCG-Daten, deutsche Texte, Effekte und lokale Bildpfade', () => {
    const card = mapCard(ASH, { name: 'Aschenblüte & Freudiger Frühling', desc: 'Wenn ...' });

    expect(card).toMatchObject({
      id: '14558127',
      passcode: '14558127',
      nameDe: 'Aschenblüte & Freudiger Frühling',
      descDe: 'Wenn ...',
      // nur OCG-Banlist gesetzt: im TCG unbeschränkt
      banTcg: null,
      tcgDate: new Date('2017-05-04'),
      effectsReview: false,
      imageSmall: '/api/card-images/14558127_small.jpg',
    });
    expect((card?.effects as { effects: unknown[] }).effects).toHaveLength(1);
  });

  it('überspringt Karten ohne TCG-Release und Speed-Duel-Skill-Cards', () => {
    expect(mapCard({ ...ASH, misc_info: [{}] })).toBeNull();
    expect(mapCard({ ...ASH, type: 'Skill Card' })).toBeNull();
  });

  it('nimmt die Link-Zahl als Level und den TCG-Banlist-Status', () => {
    const card = mapCard({
      ...ASH,
      type: 'Link Monster',
      level: undefined,
      linkval: 4,
      banlist_info: { ban_tcg: 'Limited' },
    });
    expect(card).toMatchObject({ level: 4, banTcg: 'Limited' });
  });
});

describe('import metadata', () => {
  it('never infers an effective date from the retrieval time', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [ASH] }) })
    );
    mocks.findMany.mockResolvedValue([{ id: String(ASH.id), banTcg: null }]);
    mocks.transaction.mockResolvedValue([]);
    mocks.listUpsert.mockResolvedValue({});
    const stats = await importTcgCards();
    expect(stats.importedAt).toBeInstanceOf(Date);
    expect(mocks.listUpsert).toHaveBeenLastCalledWith({
      where: { key: 'current' },
      create: { key: 'current', name: 'TCG', importedAt: stats.importedAt },
      update: { importedAt: stats.importedAt },
    });
    vi.unstubAllGlobals();
  });
  it('clears an old confirmed date when restrictions change', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [ASH] }) })
    );
    mocks.findMany.mockResolvedValue([{ id: String(ASH.id), banTcg: 'Limited' }]);
    const stats = await importTcgCards();
    expect(mocks.listUpsert.mock.lastCall?.[0].update).toEqual({
      importedAt: stats.importedAt,
      effectiveOn: null,
    });
    vi.unstubAllGlobals();
  });
  it('invalidates a confirmed date before a failing update batch', async () => {
    mocks.listUpsert.mockClear();
    mocks.listUpdate.mockClear();
    mocks.findMany.mockResolvedValue([{ id: String(ASH.id), banTcg: 'Limited' }]);
    mocks.transaction.mockRejectedValueOnce(new Error('batch failed'));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [ASH] }) })
    );
    await expect(importTcgCards()).rejects.toThrow('batch failed');
    expect(mocks.listUpdate).toHaveBeenCalledWith({
      where: { key: 'current' },
      data: { effectiveOn: null, importedAt: null },
    });
    expect(mocks.listUpsert).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it('does not publish a fresh snapshot when a card fetch fails', async () => {
    mocks.listUpsert.mockClear();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await expect(importTcgCards()).rejects.toThrow('offline');
    expect(mocks.listUpsert).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
