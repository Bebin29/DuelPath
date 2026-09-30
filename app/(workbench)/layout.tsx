import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';

/**
 * Workbench: volle Fensterfläche ohne App-Kopfzeile (UI-Plan 6.1).
 * Die Kopfzeile der Workbench führt zurück zu den Combos.
 */
export default async function WorkbenchLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/auth/signin');

  return (
    <main id="main" className="h-dvh overflow-hidden bg-bg">
      {children}
    </main>
  );
}
