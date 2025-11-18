"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n/hooks";
import { useDuelOperations } from "@/lib/hooks/use-duel-operations";
import { useDuelState } from "@/lib/hooks/use-duel-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/components/ui/dialog";
import { Button } from "@/components/components/ui/button";
import { Input } from "@/components/components/ui/input";
import { Label } from "@/components/components/ui/label";
import { Loader2 } from "lucide-react";
import type { DuelState } from "@/types/duel.types";

interface SaveDuelAsComboDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  duelState: DuelState;
}

/**
 * Dialog zum Speichern eines Duells als Combo
 */
export function SaveDuelAsComboDialog({
  open,
  onOpenChange,
  duelState,
}: SaveDuelAsComboDialogProps) {
  const { t } = useTranslation();
  const { convertDuelToCombo } = useDuelOperations({
    duelState,
    setDuelState: () => {}, // Nicht benötigt für diese Operation
    addHistoryEntry: () => {}, // Nicht benötigt für diese Operation
  });

  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      setError(t("combo.validation.titleRequired"));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await convertDuelToCombo(duelState, title.trim());
      onOpenChange(false);
      setTitle("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save combo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setTitle("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("duel.saveAsCombo")}</DialogTitle>
          <DialogDescription>
            {t("duel.saveAsComboDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="combo-title">{t("combo.title")}</Label>
            <Input
              id="combo-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("combo.titlePlaceholder")}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            {t("duel.saveAsComboInfo")}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !title.trim()}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("duel.saveAsCombo")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
