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

import { importDeckText } from '@/server/actions/deck.actions';

const YDK = (main: string[], extra: string[] = []) =>
  ['#created by EDOPro', '#main', ...main, '#extra', ...extra, '!side'].join('\n');

describe('importDeckText', () => {
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
    const result = await importDeckText(
      'deck-1',
      YDK(['14558127', '14558127', '014558127', '14558127', '99999999'], ['86066372'])
    );

    expect(result).toEqual({
      data: { imported: 4, missing: ['99999999'], matched: [], format: 'ydk' },
    });
    expect(prisma.deckCard.createMany.mock.calls[0][0].data).toEqual([
      { deckId: 'deck-1', cardId: 'ash', deckSection: 'MAIN', quantity: 3 },
      { deckId: 'deck-1', cardId: 'accesscode', deckSection: 'EXTRA', quantity: 1 },
    ]);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('liest ydke-Links', async () => {
    // Ash ×2 und eine unbekannte Karte im Main, Accesscode im Extra (struct.pack('<I'))
    const result = await importDeckText('deck-1', 'ydke://ryPeAK8j3gCjPGwA!xEQhBQ==!!');
    expect(result.data?.format).toBe('ydke');
    expect(prisma.deckCard.createMany.mock.calls[0][0].data).toEqual([
      { deckId: 'deck-1', cardId: 'ash', deckSection: 'MAIN', quantity: 2 },
      { deckId: 'deck-1', cardId: 'accesscode', deckSection: 'EXTRA', quantity: 1 },
    ]);
  });

  it('lehnt fremde Decks, Unsinn und zu große Listen ab, ohne zu schreiben', async () => {
    prisma.deck.findUnique.mockResolvedValue({ userId: 'someone-else' });
    expect(await importDeckText('deck-1', YDK(['14558127']))).toEqual({ error: 'Deck not found' });

    prisma.deck.findUnique.mockResolvedValue({ userId: 'user-1' });
    expect(await importDeckText('deck-1', YDK(['<script>']))).toEqual({ error: 'empty' });
    expect(await importDeckText('deck-1', 'ydke://AAA!!!')).toEqual({ error: 'invalidYdke' });
    expect(await importDeckText('deck-1', YDK(Array(101).fill('14558127')))).toEqual({
      error: 'tooMany',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
