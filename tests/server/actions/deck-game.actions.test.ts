import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { addDeckGame, deleteDeckGame } from '@/server/actions/deck-game.actions';
import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';

vi.mock('@/lib/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    deck: { findUnique: vi.fn() },
    deckGame: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  },
}));

const mockAuth = auth as unknown as Mock<() => Promise<unknown>>;
const mockPrisma = vi.mocked(prisma, true);

const uid = 'user-1';
const input = {
  sidePlanId: 'p1',
  matchup: 'Ryzeal',
  going: 'second',
  result: 'win',
  note: 'Brick nach dem Siden',
};
const row = {
  id: 'g1',
  deckId: 'deck-1',
  sidePlanId: 'p1',
  matchup: 'Ryzeal',
  going: 'second',
  result: 'win',
  note: 'Brick nach dem Siden',
  playedAt: new Date('2026-10-03T12:00:00.000Z'),
};

describe('addDeckGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: uid } });
    mockPrisma.deck.findUnique.mockResolvedValue({ userId: uid } as never);
    mockPrisma.deckGame.create.mockResolvedValue(row as never);
  });

  it('legt den Eintrag am Deck an und gibt ihn zurück', async () => {
    const result = await addDeckGame('deck-1', input);
    expect(mockPrisma.deckGame.create).toHaveBeenCalledWith({
      data: { deckId: 'deck-1', ...input },
    });
    expect(result.data).toEqual({
      id: 'g1',
      sidePlanId: 'p1',
      matchup: 'Ryzeal',
      going: 'second',
      result: 'win',
      note: 'Brick nach dem Siden',
      playedAt: '2026-10-03T12:00:00.000Z',
    });
  });

  it('schreibt nichts ohne Anmeldung', async () => {
    mockAuth.mockResolvedValue(null);
    expect((await addDeckGame('deck-1', input)).error).toBe('Unauthorized');
    expect(mockPrisma.deckGame.create).not.toHaveBeenCalled();
  });

  it('schreibt nichts an einem fremden Deck', async () => {
    mockPrisma.deck.findUnique.mockResolvedValue({ userId: 'wer-anders' } as never);
    expect((await addDeckGame('deck-1', input)).error).toBe('Not found');
    expect(mockPrisma.deckGame.create).not.toHaveBeenCalled();
  });

  it('lehnt ein unbekanntes Ergebnis ab', async () => {
    expect((await addDeckGame('deck-1', { ...input, result: 'scoop' })).data).toBeUndefined();
    expect(mockPrisma.deckGame.create).not.toHaveBeenCalled();
  });
});

describe('deleteDeckGame', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: uid } });
  });

  it('löscht einen eigenen Eintrag', async () => {
    mockPrisma.deckGame.findUnique.mockResolvedValue({ deck: { userId: uid } } as never);
    expect((await deleteDeckGame('g1')).data).toBe(true);
    expect(mockPrisma.deckGame.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
  });

  it('löscht keinen fremden Eintrag', async () => {
    mockPrisma.deckGame.findUnique.mockResolvedValue({ deck: { userId: 'wer-anders' } } as never);
    expect((await deleteDeckGame('g1')).error).toBe('Not found');
    expect(mockPrisma.deckGame.delete).not.toHaveBeenCalled();
  });
});
