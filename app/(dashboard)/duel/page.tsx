"use client";

import { useTranslation } from "@/lib/i18n/hooks";
import { Button } from "@/components/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/components/ui/card";
import { Swords } from "lucide-react";

/**
 * Platzhalter-Seite für Duellmodus
 */
export default function DuelPage() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("navigation.duel")}</h1>
        <p className="text-muted-foreground">
          Teste deine Decks und Kombos im Duellmodus
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Swords className="w-8 h-8 text-primary" />
            <div>
              <CardTitle>{t("dashboard.emptyState.duels")}</CardTitle>
              <CardDescription>
                Starte dein erstes Duell, um zu beginnen
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="default" disabled>
            {t("duel.startDuel")} (Phase 4)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}





