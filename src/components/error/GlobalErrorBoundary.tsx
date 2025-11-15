"use client";

import { type ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/components/ui/card";
import { Button } from "@/components/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { useTranslation } from "@/lib/i18n/hooks";
import Link from "next/link";

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Globale Error Boundary für die gesamte Anwendung
 * 
 * Sollte im Root Layout verwendet werden, um alle Fehler abzufangen
 */
export function GlobalErrorBoundary({ children }: GlobalErrorBoundaryProps) {
  const { t } = useTranslation();

  return (
    <ErrorBoundary
      context={{ component: "Global" }}
      showDetails={process.env.NODE_ENV === "development"}
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="border-destructive max-w-md w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                {t("error.title")}
              </CardTitle>
              <CardDescription>
                {t("error.global.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => window.location.reload()}
                  variant="default"
                >
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
            </CardContent>
          </Card>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

