'use client';

import { useState, useEffect, useOptimistic, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/hooks';
import { useDeckHistory } from '@/lib/hooks/use-deck-history';
import { useDeckOperations } from '@/lib/hooks/use-deck-operations';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import { getDeckById } from '@/server/actions/deck.actions';
import { CardSearch } from './CardSearch';
import { CardSearchErrorBoundary } from '@/components/error/CardSearchErrorBoundary';
import { DeckListSection } from './DeckListSection';
import { validateDeckSizes } from '@/lib/validations/deck.schema';
import type { DeckSection } from '@/lib/validations/deck.schema';
import type { Card } from '@prisma/client';
import {
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  History,
  Download,
  Upload,
  Trash2,
  Move,
} from 'lucide-react';
import { HistoryTimeline } from './HistoryTimeline';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/components/ui/popover';
import Image from 'next/image';
import { useToast } from '@/components/components/ui/toast';
import { Button } from '@/components/components/ui/button';
import { Input } from '@/components/components/ui/input';
import { Skeleton } from '@/components/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/components/ui/select';
import type { DeckWithCards, CardForDeck } from '@/lib/hooks/use-deck-history';
import { useCardCache } from '@/lib/hooks/use-card-cache';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { useDeckCardHandlers } from '@/lib/hooks/use-deck-card-handlers';
import { MAX_CARD_COPIES, DRAG_ACTIVATION_DISTANCE } from '@/lib/constants/deck.constants';
import { createYDKContent, parseYDKFile, downloadFile, findDeckCard } from '@/lib/utils/deck.utils';

interface DeckEditorProps {
  deckId: string;
}

type OptimisticAction =
  | { type: 'addCard'; cardId: string; section: DeckSection; card: CardForDeck }
  | { type: 'updateQuantity'; cardId: string; section: DeckSection; quantity: number }
  | { type: 'removeCard'; cardId: string; section: DeckSection }
  | { type: 'moveCard'; cardId: string; fromSection: DeckSection; toSection: DeckSection };

/**
 * Deck-Editor mit Kartensuche und Deckliste
 */
export function DeckEditor({ deckId }: DeckEditorProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();
  const [deck, setDeck] = useState<DeckWithCards | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<CardForDeck | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());

  // Deck-Suche und Sortierung (muss vor allen bedingten Returns sein)
  const [deckSearchQuery, setDeckSearchQuery] = useState('');
  const [deckSortBy, setDeckSortBy] = useState<'name' | 'type' | 'level' | 'atk' | 'def'>('name');
  const [deckSortOrder, setDeckSortOrder] = useState<'asc' | 'desc'>('asc');

  // Undo/Redo History (anpassbares Limit)
  const [historyLimit, setHistoryLimit] = useState(50);
  const {
    currentDeck: historyDeck,
    history,
    historyIndex,
    maxHistorySize,
    addHistoryEntry,
    undo: undoHistory,
    redo: redoHistory,
    jumpToHistory,
    canUndo,
    canRedo,
    resetHistory,
  } = useDeckHistory(deck, historyLimit);

  // Sync history when deck changes from server
  useEffect(() => {
    if (deck && deck !== historyDeck) {
      resetHistory(deck);
    }
  }, [deck, historyDeck, resetHistory]);

  // Optimistic updates für Deck-Karten
  const [optimisticDeck, updateOptimisticDeck] = useOptimistic(
    historyDeck,
    (currentDeck: DeckWithCards | null, action: OptimisticAction): DeckWithCards | null => {
      if (!currentDeck) return currentDeck;

      switch (action.type) {
        case 'addCard': {
          const { cardId, section, card } = action;
          const existingDeckCard = currentDeck.deckCards.find(
            (dc) => dc.cardId === cardId && dc.deckSection === section
          );

          if (existingDeckCard) {
            // Erhöhe Anzahl
            return {
              ...currentDeck,
              deckCards: currentDeck.deckCards.map((dc) =>
                dc.cardId === cardId && dc.deckSection === section
                  ? { ...dc, quantity: Math.min(dc.quantity + 1, 3) }
                  : dc
              ),
            };
          } else {
            // Neue Karte hinzufügen
            const newDeckCard = {
              id: `temp-${Date.now()}`,
              deckId: currentDeck.id,
              cardId,
              quantity: 1,
              deckSection: section,
              card,
            };
            return {
              ...currentDeck,
              deckCards: [...currentDeck.deckCards, newDeckCard],
            };
          }
        }
        case 'updateQuantity': {
          const { cardId, section, quantity } = action;
          return {
            ...currentDeck,
            deckCards: currentDeck.deckCards.map((dc) =>
              dc.cardId === cardId && dc.deckSection === section ? { ...dc, quantity } : dc
            ),
          };
        }
        case 'removeCard': {
          const { cardId, section } = action;
          return {
            ...currentDeck,
            deckCards: currentDeck.deckCards.filter(
              (dc) => !(dc.cardId === cardId && dc.deckSection === section)
            ),
          };
        }
        case 'moveCard': {
          const { cardId, fromSection, toSection } = action;
          return {
            ...currentDeck,
            deckCards: currentDeck.deckCards.map((dc) =>
              dc.cardId === cardId && dc.deckSection === fromSection
                ? { ...dc, deckSection: toSection }
                : dc
            ),
          };
        }
        default:
          return currentDeck;
      }
    }
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE,
      },
    })
  );

  const loadDeck = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getDeckById(deckId);
      if (result.error) {
        setError(result.error);
        addToast({
          variant: 'error',
          title: t('deck.errors.loadFailed'),
          description: result.error,
        });
      } else if (result.deck) {
        const deckData = result.deck as DeckWithCards;
        setDeck(deckData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load deck';
      setError(errorMessage);
      addToast({
        variant: 'error',
        title: t('deck.errors.loadFailed'),
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, [deckId, t, addToast]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  // Gruppiere und filtere Karten nach Sektion (mit useMemo für Performance)
  // MUSS vor bedingten Returns sein!
  const filteredAndSortedCards = useMemo(() => {
    if (!optimisticDeck) return { main: [], extra: [], side: [] };

    const filterCards = (cards: DeckWithCards['deckCards']) => {
      let filtered = cards;

      // Filter nach Suchbegriff
      if (deckSearchQuery.trim().length > 0) {
        const query = deckSearchQuery.toLowerCase();
        filtered = filtered.filter(
          (dc) =>
            dc.card.name.toLowerCase().includes(query) ||
            dc.card.type.toLowerCase().includes(query) ||
            (dc.card.archetype && dc.card.archetype.toLowerCase().includes(query))
        );
      }

      // Sortierung
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number | null = null;
        let bValue: string | number | null = null;

        switch (deckSortBy) {
          case 'name':
            aValue = a.card.name;
            bValue = b.card.name;
            break;
          case 'type':
            aValue = a.card.type;
            bValue = b.card.type;
            break;
          case 'level':
            aValue = a.card.level ?? 0;
            bValue = b.card.level ?? 0;
            break;
          case 'atk':
            aValue = a.card.atk ?? 0;
            bValue = b.card.atk ?? 0;
            break;
          case 'def':
            aValue = a.card.def ?? 0;
            bValue = b.card.def ?? 0;
            break;
        }

        if (aValue === null && bValue === null) return 0;
        if (aValue === null) return 1;
        if (bValue === null) return -1;

        const comparison =
          typeof aValue === 'string'
            ? aValue.localeCompare(bValue as string)
            : (aValue as number) - (bValue as number);

        return deckSortOrder === 'asc' ? comparison : -comparison;
      });

      return filtered;
    };

    return {
      main: filterCards(optimisticDeck.deckCards.filter((dc) => dc.deckSection === 'MAIN')),
      extra: filterCards(optimisticDeck.deckCards.filter((dc) => dc.deckSection === 'EXTRA')),
      side: filterCards(optimisticDeck.deckCards.filter((dc) => dc.deckSection === 'SIDE')),
    };
  }, [optimisticDeck, deckSearchQuery, deckSortBy, deckSortOrder]);

  // Berechne Karten pro Sektion (muss vor bedingten Returns sein)
  const mainDeckCards = filteredAndSortedCards.main;
  const extraDeckCards = filteredAndSortedCards.extra;
  const sideDeckCards = filteredAndSortedCards.side;

  // Debug-Logging (kann später entfernt werden)
  useEffect(() => {
    if (optimisticDeck) {
      console.log('DeckEditor: Card counts', {
        main: mainDeckCards.length,
        extra: extraDeckCards.length,
        side: sideDeckCards.length,
        total: optimisticDeck.deckCards.length,
        searchQuery: deckSearchQuery,
      });
    }
  }, [
    optimisticDeck,
    mainDeckCards.length,
    extraDeckCards.length,
    sideDeckCards.length,
    deckSearchQuery,
  ]);

  // Validierung (mit detaillierter Karten-Validierung) - MUSS vor bedingten Returns sein!
  const validation = useMemo(() => {
    return validateDeckSizes(
      mainDeckCards.reduce((sum, dc) => sum + dc.quantity, 0),
      extraDeckCards.reduce((sum, dc) => sum + dc.quantity, 0),
      sideDeckCards.reduce((sum, dc) => sum + dc.quantity, 0),
      optimisticDeck?.deckCards.map((dc) => ({
        cardId: dc.cardId,
        quantity: dc.quantity,
        deckSection: dc.deckSection,
      }))
    );
  }, [mainDeckCards, extraDeckCards, sideDeckCards, optimisticDeck]);

  // Card-Cache für bessere Performance
  const { getCardData, addMultipleToCache } = useCardCache();

  // Deck-Operationen Hook
  const {
    addCard: addCardOperation,
    updateQuantity: updateQuantityOperation,
    removeCard: removeCardOperation,
    moveCard: moveCardOperation,
    isPending,
    pendingOperations,
  } = useDeckOperations({
    deckId,
    deck,
    setDeck,
    addHistoryEntry,
    onError: (error) => {
      addToast({
        variant: 'error',
        title: t('deck.errors.operationFailed'),
        description: error,
      });
    },
    onSuccess: () => {
      // Success wird durch optimistic updates angezeigt
    },
    loadDeck,
    updateOptimisticDeck,
  });

  // Deck-Card-Handler Hook (reduziert Code-Duplikation)
  const {
    handleAddCardToSection,
    handleIncreaseQuantity,
    handleRemove,
    handleDecreaseQuantity,
    handleMoveCard,
    handleDuplicateCard,
  } = useDeckCardHandlers({
    optimisticDeck,
    addCardOperation,
    updateQuantityOperation,
    removeCardOperation,
    moveCardOperation,
    getCardData,
    onError: (title, description) => {
      addToast({
        variant: 'error',
        title,
        description,
      });
    },
    t,
  });

  // Wrapper für handleAddCard, der handleAddCardToSection mit MAIN aufruft
  const handleAddCard = useCallback(
    async (cardId: string) => {
      await handleAddCardToSection(cardId, 'MAIN');
    },
    [handleAddCardToSection]
  );

  // Keyboard-Shortcuts (nach allen Handler-Funktionen)
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: 'z',
        ctrl: true,
        handler: () => {
          if (canUndo) {
            const undoneDeck = undoHistory();
            if (undoneDeck) {
              setDeck(undoneDeck);
            }
          }
        },
        description: 'Undo',
      },
      {
        key: 'z',
        ctrl: true,
        shift: true,
        handler: () => {
          if (canRedo) {
            const redoneDeck = redoHistory();
            if (redoneDeck) {
              setDeck(redoneDeck);
            }
          }
        },
        description: 'Redo',
      },
      {
        key: 'Delete',
        handler: () => {
          if (selectedCardId && optimisticDeck) {
            const deckCard =
              findDeckCard(optimisticDeck, selectedCardId, 'MAIN') ||
              findDeckCard(optimisticDeck, selectedCardId, 'EXTRA') ||
              findDeckCard(optimisticDeck, selectedCardId, 'SIDE');
            if (deckCard) {
              handleRemove(deckCard.cardId, deckCard.deckSection as DeckSection);
              setSelectedCardId(null);
            }
          }
          // Entferne alle ausgewählten Karten bei Multi-Select
          if (selectedCardIds.size > 0 && optimisticDeck) {
            selectedCardIds.forEach((cardId) => {
              const deckCard = optimisticDeck.deckCards.find((dc) => dc.cardId === cardId);
              if (deckCard) {
                handleRemove(deckCard.cardId, deckCard.deckSection as DeckSection);
              }
            });
            setSelectedCardIds(new Set());
          }
        },
        description: 'Remove selected card(s)',
      },
      {
        key: 'Backspace',
        handler: () => {
          if (selectedCardId && optimisticDeck) {
            const deckCard =
              findDeckCard(optimisticDeck, selectedCardId, 'MAIN') ||
              findDeckCard(optimisticDeck, selectedCardId, 'EXTRA') ||
              findDeckCard(optimisticDeck, selectedCardId, 'SIDE');
            if (deckCard) {
              handleRemove(deckCard.cardId, deckCard.deckSection as DeckSection);
              setSelectedCardId(null);
            }
          }
        },
        description: 'Remove selected card',
      },
      {
        key: 'd',
        ctrl: true,
        handler: () => {
          if (selectedCardId && optimisticDeck) {
            const deckCard =
              findDeckCard(optimisticDeck, selectedCardId, 'MAIN') ||
              findDeckCard(optimisticDeck, selectedCardId, 'EXTRA') ||
              findDeckCard(optimisticDeck, selectedCardId, 'SIDE');
            if (deckCard) {
              handleDuplicateCard(deckCard.cardId, deckCard.deckSection as DeckSection);
            }
          }
        },
        description: 'Duplicate card',
      },
      {
        key: 'a',
        ctrl: true,
        handler: () => {
          if (optimisticDeck) {
            const allIds = new Set(optimisticDeck.deckCards.map((dc) => dc.cardId));
            setSelectedCardIds(allIds);
          }
        },
        description: 'Select all cards',
      },
      {
        key: 'Escape',
        handler: () => {
          setSelectedCardId(null);
          setSelectedCardIds(new Set());
        },
        description: 'Clear selection',
      },
      {
        key: '+',
        handler: () => {
          if (selectedCardId && optimisticDeck) {
            const deckCard =
              findDeckCard(optimisticDeck, selectedCardId, 'MAIN') ||
              findDeckCard(optimisticDeck, selectedCardId, 'EXTRA') ||
              findDeckCard(optimisticDeck, selectedCardId, 'SIDE');
            if (deckCard) {
              handleIncreaseQuantity(deckCard.cardId, deckCard.deckSection as DeckSection);
            }
          }
        },
        description: 'Increase quantity',
      },
      {
        key: '-',
        handler: () => {
          if (selectedCardId && optimisticDeck) {
            const deckCard =
              findDeckCard(optimisticDeck, selectedCardId, 'MAIN') ||
              findDeckCard(optimisticDeck, selectedCardId, 'EXTRA') ||
              findDeckCard(optimisticDeck, selectedCardId, 'SIDE');
            if (deckCard) {
              handleDecreaseQuantity(deckCard.cardId, deckCard.deckSection as DeckSection);
            }
          }
        },
        description: 'Decrease quantity',
      },
    ],
    enabled: !isLoading && !!optimisticDeck,
  });

  const handleCardClick = useCallback((card: CardForDeck) => {
    // Öffne CardDetailDialog - wird in DeckListSection gehandhabt
  }, []);

  // Multi-Select Handler
  const handleToggleCardSelection = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }, []);

  // Bulk-Actions
  const handleBulkRemove = useCallback(async () => {
    if (selectedCardIds.size === 0 || !optimisticDeck) return;

    const operations = Array.from(selectedCardIds)
      .map((cardId) => {
        const deckCard = optimisticDeck.deckCards.find((dc) => dc.cardId === cardId);
        return deckCard ? { cardId, section: deckCard.deckSection as DeckSection } : null;
      })
      .filter((op): op is { cardId: string; section: DeckSection } => op !== null);

    for (const op of operations) {
      await handleRemove(op.cardId, op.section);
    }

    setSelectedCardIds(new Set());
  }, [selectedCardIds, optimisticDeck, handleRemove]);

  const handleBulkMove = useCallback(
    async (toSection: DeckSection) => {
      if (selectedCardIds.size === 0 || !optimisticDeck) return;

      const operations = Array.from(selectedCardIds)
        .map((cardId) => {
          const deckCard = optimisticDeck.deckCards.find((dc) => dc.cardId === cardId);
          return deckCard
            ? { cardId, fromSection: deckCard.deckSection as DeckSection, toSection }
            : null;
        })
        .filter(
          (op): op is { cardId: string; fromSection: DeckSection; toSection: DeckSection } =>
            op !== null && op.fromSection !== op.toSection
        );

      for (const op of operations) {
        await handleMoveCard(op.cardId, op.fromSection, op.toSection);
      }

      setSelectedCardIds(new Set());
    },
    [selectedCardIds, optimisticDeck, handleMoveCard]
  );

  // YDK Export
  const handleExportYDK = useCallback(() => {
    if (!optimisticDeck) return;

    const ydkContent = createYDKContent(optimisticDeck);
    const filename = `${optimisticDeck.name.replace(/[^a-z0-9]/gi, '_')}.ydk`;
    downloadFile(ydkContent, filename);

    addToast({
      variant: 'success',
      title: t('deck.export.success'),
      description: t('deck.export.successDescription'),
    });
  }, [optimisticDeck, t, addToast]);

  // YDK Import
  const handleImportYDK = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !optimisticDeck) return;

      try {
        const text = await file.text();
        const { main: mainSection, extra: extraSection, side: sideSection } = parseYDKFile(text);

        // Finde Karten anhand Passcode
        const cardMap = new Map<string, string>(); // passcode -> cardId
        // TODO: Lade alle Karten einmalig für bessere Performance

        let importedCount = 0;
        const errors: string[] = [];

        // Import Main Deck
        for (const passcode of mainSection) {
          if (!passcode) continue;
          // TODO: Finde Karte anhand Passcode und füge hinzu
          // Für jetzt: Skip (benötigt Card-Lookup)
        }

        if (importedCount > 0) {
          addToast({
            variant: 'success',
            title: t('deck.import.success'),
            description: t('deck.import.successDescription', { count: importedCount }),
          });
        }

        if (errors.length > 0) {
          addToast({
            variant: 'warning',
            title: t('deck.import.warning'),
            description: errors.slice(0, 5).join(', '),
          });
        }
      } catch (error) {
        addToast({
          variant: 'error',
          title: t('deck.import.error'),
          description: error instanceof Error ? error.message : t('deck.import.errorDescription'),
        });
      }

      // Reset file input
      event.target.value = '';
    },
    [optimisticDeck, t, addToast]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const data = active.data.current;

      if (data?.type === 'card' && data.card) {
        setActiveCard(data.card);
      } else if (data?.type === 'deckCard' && optimisticDeck) {
        // Finde Karte im Deck
        const cardId = data.cardId as string;
        const deckCard = optimisticDeck.deckCards.find((dc) => dc.cardId === cardId);
        if (deckCard) {
          setActiveCard(deckCard.card);
        }
      }
    },
    [optimisticDeck]
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Haptic Feedback für mobile Geräte (wenn unterstützt)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        // Kurze Vibration beim Überfahren einer Drop-Zone
        navigator.vibrate(10);
      }
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCard(null);

      if (!over || !optimisticDeck) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      // Prüfe ob es eine Deck-Sektion ist
      if (overData?.type === 'deckSection') {
        const targetSection = overData.section as DeckSection;

        if (activeData?.type === 'card') {
          // Neue Karte aus Suchergebnissen
          const cardId = active.id as string;
          const card = activeData.card as Card;
          handleAddCardToSection(cardId, targetSection, card);
        } else if (activeData?.type === 'deckCard') {
          // Karte bereits im Deck - verschiebe zwischen Sektionen
          const cardId = activeData.cardId as string;
          const fromSection = activeData.section as DeckSection;

          if (fromSection !== targetSection) {
            handleMoveCard(cardId, fromSection, targetSection);
          }
        }
      }
    },
    [optimisticDeck, handleAddCardToSection, handleMoveCard]
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive border border-destructive/20">
        {error || t('deck.errors.notFound')}
      </div>
    );
  }

  // Verwende optimisticDeck für UI, fallback zu deck
  const displayDeck = optimisticDeck || deck;

  return (
    <div className="space-y-6">
      {/* Deck-Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{displayDeck.name}</h2>
            {isPending && (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{t('common.saving')}...</span>
              </div>
            )}
          </div>
          {/* Undo/Redo Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const undoneDeck = undoHistory();
                if (undoneDeck) {
                  setDeck(undoneDeck);
                }
              }}
              disabled={!canUndo}
              title={t('common.undo')}
            >
              {t('common.undo')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const redoneDeck = redoHistory();
                if (redoneDeck) {
                  setDeck(redoneDeck);
                }
              }}
              disabled={!canRedo}
              title={t('common.redo')}
            >
              {t('common.redo')}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" title={t('deck.history.timeline')}>
                  <History className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">{t('deck.history.timeline')}</h4>
                    <span className="text-xs text-muted-foreground">
                      {history.length}/{maxHistorySize}
                    </span>
                  </div>
                  <HistoryTimeline
                    history={history}
                    currentIndex={historyIndex}
                    onJumpToHistory={(index) => {
                      const deck = jumpToHistory(index);
                      if (deck) {
                        setDeck(deck);
                      }
                    }}
                    maxHistorySize={maxHistorySize}
                  />
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <label className="text-xs text-muted-foreground">
                      {t('deck.history.limit')}:
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={historyLimit}
                      onChange={(e) => {
                        const newLimit = parseInt(e.target.value, 10);
                        if (!isNaN(newLimit) && newLimit >= 10 && newLimit <= 200) {
                          setHistoryLimit(newLimit);
                        }
                      }}
                      className="w-16 px-2 py-1 text-xs border rounded"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {displayDeck.description && (
          <p className="text-muted-foreground mt-1">{displayDeck.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">Format: {displayDeck.format}</p>
      </div>

      {/* Validierungs-Status */}
      <div className="rounded-lg border p-4 bg-card">
        {validation.isValid ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">{t('deck.validation.valid')}</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-destructive font-medium">
              <AlertCircle className="h-5 w-5" />
              <span>{t('deck.validation.invalid')}</span>
            </div>
            <div className="space-y-1 pl-7">
              {validation.errors.map((err, idx) => (
                <div key={idx} className="flex items-start gap-2 text-destructive text-sm">
                  <span className="mt-0.5">•</span>
                  <span>{err}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {validation.warnings.length > 0 && (
          <div className="mt-3 space-y-1 pl-7">
            {validation.warnings.map((warn, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-yellow-600 dark:text-yellow-400 text-sm"
              >
                <span className="mt-0.5">⚠</span>
                <span>{warn}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zwei-Spalten-Layout */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Linke Spalte: Kartensuche */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('deck.searchCards')}</h3>
            <CardSearchErrorBoundary>
              <CardSearch onCardSelect={handleAddCard} />
            </CardSearchErrorBoundary>
          </div>

          {/* Rechte Spalte: Deckliste */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{t('deck.deckEditor')}</h3>
              <div className="flex items-center gap-2">
                {/* Bulk-Actions */}
                {selectedCardIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedCardIds.size} {t('common.selected')}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkRemove}
                      title={t('deck.bulk.remove')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Select onValueChange={(value) => handleBulkMove(value as DeckSection)}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder={t('deck.bulk.move')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MAIN">{t('deck.mainDeck')}</SelectItem>
                        <SelectItem value="EXTRA">{t('deck.extraDeck')}</SelectItem>
                        <SelectItem value="SIDE">{t('deck.sideDeck')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCardIds(new Set())}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {/* YDK Import/Export */}
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".ydk"
                    onChange={handleImportYDK}
                    className="hidden"
                    id="ydk-import"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('ydk-import')?.click()}
                    title={t('deck.import.ydk')}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportYDK}
                    title={t('deck.export.ydk')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Deck-Suche und Sortierung */}
            <div className="space-y-2">
              <Input
                placeholder={t('deck.searchInDeck')}
                value={deckSearchQuery}
                onChange={(e) => setDeckSearchQuery(e.target.value)}
                className="w-full"
              />
              <div className="flex items-center gap-2">
                <Select
                  value={deckSortBy}
                  onValueChange={(value) => setDeckSortBy(value as typeof deckSortBy)}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">{t('deck.sortByName')}</SelectItem>
                    <SelectItem value="type">{t('deck.sortByType')}</SelectItem>
                    <SelectItem value="level">{t('deck.sortByLevel')}</SelectItem>
                    <SelectItem value="atk">{t('deck.sortByAtk')}</SelectItem>
                    <SelectItem value="def">{t('deck.sortByDef')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeckSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                >
                  {deckSortOrder === 'asc' ? '↑' : '↓'}
                </Button>
                {deckSearchQuery && (
                  <Button variant="ghost" size="sm" onClick={() => setDeckSearchQuery('')}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {(
              [
                { section: 'MAIN' as DeckSection, title: t('deck.mainDeck'), cards: mainDeckCards },
                {
                  section: 'EXTRA' as DeckSection,
                  title: t('deck.extraDeck'),
                  cards: extraDeckCards,
                },
                { section: 'SIDE' as DeckSection, title: t('deck.sideDeck'), cards: sideDeckCards },
              ] as const
            ).map(({ section, title, cards }) => (
              <DeckListSection
                key={section}
                title={title}
                section={section}
                cards={cards}
                onIncreaseQuantity={handleIncreaseQuantity}
                onDecreaseQuantity={handleDecreaseQuantity}
                onRemove={handleRemove}
                onMove={handleMoveCard}
                showMoveButtons={true}
                onCardClick={handleCardClick}
                pendingOperations={pendingOperations}
                allDeckCards={optimisticDeck?.deckCards.map((dc) => ({
                  ...dc,
                  card: dc.card,
                }))}
                selectedCardIds={selectedCardIds}
                onToggleCardSelection={handleToggleCardSelection}
              />
            ))}
          </div>
        </div>
        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'ease-out',
          }}
          style={{
            cursor: 'grabbing',
          }}
        >
          {activeCard ? (
            <div className="rounded-lg border-2 border-primary bg-card p-3 shadow-2xl opacity-95 rotate-2 scale-105">
              <div className="flex gap-3">
                {activeCard.imageSmall && (
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded border">
                    <Image
                      src={activeCard.imageSmall}
                      alt={activeCard.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{activeCard.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{activeCard.type}</p>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
