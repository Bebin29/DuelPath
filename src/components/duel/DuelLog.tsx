"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "@/lib/i18n/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/components/ui/card";
import { ScrollArea } from "@/components/components/ui/scroll-area";
import { Badge } from "@/components/components/ui/badge";
import { Button } from "@/components/components/ui/button";
import { Input } from "@/components/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/components/ui/select";
import { FileText, Search, Download, Filter } from "lucide-react";
import { useDuelLogger } from "@/lib/utils/duel.logger";
import type { DuelState, DuelAction, DuelLogEntry, DuelPhase } from "@/types/duel.types";

interface DuelLogProps {
  duelState: DuelState;
}

/**
 * Duell-Log Komponente
 * Zeigt alle Aktionen des Duells chronologisch an mit Filter- und Suchfunktionen
 */
export function DuelLog({ duelState }: DuelLogProps) {
  const { t } = useTranslation();
  const { getLogs, filterLogs, exportLogs } = useDuelLogger();

  // Filter-States
  const [searchTerm, setSearchTerm] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<string>("all");
  const [turnFilter, setTurnFilter] = useState<string>("all");
  const [playerFilter, setPlayerFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  // Alle verfügbaren Logs
  const allLogs = getLogs();

  // Gefilterte Logs basierend auf aktuellen Filtern
  const filteredLogs = useMemo(() => {
    const filters: any = {};

    if (searchTerm) filters.searchTerm = searchTerm;
    if (phaseFilter !== "all") filters.phase = phaseFilter;
    if (turnFilter !== "all") filters.turn = parseInt(turnFilter);
    if (playerFilter !== "all") filters.player = playerFilter;
    if (actionFilter !== "all") filters.actionType = actionFilter;

    return filterLogs(filters);
  }, [allLogs, searchTerm, phaseFilter, turnFilter, playerFilter, actionFilter, filterLogs]);

  // Verfügbare Optionen für Filter
  const availablePhases = useMemo(() => {
    const phases = new Set(allLogs.map(log => log.phase));
    return Array.from(phases);
  }, [allLogs]);

  const availableTurns = useMemo(() => {
    const turns = new Set(allLogs.map(log => log.turn));
    return Array.from(turns).sort((a, b) => a - b);
  }, [allLogs]);

  const availableActions = useMemo(() => {
    const actions = new Set(allLogs.map(log => log.action.type));
    return Array.from(actions);
  }, [allLogs]);

  const formatAction = (action: DuelAction): string => {
    switch (action.type) {
      case "DRAW":
        return `${t("duel.action.draw")} ${action.count}`;
      case "NORMAL_SUMMON":
        return t("duel.action.normalSummon");
      case "SET_MONSTER":
        return t("duel.action.setMonster");
      case "ACTIVATE_SPELL":
        return t("duel.action.activateSpell");
      case "SET_SPELL":
        return t("duel.action.setSpell");
      case "ATTACK":
        return action.target === "LP" ? t("duel.action.attackLp") : t("duel.action.attack");
      case "CHANGE_PHASE":
        return `${t("duel.action.changePhase")} ${t(`duel.phase.${action.nextPhase}`)}`;
      case "END_DUEL":
        return t("duel.action.endDuel");
      default:
        return t("duel.action.unknown");
    }
  };

  const handleExport = () => {
    const data = exportLogs();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `duel-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {t("duel.log")}
          <Badge variant="secondary" className="ml-auto">
            {filteredLogs.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter Controls */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleExport}
              title="Export as JSON"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Phase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Phases</SelectItem>
                {availablePhases.map((phase) => (
                  <SelectItem key={phase} value={phase}>
                    {t(`duel.phase.${phase}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={turnFilter} onValueChange={setTurnFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Turn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Turns</SelectItem>
                {availableTurns.map((turn) => (
                  <SelectItem key={turn} value={turn.toString()}>
                    Turn {turn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={playerFilter} onValueChange={setPlayerFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Player" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                <SelectItem value="PLAYER">{t("duel.you")}</SelectItem>
                <SelectItem value="OPPONENT">{t("duel.opponent")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {availableActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {formatAction({ type: action } as any)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Log Entries */}
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {allLogs.length === 0 ? t("duel.logEmpty") : "No matching entries"}
              </div>
            ) : (
              filteredLogs.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2 p-2 rounded bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <Badge variant="outline" className="text-xs shrink-0">
                    {t(`duel.phase.${entry.phase}`)}
                  </Badge>
                  <div className="flex-1 text-sm min-w-0">
                    <div className="text-muted-foreground text-xs">
                      Turn {entry.turn} • {entry.player === "PLAYER" ? t("duel.you") : t("duel.opponent")}
                    </div>
                    <div className="truncate">{formatAction(entry.action)}</div>
                    {entry.cardName && (
                      <div className="text-xs text-muted-foreground truncate">
                        {entry.cardName}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
