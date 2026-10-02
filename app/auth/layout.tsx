'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';

/** Anmeldeseiten ohne App-Navigation: Wortmarke, Zurück, zentriertes Formular (Stil D) */
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
          <span className="flex-1" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-ink pointer-coarse:min-h-10"
          >
            <ArrowLeft className="size-4" />
            {t('auth.back')}
          </Link>
        </div>
        {children}
      </div>
    </main>
  );
}
