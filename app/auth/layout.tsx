'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/hooks';

/**
 * Anmeldeseiten ohne App-Navigation: Wortmarke, zentriertes Formular (Stil D). Kein „Zurück zur
 * Startseite“: Die Startseite verlangt eine Anmeldung und führte hierher zurück.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center font-display text-3xl leading-none text-ink pointer-coarse:min-h-10"
          >
            {t('common.appName')}
          </Link>
        </div>
        {children}
      </div>
    </main>
  );
}
