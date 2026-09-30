// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const prisma = vi.hoisted(() => ({
  deck: { findUnique: vi.fn(), update: vi.fn() },
  card: { findMany: vi.fn() },
  deckCard: { deleteMany: vi.fn(), createMany: vi.fn() },
  $transaction: vi.fn(),
}));
const auth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/prisma/client', () => ({ prisma }));
vi.mock('@/lib/auth/auth', () => ({ auth }));

import { importYdkToDeck } from '@/server/actions/deck.actions';

describe('importYdkToDeck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: 'user-1' } });
    prisma.deck.findUnique.mockResolvedValue({ userId: 'user-1' });
    prisma.card.findMany.mockResolvedValue([
      { id: 'ash', passcode: '14558127' },
      { id: 'accesscode', passcode: '86066372' },
    ]);
  });

  it('zählt Kopien, begrenzt auf 3, normalisiert führende Nullen und meldet Unbekanntes', async () => {
    const result = await importYdkToDeck('deck-1', {
      main: ['14558127', '14558127', '014558127', '14558127', '99999999'],
      extra: ['86066372'],
      side: [],
    });

    expect(result).toEqual({ data: { imported: 4, missing: ['99999999'] } });
    expect(prisma.deckCard.createMany.mock.calls[0][0].data).toEqual([
      { deckId: 'deck-1', cardId: 'ash', deckSection: 'MAIN', quantity: 3 },
      { deckId: 'deck-1', cardId: 'accesscode', deckSection: 'EXTRA', quantity: 1 },
    ]);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('lehnt fremde Decks und ungültige Passcodes ab', async () => {
    prisma.deck.findUnique.mockResolvedValue({ userId: 'someone-else' });
    expect(await importYdkToDeck('deck-1', { main: [], extra: [], side: [] })).toEqual({
      error: 'Deck not found',
    });

    prisma.deck.findUnique.mockResolvedValue({ userId: 'user-1' });
    const bad = await importYdkToDeck('deck-1', { main: ['<script>'], extra: [], side: [] });
    expect(bad.error).toBeTruthy();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
