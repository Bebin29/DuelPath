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
  searchParams: Promise<{ tab?: string; missing?: string; missingCount?: string }>;
}) {
  const [{ id }, { tab, missing, missingCount }] = await Promise.all([params, searchParams]);
  // Aus der Deckübersicht importiert: was fehlte, kommt über die Adresse (Werte vom Client, gekappt)
  const count = Math.min(Math.max(0, Number(missingCount) || 0), 200);
  const imported = count
    ? {
        missing: (missing ?? '')
          .split('\n')
          .slice(0, 3)
          .map((n) => n.slice(0, 80)),
        missingCount: count,
        matched: 0,
      }
    : undefined;
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
      imported={imported}
    />
  );
}
