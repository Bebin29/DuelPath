import { redirect } from 'next/navigation';
import { StartHandPicker } from '@/components/decks/StartHandPicker';
import { getDeckView } from '@/server/actions/deck-view.actions';
import { getStaples, listLibrary } from '@/server/actions/combo.actions';

/** Neue Combo mit Starthand aus einem Deck (UX-Plan 7.1); ohne Deck zurück zur Bibliothek */
export default async function NewComboPage({
  searchParams,
}: {
  searchParams: Promise<{ deck?: string }>;
}) {
  const { deck: deckId } = await searchParams;
  if (!deckId) redirect('/combos');
  const [deck, library, staples] = await Promise.all([
    getDeckView(deckId),
    listLibrary(deckId),
    getStaples(),
  ]);
  if (!deck.data) redirect('/combos');
  return (
    <StartHandPicker
      deck={deck.data}
      combos={library.data?.entries ?? []}
      handtraps={staples.filter((s) => s.staple.side === 'opponent').map((s) => s.card.id)}
    />
  );
}
