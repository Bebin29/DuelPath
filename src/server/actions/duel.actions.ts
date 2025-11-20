'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';
import { createCombo } from './combo.actions';
import type { DuelState, DuelLogEntry } from '@/types/duel.types';
import type { CreateComboInput } from '@/lib/validations/combo.schema';

/**
 * Konvertiert einen Duel-Log in Combo-Schritte
 *
 * Filtert nur relevante Aktionen:
 * - NORMAL_SUMMON, SPECIAL_SUMMON, ACTIVATE_SPELL, SET_MONSTER
 * - Ignoriert Phase-Wechsel, Draws, Damage
 *
 * @param duelLog - Array von Duel-Log-Einträgen
 * @param title - Titel für die Combo
 * @param deckId - Optionale Deck-ID für Zuordnung
 * @returns Combo-Eingabe für createCombo
 */
function convertDuelLogToComboInput(
  duelLog: DuelLogEntry[],
  title: string,
  deckId?: string
): CreateComboInput {
  const relevantSteps: CreateComboInput['steps'] = [];

  // Filtere nur relevante Aktionen und sortiere nach Turn/Phase
  const relevantActions = duelLog
    .filter((entry) => {
      return ['NORMAL_SUMMON', 'SPECIAL_SUMMON', 'ACTIVATE_SPELL', 'SET_MONSTER'].includes(
        entry.action.type
      );
    })
    .sort((a, b) => {
      // Sortiere nach Turn, dann Phase, dann Timestamp
      if (a.turn !== b.turn) return a.turn - b.turn;
      const phaseOrder = ['DRAW', 'STANDBY', 'MAIN1', 'BATTLE', 'MAIN2', 'END'];
      const aPhaseIndex = phaseOrder.indexOf(a.phase);
      const bPhaseIndex = phaseOrder.indexOf(b.phase);
      if (aPhaseIndex !== bPhaseIndex) return aPhaseIndex - bPhaseIndex;
      return a.timestamp - b.timestamp;
    });

  // Konvertiere zu Combo-Steps
  relevantActions.forEach((entry, index) => {
    let description = '';
    let targetCardId: string | undefined;

    switch (entry.action.type) {
      case 'NORMAL_SUMMON':
        description = `Beschwöre ${entry.action.cardInstanceId} in Angriffsposition`;
        break;
      case 'SPECIAL_SUMMON':
        description = `Spezialbeschwöre ${entry.action.cardInstanceId}`;
        break;
      case 'ACTIVATE_SPELL':
        description = `Aktiviere Zauber ${entry.action.cardInstanceId}`;
        if (entry.action.targetZoneIndex !== undefined) {
          description += ` in Zone ${entry.action.targetZoneIndex}`;
        }
        break;
      case 'SET_MONSTER':
        description = `Setze Monster ${entry.action.cardInstanceId} in Verteidigungsposition`;
        break;
    }

    relevantSteps.push({
      cardId: entry.action.cardInstanceId, // Hier bräuchte es eigentlich die cardId, nicht instanceId
      actionType: entry.action.type as any, // Type assertion - eigentlich müsste das in combo.types erweitert werden
      description,
      targetCardId,
      order: index + 1,
    });
  });

  return {
    title,
    description: `Aus Duel konvertiert: ${relevantSteps.length} Schritte`,
    deckId,
    steps: relevantSteps,
  };
}

/**
 * Server Action: Konvertiert ein Duel zu einer Combo
 *
 * @param duelState - Vollständiger Duel-Zustand
 * @param title - Titel für die Combo
 * @param deckId - Optionale Deck-ID
 * @returns Erfolg oder Fehler
 */
export async function convertDuelToCombo(duelState: DuelState, title: string, deckId?: string) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Erstelle Combo aus Duel-State
    // TODO: Echter Duel-Log fehlt noch - für jetzt ein Platzhalter
    const mockDuelLog: DuelLogEntry[] = [
      // Hier würden echte Log-Einträge aus duelState kommen
      {
        id: '1',
        turn: 1,
        phase: 'MAIN1',
        player: 'PLAYER',
        action: {
          type: 'NORMAL_SUMMON',
          player: 'PLAYER',
          cardInstanceId: 'mock-card-id', // TODO: Richtige cardId verwenden
          targetZoneIndex: 0,
        },
        timestamp: Date.now(),
      },
    ];

    const comboInput = convertDuelLogToComboInput(mockDuelLog, title, deckId);

    // Erstelle Combo über bestehende Combo-Actions
    const result = await createCombo(comboInput);

    if ('error' in result) {
      return { error: result.error };
    }

    return { success: true, combo: result.combo };
  } catch (error) {
    console.error('convertDuelToCombo error:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to convert duel to combo',
    };
  }
}

/**
 * Server Action: Speichert ein Duel (für zukünftige Features)
 *
 * Aktuell nur Platzhalter - Duelle werden lokal gespeichert
 * Später könnte dies für Duel-Sharing oder Statistiken verwendet werden
 *
 * @param duelState - Duel-Zustand zum Speichern
 * @returns Erfolg oder Fehler
 */
export async function saveDuel(duelState: DuelState) {
  try {
    // Authentifizierung prüfen
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // TODO: Implementiere Duel-Speicherung in DB
    // Für jetzt nur Validierung und Platzhalter
    console.log('Saving duel:', duelState);

    return { success: true, message: 'Duel saved locally' };
  } catch (error) {
    console.error('saveDuel error:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to save duel',
    };
  }
}
