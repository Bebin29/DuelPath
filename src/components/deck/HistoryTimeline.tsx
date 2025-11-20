'use client';

import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/components/ui/button';
import { ScrollArea } from '@/components/components/ui/scroll-area';
import { Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeckWithCards } from '@/lib/hooks/use-deck-history';

interface HistoryEntry {
  action: {
    type: string;
    cardId?: string;
    section?: string;
    fromSection?: string;
    toSection?: string;
    oldQuantity?: number;
    newQuantity?: number;
  };
  deckState: DeckWithCards;
  timestamp: number;
}

interface HistoryTimelineProps {
  history: HistoryEntry[];
  currentIndex: number;
  onJumpToHistory: (index: number) => void;
  maxHistorySize: number;
}

/**
 * History-Timeline-Komponente für Undo/Redo-Navigation
 */
export function HistoryTimeline({
  history,
  currentIndex,
  onJumpToHistory,
  maxHistorySize,
}: HistoryTimelineProps) {
  const { t } = useTranslation();

  const formatAction = useMemo(() => {
    return (action: HistoryEntry['action']): string => {
      switch (action.type) {
        case 'addCard':
          return t('deck.history.addCard', { section: action.section });
        case 'removeCard':
          return t('deck.history.removeCard', { section: action.section });
        case 'updateQuantity':
          return t('deck.history.updateQuantity', {
            old: action.oldQuantity,
            new: action.newQuantity,
          });
        case 'moveCard':
          return t('deck.history.moveCard', {
            from: action.fromSection,
            to: action.toSection,
          });
        default:
          return action.type;
      }
    };
  }, [t]);

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) {
      // Weniger als 1 Minute
      return t('common.justNow');
    } else if (diff < 3600000) {
      // Weniger als 1 Stunde
      const minutes = Math.floor(diff / 60000);
      return t('common.minutesAgo', { count: minutes });
    } else if (diff < 86400000) {
      // Weniger als 1 Tag
      const hours = Math.floor(diff / 3600000);
      return t('common.hoursAgo', { count: hours });
    } else {
      return date.toLocaleTimeString();
    }
  };

  if (history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        {t('deck.history.empty')}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[200px] w-full">
      <div className="space-y-1 pr-4">
        {/* Initial State */}
        <Button
          variant={currentIndex === -1 ? 'secondary' : 'ghost'}
          size="sm"
          className={cn(
            'w-full justify-start text-left h-auto py-2',
            currentIndex === -1 && 'bg-primary/10'
          )}
          onClick={() => onJumpToHistory(-1)}
        >
          <div className="flex items-center gap-2 w-full">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">{t('deck.history.initialState')}</div>
            </div>
          </div>
        </Button>

        {/* History Entries */}
        {history.map((entry, index) => {
          const isActive = index === currentIndex;
          return (
            <Button
              key={index}
              variant={isActive ? 'secondary' : 'ghost'}
              size="sm"
              className={cn(
                'w-full justify-start text-left h-auto py-2',
                isActive && 'bg-primary/10'
              )}
              onClick={() => onJumpToHistory(index)}
            >
              <div className="flex items-center gap-2 w-full">
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{formatAction(entry.action)}</div>
                  <div className="text-xs text-muted-foreground">{formatTime(entry.timestamp)}</div>
                </div>
              </div>
            </Button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
