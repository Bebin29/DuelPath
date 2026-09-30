// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma/client', () => ({ prisma: {} }));

import { mapCard, type YGOPRODeckCard } from '@/server/services/card-import.service';

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

  it('überspringt Karten ohne TCG-Release', () => {
    expect(mapCard({ ...ASH, misc_info: [{}] })).toBeNull();
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
