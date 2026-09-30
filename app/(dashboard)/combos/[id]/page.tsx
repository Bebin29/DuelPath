import { notFound } from 'next/navigation';
import { ComboEditor } from '@/components/combo/ComboEditor';
import { getCombo, getStaples } from '@/server/actions/combo.actions';

export default async function ComboEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, staples] = await Promise.all([getCombo(id), getStaples()]);
  if (!result.data) notFound();
  return <ComboEditor initial={result.data} staples={staples} />;
}
