import { notFound } from 'next/navigation';
import { ComboEditor } from '@/components/combo/ComboEditor';
import { getCombo, getStaples, listDeckOptions } from '@/server/actions/combo.actions';

export default async function ComboEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, staples, decks] = await Promise.all([
    getCombo(id),
    getStaples(),
    listDeckOptions(),
  ]);
  if (!result.data) notFound();
  return <ComboEditor initial={result.data} staples={staples} decks={decks} />;
}
