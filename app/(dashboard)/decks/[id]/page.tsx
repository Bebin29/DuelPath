import { notFound } from 'next/navigation';
import { DeckPage } from '@/components/decks/DeckPage';
import { parseTab } from '@/lib/deck/deck-tab';
import { getDeckView } from '@/server/actions/deck-view.actions';
import { getStaples, listLibrary } from '@/server/actions/combo.actions';
import { getBanlists } from '@/server/actions/banlist.actions';

export default async function DeckRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const [deck, library, staples, banlists] = await Promise.all([
    getDeckView(id),
    listLibrary(id),
    getStaples(),
    getBanlists(),
  ]);
  if (!deck.data) notFound();
  return (
    <DeckPage
      deck={deck.data}
      combos={library.data?.entries ?? []}
      comboCards={library.data?.cards ?? {}}
      handtraps={staples.filter((s) => s.staple.side === 'opponent').map((s) => s.card.id)}
      staples={staples.map((s) => s.card.id)}
      banlists={banlists}
      initialTab={parseTab(tab)}
    />
  );
}
