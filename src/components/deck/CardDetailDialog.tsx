'use client';

import { useState, useEffect, useCallback, startTransition } from 'react';
import { useTranslation } from '@/lib/i18n/hooks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Card } from '@prisma/client';
import type { CardForDeck } from '@/lib/hooks/use-deck-history';
import Image from 'next/image';

interface CardDetailDialogProps {
  card: CardForDeck | Card | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToDeck?: (cardId: string) => void;
}

/**
 * Dialog zur Anzeige von Kartendetails
 */
export function CardDetailDialog({ card, open, onOpenChange, onAddToDeck }: CardDetailDialogProps) {
  const { t } = useTranslation();
  const [fullCard, setFullCard] = useState<Card | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Lade vollständige Card-Daten wenn Dialog geöffnet wird und Card nur CardForDeck ist
  const loadCardDetails = useCallback(async () => {
    if (!card) {
      setFullCard(null);
      setIsLoading(false);
      return;
    }

    // Prüfe ob Card vollständig ist (hat desc-Feld)
    if ('desc' in card) {
      startTransition(() => setFullCard(card as Card));
      setIsLoading(false);
    } else {
      // Card ist nicht vollständig, lade von API (Cache hat nur CardForDeck ohne desc)
      setIsLoading(true);
      try {
        const res = await fetch(`/api/cards?id=${card.id}`);
        const data = await res.json();
        if (data.card) {
          setFullCard(data.card);
        }
      } catch (error) {
        console.error('Failed to load card details:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [card]);

  useEffect(() => {
    if (open) {
      loadCardDetails();
    }
  }, [open, loadCardDetails]);

  const displayCard = fullCard || card;

  if (!displayCard) {
    return null;
  }

  const shown: CardForDeck & Partial<Card> = displayCard;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">{shown.name}</DialogTitle>
          <DialogDescription>
            {shown.type}
            {shown.archetype && ` • ${shown.archetype}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* Linke Spalte: Kartenbild */}
          <div className="flex-shrink-0">
            {shown.imageUrl ? (
              <div className="relative w-64 h-[89.6%] rounded-lg overflow-hidden border-2 border-border">
                <Image
                  src={shown.imageUrl}
                  alt={shown.name}
                  fill
                  className="object-contain"
                  sizes="256px"
                  priority
                />
              </div>
            ) : (
              <div className="w-64 h-[89.6%] rounded-lg border-2 border-border bg-muted flex items-center justify-center">
                <p className="text-muted-foreground text-sm">Kein Bild verfügbar</p>
              </div>
            )}
          </div>

          {/* Rechte Spalte: Details */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {/* Basis-Informationen */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Karteninformationen</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium text-muted-foreground">Typ:</span>{' '}
                    <span>{shown.type}</span>
                  </div>
                  {shown.race && (
                    <div>
                      <span className="font-medium text-muted-foreground">Kategorie:</span>{' '}
                      <span>{shown.race}</span>
                    </div>
                  )}
                  {shown.attribute && (
                    <div>
                      <span className="font-medium text-muted-foreground">Attribut:</span>{' '}
                      <Badge variant="outline">{shown.attribute}</Badge>
                    </div>
                  )}
                  {shown.level !== null && (
                    <div>
                      <span className="font-medium text-muted-foreground">Level/Rang:</span>{' '}
                      <span>{shown.level}</span>
                    </div>
                  )}
                  {shown.atk !== null && (
                    <div>
                      <span className="font-medium text-muted-foreground">ATK:</span>{' '}
                      <span>{shown.atk === -1 ? '?' : shown.atk}</span>
                    </div>
                  )}
                  {shown.def !== null && (
                    <div>
                      <span className="font-medium text-muted-foreground">DEF:</span>{' '}
                      <span>{shown.def === -1 ? '?' : shown.def}</span>
                    </div>
                  )}
                  {shown.archetype && (
                    <div className="col-span-2">
                      <span className="font-medium text-muted-foreground">Archetype:</span>{' '}
                      <Badge variant="secondary">{shown.archetype}</Badge>
                    </div>
                  )}
                  {shown.passcode && (
                    <div>
                      <span className="font-medium text-muted-foreground">Passcode:</span>{' '}
                      <span className="font-mono text-xs">{shown.passcode}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Effekttext */}
              {shown.desc && (
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Kartentext</h3>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap bg-muted/50 p-4 rounded-lg">
                    {shown.desc}
                  </div>
                </div>
              )}

              {/* Banlist-Info */}
              {shown.banlistInfo && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Banlist-Status</h3>
                    <div className="text-sm">
                      {(() => {
                        try {
                          const banlist = JSON.parse(shown.banlistInfo);
                          return (
                            <div className="space-y-1">
                              {Object.entries(banlist).map(([format, status]) => (
                                <div key={format}>
                                  <span className="font-medium">{format}:</span>{' '}
                                  <Badge
                                    variant={
                                      status === 'Forbidden'
                                        ? 'destructive'
                                        : status === 'Limited'
                                          ? 'default'
                                          : 'secondary'
                                    }
                                  >
                                    {String(status)}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          );
                        } catch {
                          return <Badge variant="secondary">{shown.banlistInfo}</Badge>;
                        }
                      })()}
                    </div>
                  </div>
                </>
              )}

              {/* Add to Deck Button */}
              {onAddToDeck && (
                <>
                  <Separator />
                  <div className="flex justify-end">
                    <Button onClick={() => onAddToDeck(shown.id)}>{t('deck.addCard')}</Button>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
