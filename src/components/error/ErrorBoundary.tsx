"use client";

import { Component, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/components/ui/card";
import { Button } from "@/components/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { logError, getErrorMessage, isRetryableError } from "@/lib/utils/error-logger";
import { useTranslation } from "@/lib/i18n/hooks";
import Link from "next/link";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, resetError: () => void) => ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  context?: Record<string, unknown>;
  showDetails?: boolean;
  resetOnPropsChange?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

/**
 * Basis Error Boundary Komponente
 * 
 * Fängt Fehler in der Komponenten-Hierarchie ab und zeigt eine Fallback-UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    // Logging
    logError(error, {
      component: this.constructor.name,
      ...this.props.context,
      componentStack: errorInfo.componentStack,
    });

    // Custom Error Handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset bei Props-Änderung (z.B. wenn sich deckId ändert)
    if (
      this.props.resetOnPropsChange &&
      this.state.hasError &&
      JSON.stringify(prevProps.context) !== JSON.stringify(this.props.context)
    ) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount(): void {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          const error = this.state.error || new Error('An unknown error occurred');
          return this.props.fallback({ error, resetError: this.resetErrorBoundary });
        }
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.resetErrorBoundary}
          onReload={this.handleReload}
          showDetails={this.props.showDetails}
          retryCount={this.state.retryCount}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  onReset: () => void;
  onReload: () => void;
  showDetails?: boolean;
  retryCount: number;
}

/**
 * Fallback-UI für Fehler
 */
function ErrorFallback({ error, errorInfo, onReset, onReload, showDetails = false, retryCount }: ErrorFallbackProps) {
  const { t } = useTranslation();
  const canRetry = error && isRetryableError(error);
  const errorMessage = error ? getErrorMessage(error, t("common.error")) : t("common.error");

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          {t("error.title")}
        </CardTitle>
        <CardDescription>{errorMessage}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDetails && error && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <p className="font-mono text-xs break-all">{error.message}</p>
            {error.stack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">Stack Trace</summary>
                <pre className="mt-2 text-xs overflow-auto max-h-40">{error.stack}</pre>
              </details>
            )}
            {errorInfo?.componentStack && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted-foreground">Component Stack</summary>
                <pre className="mt-2 text-xs overflow-auto max-h-40 whitespace-pre-wrap">{errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {canRetry && retryCount < 3 && (
            <Button onClick={onReset} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("error.retry")}
            </Button>
          )}
          <Button onClick={onReload} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("error.reload")}
          </Button>
          <Link href="/">
            <Button variant="outline">
              <Home className="h-4 w-4 mr-2" />
              {t("error.home")}
            </Button>
          </Link>
        </div>

        {retryCount >= 3 && (
          <p className="text-sm text-muted-foreground">
            {t("error.maxRetries")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

