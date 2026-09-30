// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const prisma = vi.hoisted(() => ({
  card: { findMany: vi.fn() },
  jevCache: { findUnique: vi.fn(), upsert: vi.fn() },
}));
const decide = vi.hoisted(() => vi.fn());
vi.mock('@/lib/prisma/client', () => ({ prisma }));
vi.mock('@/server/jev', () => ({ decide, jevModel: () => 'test-model' }));

import { rateCandidates } from '@/server/services/suggestion.service';
import type { SuggestionInput } from '@/lib/combo/suggestions';

const INPUT: SuggestionInput = {
  board: [{ cardId: 'ash', player: 'opponent', zone: 'HAND' }],
  chain: [],
  normalSummonUsed: false,
  candidates: [{ cardId: 'ash', effectIndex: 0, player: 'opponent', zone: 'HAND' }],
};

describe('rateCandidates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.card.findMany.mockResolvedValue([
      {
        id: 'ash',
        name: 'Ash Blossom & Joyous Spring',
        type: 'Tuner Monster',
        race: 'Zombie',
        effects: {
          effects: [{ index: 0, text: 'negate that effect', activated: true, patterns: [] }],
        },
      },
    ]);
  });

  it('fragt Jev bei einem Cache-Fehlschlag und speichert die Antwort', async () => {
    prisma.jevCache.findUnique.mockResolvedValue(null);
    decide.mockResolvedValue({ answers: { c0: { type: 'noul', noul: 0.12 } }, cost: 0.00003 });

    const result = await rateCandidates(INPUT);

    expect(result).toEqual({ probabilities: [0.12], cached: false, cost: 0.00003 });
    expect(decide).toHaveBeenCalledOnce();
    expect(prisma.jevCache.upsert).toHaveBeenCalledOnce();
  });

  it('nutzt den Cache ohne neue Jev-Anfrage', async () => {
    prisma.jevCache.findUnique.mockResolvedValue({ answers: { c0: { noul: 0.9 } } });

    const result = await rateCandidates(INPUT);

    expect(result).toEqual({ probabilities: [0.9], cached: true, cost: 0 });
    expect(decide).not.toHaveBeenCalled();
  });

  it('fragt ohne Kandidaten gar nicht', async () => {
    expect(await rateCandidates({ ...INPUT, candidates: [] })).toMatchObject({ probabilities: [] });
    expect(prisma.card.findMany).not.toHaveBeenCalled();
  });
});
