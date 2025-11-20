'use client';

import { type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { useTranslation } from '@/lib/i18n/hooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/components/ui/card';
import { Button } from '@/components/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface ComboErrorBoundaryProps {
  children: ReactNode;
  comboId?: string;
}

/**
 * Spezialisierte Error Boundary für Combo-Editor
 *
 * Wrapper um die generische ErrorBoundary mit Combo-spezifischem Kontext
 */
export function ComboErrorBoundary({ children, comboId }: ComboErrorBoundaryProps) {
  const { t } = useTranslation();

  return (
    <ErrorBoundary
      context={{ component: 'ComboEditor', comboId }}
      resetOnPropsChange={true}
      showDetails={process.env.NODE_ENV === 'development'}
      fallback={
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {t('combo.errors.loadFailed') || 'Fehler beim Laden der Kombo'}
            </CardTitle>
            <CardDescription>
              {t('error.combo.description') ||
                'Die Kombo konnte nicht geladen werden. Bitte versuche es erneut.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => window.location.reload()} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('error.reload') || 'Neu laden'}
              </Button>
              <Link href="/combos">
                <Button variant="outline">{t('error.backToCombos') || 'Zurück zu Kombos'}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
