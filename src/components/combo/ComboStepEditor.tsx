'use client';

import { useState, useEffect, startTransition } from 'react';
import { useTranslation } from '@/lib/i18n/hooks';
import { CardSearch } from '@/components/deck/CardSearch';
import { Button } from '@/components/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/components/ui/dialog';
import { Label } from '@/components/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/components/ui/select';
import { Textarea } from '@/components/components/ui/textarea';
import type { ActionType } from '@/types/combo.types';
import type { CreateComboStepInput, UpdateComboStepInput } from '@/lib/validations/combo.schema';
import { useCardCache } from '@/lib/hooks/use-card-cache';

/**
 * Action-Type Labels
 */
const ACTION_TYPES: ActionType[] = [
  'SUMMON',
  'ACTIVATE',
  'SET',
  'ATTACK',
  'DRAW',
  'DISCARD',
  'SPECIAL_SUMMON',
  'TRIBUTE_SUMMON',
  'NORMAL_SUMMON',
  'FLIP_SUMMON',
  'OTHER',
];

interface ComboStepEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (step: CreateComboStepInput | UpdateComboStepInput) => void;
  initialStep?: {
    cardId: string;
    actionType: ActionType;
    description?: string | null;
    targetCardId?: string | null;
    order: number;
  };
  mode?: 'create' | 'edit';
}

/**
 * Dialog zum Bearbeiten eines Combo-Steps
 */
export function ComboStepEditor({
  open,
  onOpenChange,
  onSave,
  initialStep,
  mode = 'create',
}: ComboStepEditorProps) {
  const { t } = useTranslation();
  const { getCardData } = useCardCache();
  const [selectedCardId, setSelectedCardId] = useState<string>(initialStep?.cardId || '');
  const [actionType, setActionType] = useState<ActionType>(
    (initialStep?.actionType as ActionType) || 'OTHER'
  );
  const [description, setDescription] = useState<string>(initialStep?.description || '');
  const [targetCardId, setTargetCardId] = useState<string>(initialStep?.targetCardId || '');
  const [isLoadingCard, setIsLoadingCard] = useState(false);
  const [selectedCardName, setSelectedCardName] = useState<string>('');

  // Lade Kartenname wenn cardId gesetzt ist
  const loadCardData = useCallback(async () => {
    if (selectedCardId && selectedCardId !== '00000000') {
      try {
        const card = await getCardData(selectedCardId);
        if (card) {
          setSelectedCardName(card.name);
        }
      } catch (error) {
        console.error(error);
      }
    } else {
      setSelectedCardName('');
    }
  }, [selectedCardId, getCardData]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingCard(true);
      try {
        await loadCardData();
      } finally {
        setIsLoadingCard(false);
      }
    };

    if (selectedCardId && selectedCardId !== '00000000') {
      loadData();
    } else {
      setSelectedCardName('');
      setIsLoadingCard(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCardId, getCardData]);

  // Reset form when dialog opens/closes or initialStep changes
  const resetForm = useCallback(() => {
    startTransition(() => {
      if (initialStep) {
        setSelectedCardId(initialStep.cardId || '');
        setActionType((initialStep.actionType as ActionType) || 'OTHER');
        setDescription(initialStep.description || '');
        setTargetCardId(initialStep.targetCardId || '');
      } else {
        setSelectedCardId('');
        setActionType('OTHER');
        setDescription('');
        setTargetCardId('');
      }
    });
  }, [initialStep]);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  function handleCardSelect(cardId: string) {
    setSelectedCardId(cardId);
  }

  function handleSave() {
    if (!selectedCardId || selectedCardId === '00000000') {
      return; // Karte muss ausgewählt sein
    }

    const stepData: CreateComboStepInput | UpdateComboStepInput = {
      cardId: selectedCardId,
      actionType,
      description: description || undefined,
      targetCardId: targetCardId || undefined,
      order: initialStep?.order || 1,
    };

    onSave(stepData);
    onOpenChange(false);
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? t('combo.step.add') || 'Schritt hinzufügen'
              : t('combo.step.edit') || 'Schritt bearbeiten'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' ? t('combo.stepCreateDescription') : t('combo.stepEditDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Kartenauswahl */}
          <div className="space-y-2">
            <Label>{t('combo.step.card') || 'Karte'}</Label>
            {selectedCardId && selectedCardId !== '00000000' && (
              <div className="rounded-md border p-2 bg-muted/50">
                <p className="text-sm font-medium">
                  {isLoadingCard ? t('common.loading') : selectedCardName || selectedCardId}
                </p>
              </div>
            )}
            <CardSearch onCardSelect={handleCardSelect} showAddButton={false} />
          </div>

          {/* Aktionstyp */}
          <div className="space-y-2">
            <Label htmlFor="action-type">{t('combo.step.actionType') || 'Aktionstyp'}</Label>
            <Select
              value={actionType}
              onValueChange={(value) => setActionType(value as ActionType)}
            >
              <SelectTrigger id="action-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`combo.actionTypes.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Beschreibung */}
          <div className="space-y-2">
            <Label htmlFor="step-description">
              {t('combo.step.description') || 'Beschreibung'}
            </Label>
            <Textarea
              id="step-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('combo.stepDescriptionPlaceholder')}
              rows={3}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground">
              {t('combo.charactersCount', { count: description.length })}
            </p>
          </div>

          {/* Zielkarte (optional) */}
          <div className="space-y-2">
            <Label htmlFor="target-card">
              {t('combo.step.targetCard') || 'Zielkarte (Optional)'}
            </Label>
            <CardSearch onCardSelect={setTargetCardId} showAddButton={false} />
            {targetCardId && (
              <p className="text-xs text-muted-foreground">
                {t('combo.targetCardLabel', { cardId: targetCardId })}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!selectedCardId || selectedCardId === '00000000'}
          >
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
