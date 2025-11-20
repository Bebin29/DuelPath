'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/hooks';
import { ComboStepItem } from './ComboStepItem';
import { Button } from '@/components/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/components/ui/dialog';
import { ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';
import type { ComboWithSteps } from '@/types/combo.types';
import { sortComboSteps } from '@/lib/utils/combo.utils';

interface ComboPlayModeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  combo: ComboWithSteps;
}

/**
 * Play-Mode für Kombos
 *
 * Ermöglicht schrittweises Abspielen einer Kombo
 */
export function ComboPlayMode({ open, onOpenChange, combo }: ComboPlayModeProps) {
  const { t } = useTranslation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Sortiere Steps nach order
  const sortedSteps = sortComboSteps(combo.steps);

  // Reset auf ersten Step wenn Dialog geöffnet wird
  useEffect(() => {
    if (open && currentStepIndex !== 0) {
      setCurrentStepIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const currentStep = sortedSteps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === sortedSteps.length - 1;
  const totalSteps = sortedSteps.length;

  function handlePrevious() {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  }

  function handleNext() {
    if (currentStepIndex < sortedSteps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  }

  function handleRestart() {
    setCurrentStepIndex(0);
  }

  function handleClose() {
    onOpenChange(false);
  }

  if (sortedSteps.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('combo.playMode.title')}</DialogTitle>
            <DialogDescription>{t('combo.noStepsInPlayMode')}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={handleClose}>{t('combo.playMode.close')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('combo.playMode.title')}</DialogTitle>
          <DialogDescription>
            {t('combo.playMode.stepOf', {
              current: currentStepIndex + 1,
              total: totalSteps,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Aktueller Step */}
          {currentStep && (
            <div className="rounded-lg border-2 border-primary p-4 bg-primary/5">
              <ComboStepItem
                step={currentStep}
                stepNumber={currentStepIndex + 1}
                showDragHandle={false}
                isDragging={false}
              />
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrevious} disabled={isFirstStep}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                {t('combo.playMode.previousStep')}
              </Button>
              <Button variant="outline" onClick={handleRestart} disabled={isFirstStep}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('combo.playMode.restart')}
              </Button>
            </div>

            <div className="flex-1 text-center">
              <p className="text-sm text-muted-foreground">
                {t('combo.playMode.stepOf', {
                  current: currentStepIndex + 1,
                  total: totalSteps,
                })}
              </p>
            </div>

            <div className="flex gap-2">
              {isLastStep ? (
                <div className="rounded-md bg-green-500/10 p-2 text-green-600 text-sm font-medium">
                  {t('combo.playMode.completed')}
                </div>
              ) : (
                <Button variant="default" onClick={handleNext} disabled={isLastStep}>
                  {t('combo.playMode.nextStep')}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Step-Indikatoren (optional) */}
          <div className="flex gap-2 justify-center flex-wrap">
            {sortedSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStepIndex(index)}
                className={`h-2 rounded-full transition-all ${
                  index === currentStepIndex
                    ? 'w-8 bg-primary'
                    : 'w-2 bg-muted hover:bg-muted-foreground/50'
                }`}
                aria-label={t('combo.goToStep', { number: index + 1 })}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" />
            {t('combo.playMode.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
