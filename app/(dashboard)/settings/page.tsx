import { SettingsView } from '@/components/settings/SettingsView';
import { StapleSettings } from '@/components/settings/StapleSettings';
import { NicknameSettings } from '@/components/settings/NicknameSettings';
import { ApiTokenSettings } from '@/components/settings/ApiTokenSettings';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { listApiTokens } from '@/server/actions/api-token.actions';
import { getStaples } from '@/server/actions/combo.actions';

export default async function SettingsPage() {
  const tokens = await listApiTokens();
  const staples = (await getStaples())
    .filter((s) => s.staple.side === 'opponent')
    .map((s) => ({ name: s.staple.name, card: s.card }));
  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,720px)_180px] xl:justify-between xl:gap-16">
      <div className="min-w-0">
        <SettingsView />
        <StapleSettings staples={staples} />
        <NicknameSettings />
        <ApiTokenSettings initial={tokens.data ?? []} />
      </div>
      <aside className="hidden pt-24 xl:block">
        <SettingsNav />
      </aside>
    </div>
  );
}
