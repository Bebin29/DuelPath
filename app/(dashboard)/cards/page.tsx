import { CardLibrary } from '@/components/cards/CardLibrary';
import { getCardDetail } from '@/server/actions/card.actions';

/**
 * Nachschlagewerk für Karten (DUE-35). `?card=` lädt die Karte schon auf dem Server,
 * damit ein geteilter Link die Mechaniken sofort zeigt.
 */
export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    (Array.isArray(value) ? value[0] : value) ?? '';
  const cardId = first(params.card);
  const detail = cardId ? await getCardDetail(cardId) : null;

  return <CardLibrary initialQuery={first(params.q)} initialCard={detail?.data ?? null} />;
}
