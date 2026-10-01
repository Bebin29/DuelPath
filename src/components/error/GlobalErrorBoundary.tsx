'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { Home, RefreshCw } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';
import { StatusPage } from './StatusPage';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/hooks';

/** Globale Error Boundary im Root Layout; fängt alle Fehler ab und zeigt eine Seite in Stil D */
export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useTranslation();

  return (
    <ErrorBoundary
      context={{ component: 'Global' }}
      showDetails={process.env.NODE_ENV === 'development'}
      fallback={
        <StatusPage
          appName={t('common.appName')}
          code={t('common.error')}
          title={t('error.title')}
          text={t('error.global.description')}
          actions={
            <>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw />
                {t('error.reload')}
              </Button>
              <Button asChild variant="line">
                <Link href="/">
                  <Home />
                  {t('error.home')}
                </Link>
              </Button>
            </>
          }
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
}
