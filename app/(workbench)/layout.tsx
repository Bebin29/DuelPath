import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { SettingsProvider } from '@/components/providers/SettingsProvider';
import { CardSheetProvider } from '@/components/cards/CardSheet';
import { getSettings } from '@/server/actions/settings.actions';

/**
 * Workbench: volle Fensterfläche ohne App-Kopfzeile (UI-Plan 6.1).
 * Die Kopfzeile der Workbench führt zurück zu den Combos.
 */
export default async function WorkbenchLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/auth/signin');
  const settings = await getSettings();

  return (
    <SettingsProvider initial={settings}>
      <CardSheetProvider>
        <main id="main" className="h-dvh overflow-hidden bg-bg">
          {children}
        </main>
      </CardSheetProvider>
    </SettingsProvider>
  );
}
