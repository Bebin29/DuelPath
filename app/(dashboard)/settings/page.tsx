import { SettingsView } from '@/components/settings/SettingsView';
import { StapleSettings } from '@/components/settings/StapleSettings';
import { getStaples } from '@/server/actions/combo.actions';

export default async function SettingsPage() {
  const staples = (await getStaples())
    .filter((s) => s.staple.side === 'opponent')
    .map((s) => ({ name: s.staple.name, card: s.card }));
  return (
    <>
      <SettingsView />
      <StapleSettings staples={staples} />
    </>
  );
}
