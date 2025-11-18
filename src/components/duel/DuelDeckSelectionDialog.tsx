"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n/hooks";
import { getUserDecks } from "@/server/actions/deck.actions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/components/ui/dialog";
import { Button } from "@/components/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/components/ui/card";
import { Badge } from "@/components/components/ui/badge";
import { Loader2, Swords } from "lucide-react";
import type { DuelDeck } from "@/types/duel.types";
import type { DeckWithCards } from "@/lib/hooks/use-deck-history";

interface DuelDeckSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeckSelected: (deck: DuelDeck) => void;
}

/**
 * Dialog zur Auswahl eines Decks für ein Duell
 */
export function DuelDeckSelectionDialog({
  open,
  onOpenChange,
  onDeckSelected,
}: DuelDeckSelectionDialogProps) {
  const { t } = useTranslation();
  const [decks, setDecks] = useState<DeckWithCards[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Lädt verfügbare Decks beim Öffnen des Dialogs
   */
  useEffect(() => {
    if (open && decks.length === 0) {
      loadDecks();
    }
  }, [open, decks.length]);

  /**
   * Lädt Decks des Users
   */
  const loadDecks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getUserDecks();

      if (result.error) {
        setError(result.error);
      } else if (result.decks) {
        setDecks(result.decks);
      }
    } catch (err) {
      setError("Failed to load decks");
      console.error("Deck loading error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Callback wenn Deck ausgewählt wurde
   */
  const handleDeckSelect = (deck: DeckWithCards) => {
    // Konvertiere DeckWithCards zu DuelDeck
    const duelDeck: DuelDeck = {
      id: deck.id,
      name: deck.name,
      cards: deck.deckCards
        .filter(dc => dc.card !== null && dc.card !== undefined)
        .map(dc => dc.card),
    };

    onDeckSelected(duelDeck);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="w-5 h-5" />
            {t("duel.selectDeck")}
          </DialogTitle>
          <DialogDescription>
            {t("duel.selectDeckDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadDecks}
                className="mt-2"
              >
                {t("common.retry")}
              </Button>
            </div>
          )}

          {!isLoading && !error && decks.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {t("duel.noDecksAvailable")}
              </p>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("common.close")}
              </Button>
            </div>
          )}

          {!isLoading && !error && decks.length > 0 && (
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {decks.map((deck) => (
                <Card
                  key={deck.id}
                  className="cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleDeckSelect(deck)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{deck.name}</CardTitle>
                      <Badge variant="secondary">{deck.format}</Badge>
                    </div>
                    {deck.description && (
                      <CardDescription>{deck.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>
                        Main: {deck.deckCards.filter(dc => dc.deckSection === "MAIN").length}
                      </span>
                      <span>
                        Extra: {deck.deckCards.filter(dc => dc.deckSection === "EXTRA").length}
                      </span>
                      <span>
                        Side: {deck.deckCards.filter(dc => dc.deckSection === "SIDE").length}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
