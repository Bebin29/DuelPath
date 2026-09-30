import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { AppHeader } from '@/components/common/AppHeader';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { CardSheetProvider } from '@/components/cards/CardSheet';
import { getSettings } from '@/server/actions/settings.actions';

/**
 * Verwaltungsseiten (Start, Combos, Decks): App-Kopfzeile und ein einziges <main>
 * mit Inhaltsbreite bis 1280 px (UI-Plan 6.1). Nur für angemeldete Nutzer.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/auth/signin');
  const settings = await getSettings();

  return (
    <SettingsProvider initial={settings}>
      <CardSheetProvider>
        <div className="flex min-h-dvh flex-col">
          <AppHeader />
          <main id="main" className="mx-auto w-full max-w-[1280px] flex-1 px-8 pb-16 pt-10">
            {children}
          </main>
        </div>
      </CardSheetProvider>
    </SettingsProvider>
  );
}
