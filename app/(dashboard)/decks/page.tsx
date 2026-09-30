import { DeckOverview } from '@/components/decks/DeckOverview';
import { listDeckSummaries } from '@/server/actions/deck-view.actions';

export default async function DecksPage() {
  const result = await listDeckSummaries();
  return <DeckOverview decks={result.data ?? []} />;
}
