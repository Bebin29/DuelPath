"use client";

import { useTranslation } from "@/lib/i18n/hooks";
import { Button } from "@/components/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/components/ui/card";
import { Zap } from "lucide-react";

/**
 * Platzhalter-Seite für Kombo-Editor
 */
export default function CombosPage() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t("navigation.combos")}</h1>
        <p className="text-muted-foreground">
          Erstelle und verwalte deine Kombos
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            <div>
              <CardTitle>{t("dashboard.emptyState.combos")}</CardTitle>
              <CardDescription>
                Erstelle deine erste Kombo, um zu beginnen
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="default" disabled>
            {t("combo.createCombo")} (Phase 3)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}




