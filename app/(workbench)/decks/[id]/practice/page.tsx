import { notFound } from 'next/navigation';
import { PracticeSession } from '@/components/practice/PracticeSession';
import { getStaples, listDeckOptions } from '@/server/actions/combo.actions';
import { getPracticeSetup } from '@/server/actions/practice.actions';

/** Übungsmodus eines Decks (Lücke L2): volle Fläche wie die Workbench, ohne App-Kopfzeile */
export default async function PracticeRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [setup, staples, decks] = await Promise.all([
    getPracticeSetup(id),
    getStaples(),
    listDeckOptions(),
  ]);
  if (!setup) notFound();
  return <PracticeSession setup={setup} staples={staples} decks={decks} />;
}
