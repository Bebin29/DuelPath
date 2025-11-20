'use client';

import { type ReactNode, useState, useCallback } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/components/ui/card';
import { Button } from '@/components/components/ui/button';
import { AlertCircle, RefreshCw, Swords, Download, RotateCcw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import {
  useDuelErrorHandler,
  getRecoverySuggestion,
  type DuelError,
} from '@/lib/utils/error-handler';
import { useToast } from '@/components/components/ui/toast';

interface DuelErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Erweiterte Error Recovery Komponente
 */
function DuelErrorRecovery({
  error,
  resetError,
}: {
  error: Error & { duelError?: DuelError };
  resetError: () => void;
}) {
  const { t } = useTranslation();
  const { logError, exportErrors, getRecentErrors } = useDuelErrorHandler();
  const { addToast } = useToast();
  const [showDetails, setShowDetails] = useState(false);

  const recentErrors = getRecentErrors(3);
  const recoverySuggestion = error.duelError
    ? getRecoverySuggestion(error.duelError)
    : 'An unexpected error occurred. Please try reloading the page.';

  const handleExportLogs = useCallback(() => {
    try {
      const errorLogs = exportErrors();
      const blob = new Blob([errorLogs], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `duel-errors-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast({
        title: 'Success',
        description: 'Error logs exported successfully',
        variant: 'success',
      });
    } catch (exportError) {
      addToast({
        title: 'Error',
        description: 'Failed to export error logs',
        variant: 'error',
      });
    }
  }, [exportErrors]);

  const handleRetry = useCallback(() => {
    resetError();
    addToast({
      title: 'Recovery',
      description: 'Attempting to recover...',
      variant: 'info',
    });
  }, [resetError]);

  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  const handleBackToDashboard = useCallback(() => {
    window.location.href = '/';
  }, []);

  // Logge den Fehler
  if (error.duelError) {
    logError(error.duelError, {
      component: 'DuelErrorBoundary',
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="border-destructive max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            {t('duel.error.title')}
          </CardTitle>
          <CardDescription>{error.duelError?.message || error.message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recovery Suggestion */}
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-1">Suggested Recovery:</h4>
            <p className="text-sm text-muted-foreground">{recoverySuggestion}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRetry} variant="default">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Recovery
            </Button>
            <Button onClick={handleReload} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
            <Button onClick={handleBackToDashboard} variant="outline">
              <Swords className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            {process.env.NODE_ENV === 'development' && (
              <Button onClick={handleExportLogs} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Logs
              </Button>
            )}
          </div>

          {/* Recent Errors */}
          {recentErrors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Recent Errors:</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
                  {showDetails ? 'Hide' : 'Show'} Details
                </Button>
              </div>
              {showDetails && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {recentErrors.map((err, index) => (
                    <div key={index} className="text-xs p-2 bg-muted/50 rounded">
                      <div className="font-medium">{err.code}</div>
                      <div className="text-muted-foreground">{err.message}</div>
                      <div className="text-muted-foreground">
                        {new Date(err.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Help Text */}
          <div className="text-sm text-muted-foreground">{t('duel.error.help')}</div>

          {/* Technical Details (Development only) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Technical Details</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">{error.stack}</pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Spezifische Error Boundary für den Duellmodus
 *
 * Fängt Fehler im Duell ab und bietet Wiederherstellungsoptionen
 */
export function DuelErrorBoundary({ children }: DuelErrorBoundaryProps) {
  return (
    <ErrorBoundary
      context={{ component: 'Duel' }}
      showDetails={process.env.NODE_ENV === 'development'}
      fallback={({ error, resetError }) => (
        <DuelErrorRecovery error={error} resetError={resetError} />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
