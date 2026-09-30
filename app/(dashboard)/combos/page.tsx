import { ComboList } from '@/components/combo/ComboList';
import { listCombos } from '@/server/actions/combo.actions';

export default async function CombosPage() {
  const result = await listCombos();
  return <ComboList combos={result.data ?? []} />;
}
