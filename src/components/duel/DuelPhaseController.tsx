"use client";

import { useTranslation } from "@/lib/i18n/hooks";
import { Button } from "@/components/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/components/ui/card";
import { Badge } from "@/components/components/ui/badge";
import { DuelPhase, PlayerId } from "@/types/duel.types";

interface DuelPhaseControllerProps {
  currentPhase: DuelPhase;
  turnPlayer: PlayerId;
  onPhaseChange: (nextPhase: DuelPhase) => void;
}

/**
 * Phase-Controller Komponente
 * Zeigt aktuelle Phase und erlaubt Phasenwechsel
 */
export function DuelPhaseController({
  currentPhase,
  turnPlayer,
  onPhaseChange,
}: DuelPhaseControllerProps) {
  const { t } = useTranslation();

  // Phasen in der richtigen Reihenfolge
  const phases: DuelPhase[] = ["DRAW", "STANDBY", "MAIN1", "BATTLE", "MAIN2", "END"];

  const currentIndex = phases.indexOf(currentPhase);
  const nextPhase = phases[(currentIndex + 1) % phases.length];

  const isPlayerTurn = turnPlayer === "PLAYER";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Phase</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aktuelle Phase */}
        <div className="text-center">
          <Badge
            variant={isPlayerTurn ? "default" : "secondary"}
            className="text-lg px-4 py-2"
          >
            {t(`duel.phase.${currentPhase}`)}
          </Badge>
          <div className="text-sm text-muted-foreground mt-1">
            {isPlayerTurn ? t("duel.yourTurn") : t("duel.opponentTurn")}
          </div>
        </div>

        {/* Nächste Phase Button */}
        <Button
          onClick={() => onPhaseChange(nextPhase)}
          className="w-full"
          variant="outline"
        >
          {t("duel.nextPhase")}: {t(`duel.phase.${nextPhase}`)}
        </Button>

        {/* Phasen-Übersicht */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {phases.map((phase, index) => (
            <div
              key={phase}
              className={`text-center p-2 rounded ${
                index === currentIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {t(`duel.phase.${phase}`)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
