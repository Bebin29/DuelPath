"use client";

import { type ReactNode } from "react";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { useTranslation } from "@/lib/i18n/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/components/ui/card";
import { Button } from "@/components/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";

interface DeckErrorBoundaryProps {
  children: ReactNode;
  deckId?: string;
}

/**
 * Spezialisierte Error Boundary für Deck-Editor
 * 
 * Wrapper um die generische ErrorBoundary mit Deck-spezifischem Kontext
 */
export function DeckErrorBoundary({ children, deckId }: DeckErrorBoundaryProps) {
  const { t } = useTranslation();

  return (
    <ErrorBoundary
      context={{ component: "DeckEditor", deckId }}
      resetOnPropsChange={true}
      showDetails={process.env.NODE_ENV === "development"}
      fallback={
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              {t("deck.errors.loadFailed")}
            </CardTitle>
            <CardDescription>
              {t("error.deck.description")}
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
              <Link href="/decks">
                <Button variant="outline">
                  {t("error.backToDecks")}
                </Button>
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

