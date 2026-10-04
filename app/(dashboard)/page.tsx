import { StartView } from '@/components/start/StartView';
import { listDeckOptions, listLibrary } from '@/server/actions/combo.actions';
import { startStress, startTable } from '@/server/actions/start.actions';

/** Startseite für angemeldete Nutzer (UX-Plan 5, UI-Plan 7.5.1): keine Marketing-Seite */
export default async function StartPage() {
  const [library, decks, table] = await Promise.all([
    listLibrary(),
    listDeckOptions(),
    startTable(),
  ]);
  const combos = (library.data?.entries ?? []).slice(0, 6);
  // Die Headline fragt „Wo stoppt dich …?“ und antwortet mit dem Stresstest der letzten Line
  const stress = combos[0] ? await startStress(combos[0].id) : [];
  return (
    <StartView
      combos={combos}
      stress={stress}
      table={table}
      cards={library.data?.cards ?? {}}
      decks={decks}
    />
  );
}
