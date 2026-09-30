import { StartView } from '@/components/start/StartView';
import { listCombos } from '@/server/actions/combo.actions';

/** Startseite für angemeldete Nutzer (UX-Plan 5, UI-Plan 7.5.1): keine Marketing-Seite */
export default async function StartPage() {
  const result = await listCombos();
  const combos = (result.data ?? []).slice(0, 6).map((c) => ({
    id: c.id,
    title: c.title,
    deckName: c.deckName,
    updatedAt: c.updatedAt.toISOString(),
  }));
  return <StartView combos={combos} />;
}
