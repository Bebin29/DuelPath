"use client";

import { type ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/components/ui/card";
import { Button } from "@/components/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n/hooks";

interface CardSearchErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Spezialisierte Error Boundary für Card-Search
 */
export function CardSearchErrorBoundary({ children }: CardSearchErrorBoundaryProps) {
  const { t } = useTranslation();

  return (
    <ErrorBoundary
      context={{ component: "CardSearch" }}
      showDetails={process.env.NODE_ENV === "development"}
      fallback={
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {t("error.cardSearch.title")}
            </CardTitle>
            <CardDescription>
              {t("error.cardSearch.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => window.location.reload()}
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("error.reload")}
            </Button>
          </CardContent>
        </Card>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

