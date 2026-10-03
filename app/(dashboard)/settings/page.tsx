import { SettingsView } from '@/components/settings/SettingsView';
import { StapleSettings } from '@/components/settings/StapleSettings';
import { BreakerSettings } from '@/components/settings/BreakerSettings';
import { NicknameSettings } from '@/components/settings/NicknameSettings';
import { ApiTokenSettings } from '@/components/settings/ApiTokenSettings';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { listApiTokens } from '@/server/actions/api-token.actions';
import { getBreakerCards, getStaples } from '@/server/actions/combo.actions';
import { getSettings } from '@/server/actions/settings.actions';
import { DEFAULT_BREAKERS } from '@/lib/deck/roles';

export default async function SettingsPage() {
  const tokens = await listApiTokens();
  const staples = (await getStaples())
    .filter((s) => s.staple.side === 'opponent')
    .map((s) => ({ name: s.staple.name, card: s.card }));
  // Bilder und deutsche Namen für die gespeicherte Breaker-Liste; neu Hinzugefügtes bringt sie mit
  const settings = await getSettings();
  const breakerCards = await getBreakerCards(settings.breakers ?? DEFAULT_BREAKERS);
  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,720px)_180px] xl:justify-between xl:gap-16">
      <div className="min-w-0">
        <SettingsView />
        <StapleSettings staples={staples} />
        <BreakerSettings cards={breakerCards} />
        <NicknameSettings />
        <ApiTokenSettings initial={tokens.data ?? []} />
      </div>
      <aside className="hidden pt-24 xl:block">
        <SettingsNav />
      </aside>
    </div>
  );
}
