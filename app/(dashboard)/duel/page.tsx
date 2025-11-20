'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useDuelState } from '@/lib/hooks/use-duel-state';
import { getUserDecks } from '@/server/actions/deck.actions';
import { useToast } from '@/components/components/ui/toast';
import { DuelBoard } from '@/components/duel/DuelBoard';
import { DuelDeckSelectionDialog } from '@/components/duel/DuelDeckSelectionDialog';
import { DuelErrorBoundary } from '@/components/error/DuelErrorBoundary';
import { Button } from '@/components/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/components/ui/card';
import { Swords } from 'lucide-react';
import type { DuelDeck } from '@/types/duel.types';

/**
 * Duel-Modus Seite
 */
export default function DuelPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();

  // Error handler für Toast-Nachrichten
  const handleError = (message: string, type: 'error' | 'warning' | 'info' | 'success') => {
    addToast({
      title:
        type === 'error'
          ? 'Error'
          : type === 'warning'
            ? 'Warning'
            : type === 'success'
              ? 'Success'
              : 'Info',
      description: message,
      variant: type,
    });
  };

  const { state, dispatchDuelAction, startDuel, resetDuel, undo, redo, canUndo, canRedo } =
    useDuelState({ onError: handleError });
  const [showDeckSelection, setShowDeckSelection] = useState(false);
  const [isLoadingDecks, setIsLoadingDecks] = useState(false);

  /**
   * Startet Deck-Auswahl Dialog
   */
  const handleStartDuel = async () => {
    setIsLoadingDecks(true);
    const result = await getUserDecks();

    if (result.error) {
      console.error('Failed to load decks:', result.error);
      setIsLoadingDecks(false);
      return;
    }

    if (result.decks && result.decks.length > 0) {
      setShowDeckSelection(true);
    } else {
      // Keine Decks vorhanden
      console.warn('No decks available for duel');
    }

    setIsLoadingDecks(false);
  };

  /**
   * Callback wenn Deck ausgewählt wurde
   */
  const handleDeckSelected = (deck: DuelDeck) => {
    startDuel(deck);
    setShowDeckSelection(false);
  };

  return (
    <DuelErrorBoundary>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('navigation.duel')}</h1>
          <p className="text-muted-foreground">Teste deine Decks und Kombos im Duellmodus</p>
        </div>

        {state ? (
          // Duell läuft - zeige DuelBoard
          <DuelBoard
            duelState={state}
            onDispatchAction={dispatchDuelAction}
            onResetDuel={resetDuel}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        ) : (
          // Kein Duell aktiv - zeige Start-Screen
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Swords className="w-8 h-8 text-primary" />
                <div>
                  <CardTitle>{t('duel.startNewDuel')}</CardTitle>
                  <CardDescription>
                    Wähle ein Deck aus, um ein neues Duell zu starten
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="default" onClick={handleStartDuel} disabled={isLoadingDecks}>
                {isLoadingDecks ? t('common.loading') : t('duel.startDuel')}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Deck-Auswahl Dialog */}
        <DuelDeckSelectionDialog
          open={showDeckSelection}
          onOpenChange={setShowDeckSelection}
          onDeckSelected={handleDeckSelected}
        />
      </div>
    </DuelErrorBoundary>
  );
}
