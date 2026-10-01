// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

const prisma = vi.hoisted(() => ({ deck: { create: vi.fn() } }));
const writeDeckCards = vi.hoisted(() => vi.fn());
const findCard = vi.hoisted(() => vi.fn());
vi.mock('@/lib/prisma/client', () => ({ prisma }));
vi.mock('@/lib/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/server/services/deck-store.service', () => ({
  writeDeckCards,
  idsForPasscodes: vi.fn(),
}));
vi.mock('@/server/api/combo-api', () => ({
  findCard,
  userNicknames: vi.fn(async () => ({})),
}));

import { createDeckFromRequest } from '@/server/api/deck-api';
import { ApiError } from '@/server/api/http';

const CARDS: Record<string, { id: string; name: string; type: string }> = {
  'crystal bond': { id: 'BOND', name: 'Crystal Bond', type: 'Spell Card' },
  ash: { id: 'ASH', name: 'Ash Blossom & Joyous Spring', type: 'Tuner Monster' },
  'rainbow overdragon': { id: 'OVER', name: 'Rainbow Overdragon', type: 'Fusion Monster' },
};

describe('REST-API: Deck anlegen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findCard.mockImplementation(async (ref: string) => CARDS[ref.toLowerCase()] ?? null);
    prisma.deck.create.mockResolvedValue({ id: 'deck-1' });
  });

  it('löst Namen und Spitznamen auf und legt Extra-Deck-Karten ins Extra Deck', async () => {
    const result = await createDeckFromRequest('user-1', {
      name: 'Crystal Beast',
      main: [{ card: 'Crystal Bond', quantity: 3 }, 'ash', 'Rainbow Overdragon'],
    });
    expect(result).toEqual({ id: 'deck-1', matched: [{ ref: 'ash', name: CARDS.ash.name }] });
    expect(writeDeckCards).toHaveBeenCalledWith('deck-1', {
      MAIN: ['BOND', 'BOND', 'BOND', 'ASH'],
      EXTRA: ['OVER'],
      SIDE: [],
    });
  });

  it('legt nichts an, wenn Karten fehlen', async () => {
    const error = await createDeckFromRequest('user-1', {
      name: 'x',
      main: ['Crystal Bond', 'Gibt es nicht'],
    }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'NOT_POSSIBLE', details: { missing: ['Gibt es nicht'] } });
    expect(prisma.deck.create).not.toHaveBeenCalled();
  });
});
