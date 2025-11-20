'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useDuelState } from '@/lib/hooks/use-duel-state';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/components/ui/popover';
import { Button } from '@/components/components/ui/button';
import { Badge } from '@/components/components/ui/badge';
import { Separator } from '@/components/components/ui/separator';
import type { DuelAction } from '@/types/duel.types';

interface DuelActionMenuProps {
  cardInstanceId: string;
  children: React.ReactNode;
}

/**
 * Action-Menü für Karten im Duell
 * Zeigt verfügbare Aktionen für eine Karte an
 */
export function DuelActionMenu({ cardInstanceId, children }: DuelActionMenuProps) {
  const { t } = useTranslation();
  const { state, dispatchDuelAction, availableActions } = useDuelState();
  const [open, setOpen] = useState(false);

  if (!state) return null;

  const actions = availableActions(cardInstanceId);

  const handleActionSelect = (action: DuelAction) => {
    dispatchDuelAction(action);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">{t('duel.availableActions')}</h4>

          {actions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-2">{t('duel.noActionsAvailable')}</div>
          ) : (
            <div className="space-y-1">
              {actions.map((actionItem, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => handleActionSelect(actionItem.action)}
                  disabled={actionItem.disabled}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm">{t(actionItem.labelKey)}</span>
                    {actionItem.disabled && actionItem.reason && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        {actionItem.reason}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}

          <Separator />

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
