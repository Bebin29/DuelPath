import type { DuelState, DuelAction, DuelLogEntry } from '@/types/duel.types';

/**
 * Duel Logger Utility
 * Verwaltet das Logging von Duel-Aktionen und bietet Export-Funktionalitäten
 */

export class DuelLogger {
  private logs: DuelLogEntry[] = [];
  private maxLogs = 1000; // Maximale Anzahl Logs im Speicher

  /**
   * Fügt einen neuen Log-Eintrag hinzu
   */
  addLogEntry(state: DuelState, action: DuelAction): void {
    const logEntry: DuelLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      turn: state.turnCount,
      phase: state.phase,
      player: getPlayerFromAction(action),
      action,
      timestamp: Date.now(),
    };

    this.logs.push(logEntry);

    // Begrenze die Anzahl der Logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Gibt alle Log-Einträge zurück
   */
  getLogs(): DuelLogEntry[] {
    return [...this.logs];
  }

  /**
   * Filtert Logs nach verschiedenen Kriterien
   */
  filterLogs(filters: {
    turn?: number;
    phase?: string;
    player?: 'PLAYER' | 'OPPONENT';
    actionType?: string;
    searchTerm?: string;
  }): DuelLogEntry[] {
    return this.logs.filter((log) => {
      if (filters.turn !== undefined && log.turn !== filters.turn) return false;
      if (filters.phase && log.phase !== filters.phase) return false;
      if (filters.player && log.player !== filters.player) return false;
      if (filters.actionType && log.action.type !== filters.actionType) return false;
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const actionStr = formatActionForSearch(log.action).toLowerCase();
        if (!actionStr.includes(searchLower)) return false;
      }
      return true;
    });
  }

  /**
   * Gibt Logs für einen bestimmten Turn zurück
   */
  getLogsForTurn(turn: number): DuelLogEntry[] {
    return this.logs.filter((log) => log.turn === turn);
  }

  /**
   * Gibt Logs für eine bestimmte Phase zurück
   */
  getLogsForPhase(phase: string): DuelLogEntry[] {
    return this.logs.filter((log) => log.phase === phase);
  }

  /**
   * Exportiert Logs als JSON für Replays
   */
  exportAsJSON(): string {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      logs: this.logs,
    };
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Importiert Logs aus JSON
   */
  importFromJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.version && Array.isArray(data.logs)) {
        this.logs = data.logs.map((log: { timestamp: string; [key: string]: unknown }) => ({
          ...log,
          timestamp: new Date(log.timestamp).getTime(),
        }));
        return true;
      }
    } catch (error) {
      console.error('Failed to import logs:', error);
    }
    return false;
  }

  /**
   * Löscht alle Logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Gibt Statistiken über die Logs zurück
   */
  getStats() {
    const totalLogs = this.logs.length;
    const actionCounts = this.logs.reduce(
      (acc, log) => {
        acc[log.action.type] = (acc[log.action.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const playerCounts = this.logs.reduce(
      (acc, log) => {
        acc[log.player] = (acc[log.player] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalLogs,
      actionCounts,
      playerCounts,
      turnsCovered: new Set(this.logs.map((log) => log.turn)).size,
    };
  }
}

/**
 * Singleton-Instanz des DuelLoggers
 */
export const duelLogger = new DuelLogger();

/**
 * Hilfsfunktion: Ermittelt den Spieler aus einer Action
 */
function getPlayerFromAction(action: DuelAction): 'PLAYER' | 'OPPONENT' {
  switch (action.type) {
    case 'DRAW':
    case 'NORMAL_SUMMON':
    case 'SET_MONSTER':
    case 'ACTIVATE_SPELL':
    case 'SET_SPELL':
    case 'ATTACK':
      return action.player;
    case 'CHANGE_PHASE':
    case 'END_DUEL':
      return 'PLAYER'; // System-Actions werden dem Spieler zugeordnet
    default:
      return 'PLAYER';
  }
}

/**
 * Hilfsfunktion: Formatiert Action für Suche
 */
function formatActionForSearch(action: DuelAction): string {
  switch (action.type) {
    case 'DRAW':
      return `Draw ${action.count} cards`;
    case 'NORMAL_SUMMON':
      return `Normal Summon`;
    case 'SET_MONSTER':
      return `Set Monster`;
    case 'ACTIVATE_SPELL':
      return `Activate Spell`;
    case 'SET_SPELL':
      return `Set Spell`;
    case 'ATTACK':
      return action.target === 'LP' ? 'Attack LP' : 'Attack Monster';
    case 'CHANGE_PHASE':
      return `Change to ${action.nextPhase}`;
    case 'END_DUEL':
      return `End Duel - Winner: ${action.winner}`;
    default:
      return action.type;
  }
}

/**
 * Hook für Duel-Logging
 */
export function useDuelLogger() {
  return {
    logger: duelLogger,
    addLogEntry: (state: DuelState, action: DuelAction) => duelLogger.addLogEntry(state, action),
    getLogs: () => duelLogger.getLogs(),
    filterLogs: (filters: Record<string, unknown>) => duelLogger.filterLogs(filters),
    exportLogs: () => duelLogger.exportAsJSON(),
    importLogs: (json: string) => duelLogger.importFromJSON(json),
    clearLogs: () => duelLogger.clearLogs(),
    getStats: () => duelLogger.getStats(),
  };
}
