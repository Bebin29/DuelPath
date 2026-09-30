import { notFound } from 'next/navigation';
import { Workbench } from '@/components/workbench/Workbench';
import { getCombo, getStaples, listDeckOptions } from '@/server/actions/combo.actions';

export default async function ComboWorkbenchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string; step?: string }>;
}) {
  const [{ id }, { view, step }] = await Promise.all([params, searchParams]);
  const [result, staples, decks] = await Promise.all([
    getCombo(id),
    getStaples(),
    listDeckOptions(),
  ]);
  if (!result.data) notFound();
  return (
    <Workbench
      initial={result.data}
      staples={staples}
      decks={decks}
      initialView={view}
      initialStep={step}
    />
  );
}
