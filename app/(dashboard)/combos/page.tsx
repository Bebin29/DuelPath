import { ComboLibrary } from '@/components/library/ComboLibrary';
import { parseFilter } from '@/lib/combo/library';
import { listDeckOptions, listLibrary } from '@/server/actions/combo.actions';

export default async function CombosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, library, decks] = await Promise.all([
    searchParams,
    listLibrary(),
    listDeckOptions(),
  ]);
  return (
    <ComboLibrary
      entries={library.data?.entries ?? []}
      cards={library.data?.cards ?? {}}
      decks={decks}
      initialFilter={parseFilter(params)}
    />
  );
}
