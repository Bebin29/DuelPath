"use client";

import { useTranslation } from "@/lib/i18n/hooks";
import { ComboList } from "@/components/combo/ComboList";
import { CreateComboDialog } from "@/components/combo/CreateComboDialog";

/**
 * Übersichtsseite für Kombos
 */
export default function CombosPage() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t("navigation.combos")}</h1>
          <p className="text-muted-foreground">
            Erstelle und verwalte deine Kombos
          </p>
        </div>
        <CreateComboDialog />
      </div>

      <ComboList />
    </div>
  );
}




