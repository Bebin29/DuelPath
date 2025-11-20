'use client';

import React, { useState, useRef, useCallback } from 'react';
import type { DuelState, DuelAction } from '@/types/duel.types';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { useTranslation } from '@/lib/i18n/hooks';
import { useToast } from '@/components/components/ui/toast';
import { useResponsiveLayout } from '@/lib/hooks/use-responsive-layout';
import { useTouchGestures } from '@/lib/hooks/use-touch-gestures';
import { useDuelDragDrop } from '@/lib/hooks/use-duel-drag-drop';
import { DndContext } from '@dnd-kit/core';
import { DuelField } from './DuelField';
import { DuelHand } from './DuelHand';
import { DuelPhaseController } from './DuelPhaseController';
import { DuelLifePoints } from './DuelLifePoints';
import { DuelLog } from './DuelLog';
import { SaveDuelAsComboDialog } from './SaveDuelAsComboDialog';
import { Button } from '@/components/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/components/ui/sheet';
import { Save, Undo, Redo, Menu, ChevronLeft, ChevronRight } from 'lucide-react';

interface DuelBoardProps {
  duelState: DuelState;
  onDispatchAction: (action: DuelAction) => void;
  onResetDuel: () => void;
  onUndo: () => DuelState | null;
  onRedo: () => DuelState | null;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Haupt-Duell-Board Komponente
 *
 * Layout:
 * - Oben: Gegnerisches Feld (gedreht)
 * - Mitte: Spieler-Feld
 * - Unten: Spieler-Hand
 * - Rechts: Phase-Controller, LP, Log
 */
export function DuelBoard({
  duelState,
  onDispatchAction,
  onResetDuel,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: DuelBoardProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { adaptiveSizes, isMobile, isTablet } = useResponsiveLayout();

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

  // Verwende Props statt Hook
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const duelBoardRef = useRef<HTMLDivElement>(null);

  // Drag & Drop Handler
  const { handleDragStart, handleDragOver, handleDragEnd } = useDuelDragDrop();

  // History wird jetzt über useDuelState verwaltet

  // Touch-Gesten für mobile Phasenwechsel
  const handleSwipeLeft = useCallback(() => {
    if (duelState && isMobile) {
      const phaseOrder = ['DRAW', 'STANDBY', 'MAIN1', 'BATTLE', 'MAIN2', 'END'];
      const currentIndex = phaseOrder.indexOf(duelState.phase);
      const nextPhase = phaseOrder[(currentIndex + 1) % phaseOrder.length];
      onDispatchAction({ type: 'CHANGE_PHASE', nextPhase });
    }
  }, [duelState, isMobile, onDispatchAction]);

  const handleSwipeRight = useCallback(() => {
    if (duelState && isMobile) {
      const phaseOrder = ['DRAW', 'STANDBY', 'MAIN1', 'BATTLE', 'MAIN2', 'END'];
      const currentIndex = phaseOrder.indexOf(duelState.phase);
      const prevIndex = currentIndex === 0 ? phaseOrder.length - 1 : currentIndex - 1;
      const prevPhase = phaseOrder[prevIndex];
      onDispatchAction({ type: 'CHANGE_PHASE', nextPhase: prevPhase });
    }
  }, [duelState, isMobile, onDispatchAction]);

  // Touch-Gesten Setup
  const { attachListeners } = useTouchGestures({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
  });

  // Keyboard Shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      // Space: Nächste Phase
      {
        key: ' ',
        handler: (e) => {
          e.preventDefault();
          if (duelState) {
            const phaseOrder = ['DRAW', 'STANDBY', 'MAIN1', 'BATTLE', 'MAIN2', 'END'];
            const currentIndex = phaseOrder.indexOf(duelState.phase);
            const nextPhase = phaseOrder[(currentIndex + 1) % phaseOrder.length];
            onDispatchAction({ type: 'CHANGE_PHASE', nextPhase });
          }
        },
        description: 'Nächste Phase',
      },
      // Ctrl+Z: Undo
      {
        key: 'z',
        ctrl: true,
        handler: (e) => {
          e.preventDefault();
          if (canUndo) {
            onUndo();
          }
        },
        description: 'Rückgängig',
      },
      // Ctrl+Y oder Ctrl+Shift+Z: Redo
      {
        key: 'y',
        ctrl: true,
        handler: (e) => {
          e.preventDefault();
          if (canRedo) {
            onRedo();
          }
        },
        description: 'Wiederholen',
      },
      {
        key: 'z',
        ctrl: true,
        shift: true,
        handler: (e) => {
          e.preventDefault();
          if (canRedo) {
            onRedo();
          }
        },
        description: 'Wiederholen',
      },
      // Escape: Menüs schließen (wird von ActionMenu behandelt)
      {
        key: 'Escape',
        handler: () => {
          // TODO: ActionMenu schließen
        },
        description: 'Menü schließen',
      },
    ],
  });

  if (!duelState) {
    return (
      <div className="text-center py-8">
        <p>Kein Duell aktiv</p>
      </div>
    );
  }

  // Touch-Gesten an das Board-Element anhängen
  const cleanup = attachListeners(duelBoardRef.current);

  // Cleanup beim Unmount
  React.useEffect(() => cleanup, [cleanup]);

  const mainContent = (
    <div className="space-y-4">
      {/* Gegnerisches Feld (oben) */}
      <div className="transform rotate-180">
        <DuelField
          player="OPPONENT"
          monsterZone={duelState.opponent.monsterZone}
          spellTrapZone={duelState.opponent.spellTrapZone}
          graveyard={duelState.opponent.graveyard}
          deck={duelState.opponent.deck}
          extraDeck={duelState.opponent.extraDeck}
          fieldSpell={duelState.opponent.fieldSpell}
          readonly={true} // Gegner ist passiv in 4A
        />
      </div>

      {/* Spielfeld-Trennung */}
      <div className="border-t-2 border-dashed border-muted my-8"></div>

      {/* Spieler-Feld (mitte) */}
      <DuelField
        player="PLAYER"
        monsterZone={duelState.player.monsterZone}
        spellTrapZone={duelState.player.spellTrapZone}
        graveyard={duelState.player.graveyard}
        deck={duelState.player.deck}
        extraDeck={duelState.player.extraDeck}
        fieldSpell={duelState.player.fieldSpell}
        readonly={false}
      />

      {/* Spieler-Hand (unten) */}
      <DuelHand hand={duelState.player.hand} />

      {/* Desktop Layout: Direkte Seitenleiste */}
      {!isMobile && !isTablet && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
          <div className="lg:col-span-1">
            <DuelPhaseController
              currentPhase={duelState.phase}
              turnPlayer={duelState.turnPlayer}
              onPhaseChange={(nextPhase) => onDispatchAction({ type: 'CHANGE_PHASE', nextPhase })}
            />
          </div>

          <div className="lg:col-span-1">
            <DuelLifePoints
              playerLp={duelState.player.lp}
              opponentLp={duelState.opponent.lp}
              winner={duelState.winner}
            />
          </div>

          <div className="lg:col-span-1">
            <DuelLog duelState={duelState} />
          </div>
        </div>
      )}
    </div>
  );

  const sidebarContent = (
    <div className="space-y-4 p-4">
      <DuelPhaseController
        currentPhase={duelState.phase}
        turnPlayer={duelState.turnPlayer}
        onPhaseChange={(nextPhase) => onDispatchAction({ type: 'CHANGE_PHASE', nextPhase })}
      />

      <DuelLifePoints
        playerLp={duelState.player.lp}
        opponentLp={duelState.opponent.lp}
        winner={duelState.winner}
      />

      <DuelLog duelState={duelState} />
    </div>
  );

  return (
    <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div ref={duelBoardRef} className="w-full">
        {/* Touch-Hinweis für mobile Geräte */}
        {isMobile && (
          <div className="text-center text-xs text-muted-foreground mb-2">
            👈 Swipe left/right to change phases • Drag cards to zones
          </div>
        )}

        <div className="flex gap-4">
          {/* Hauptspielfeld */}
          <div className="flex-1">
            {mainContent}

            {/* Action Buttons - nur bei Desktop */}
            {!isMobile && !isTablet && (
              <div className="flex justify-center gap-4 mt-6">
                <Button
                  onClick={onUndo}
                  disabled={!canUndo}
                  variant="outline"
                  className="flex items-center gap-2"
                  title="Rückgängig (Ctrl+Z)"
                >
                  <Undo className="w-4 h-4" />
                  {t('common.undo')}
                </Button>

                <Button
                  onClick={onRedo}
                  disabled={!canRedo}
                  variant="outline"
                  className="flex items-center gap-2"
                  title="Wiederholen (Ctrl+Y)"
                >
                  <Redo className="w-4 h-4" />
                  {t('common.redo')}
                </Button>

                <Button
                  onClick={() => setShowSaveDialog(true)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {t('duel.saveAsCombo')}
                </Button>
              </div>
            )}
          </div>

          {/* Mobile/Tablet Sidebar */}
          {(isMobile || isTablet) && (
            <div className="flex flex-col">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="self-start mb-4"
                    title="Open game info"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>Game Information</SheetTitle>
                  </SheetHeader>
                  {sidebarContent}
                </SheetContent>
              </Sheet>

              {/* Mobile Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={onUndo}
                  disabled={!canUndo}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  title="Rückgängig (Ctrl+Z)"
                >
                  <Undo className="w-4 h-4" />
                  {t('common.undo')}
                </Button>

                <Button
                  onClick={onRedo}
                  disabled={!canRedo}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  title="Wiederholen (Ctrl+Y)"
                >
                  <Redo className="w-4 h-4" />
                  {t('common.redo')}
                </Button>

                <Button
                  onClick={() => setShowSaveDialog(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {t('duel.saveAsCombo')}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Save as Combo Dialog */}
        {duelState && (
          <SaveDuelAsComboDialog
            open={showSaveDialog}
            onOpenChange={setShowSaveDialog}
            duelState={duelState}
          />
        )}
      </div>
    </DndContext>
  );
}
