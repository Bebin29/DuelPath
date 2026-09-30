import { StartView } from '@/components/start/StartView';
import { listDeckOptions, listLibrary } from '@/server/actions/combo.actions';

/** Startseite für angemeldete Nutzer (UX-Plan 5, UI-Plan 7.5.1): keine Marketing-Seite */
export default async function StartPage() {
  const [library, decks] = await Promise.all([listLibrary(), listDeckOptions()]);
  return (
    <StartView
      combos={(library.data?.entries ?? []).slice(0, 6)}
      cards={library.data?.cards ?? {}}
      decks={decks}
    />
  );
}
