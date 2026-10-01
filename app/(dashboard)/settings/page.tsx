import { SettingsView } from '@/components/settings/SettingsView';
import { StapleSettings } from '@/components/settings/StapleSettings';
import { NicknameSettings } from '@/components/settings/NicknameSettings';
import { ApiTokenSettings } from '@/components/settings/ApiTokenSettings';
import { listApiTokens } from '@/server/actions/api-token.actions';
import { getStaples } from '@/server/actions/combo.actions';

export default async function SettingsPage() {
  const tokens = await listApiTokens();
  const staples = (await getStaples())
    .filter((s) => s.staple.side === 'opponent')
    .map((s) => ({ name: s.staple.name, card: s.card }));
  return (
    <>
      <SettingsView />
      <StapleSettings staples={staples} />
      <NicknameSettings />
      <ApiTokenSettings initial={tokens.data ?? []} />
    </>
  );
}
