"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/hooks";
import { getDeckById, addCardToDeck, updateCardQuantity, removeCardFromDeck } from "@/server/actions/deck.actions";
import { CardSearch } from "./CardSearch";
import { DeckListSection } from "./DeckListSection";
import { validateDeckSizes } from "@/lib/validations/deck.schema";
import type { DeckSection } from "@/lib/validations/deck.schema";
import type { Deck, DeckCard, Card } from "@prisma/client";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface DeckWithCards extends Deck {
  deckCards: Array<DeckCard & { card: Card }>;
}

interface DeckEditorProps {
  deckId: string;
}

/**
 * Deck-Editor mit Kartensuche und Deckliste
 */
export function DeckEditor({ deckId }: DeckEditorProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [deck, setDeck] = useState<DeckWithCards | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDeck() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getDeckById(deckId);
      if (result.error) {
        setError(result.error);
      } else if (result.deck) {
        setDeck(result.deck as DeckWithCards);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deck");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDeck();
  }, [deckId]);

  async function handleAddCard(cardId: string) {
    if (!deck) return;

    try {
      const result = await addCardToDeck(deckId, {
        cardId,
        quantity: 1,
        deckSection: "MAIN", // Default: Main Deck
      });

      if (result.error) {
        alert(result.error);
      } else {
        await loadDeck(); // Reload deck
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : t("deck.errors.addCardFailed"));
    }
  }

  async function handleIncreaseQuantity(cardId: string, section: DeckSection) {
    if (!deck) return;

    const deckCard = deck.deckCards.find(
      (dc) => dc.cardId === cardId && dc.deckSection === section
    );
    if (!deckCard) return;

    const newQuantity = Math.min(deckCard.quantity + 1, 3);

    try {
      const result = await updateCardQuantity(deckId, {
        cardId,
        quantity: newQuantity,
        deckSection: section,
      });

      if (result.error) {
        alert(result.error);
      } else {
        await loadDeck();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : t("deck.errors.updateQuantityFailed"));
    }
  }

  async function handleDecreaseQuantity(cardId: string, section: DeckSection) {
    if (!deck) return;

    const deckCard = deck.deckCards.find(
      (dc) => dc.cardId === cardId && dc.deckSection === section
    );
    if (!deckCard || deckCard.quantity <= 1) return;

    const newQuantity = deckCard.quantity - 1;

    try {
      const result = await updateCardQuantity(deckId, {
        cardId,
        quantity: newQuantity,
        deckSection: section,
      });

      if (result.error) {
        alert(result.error);
      } else {
        await loadDeck();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : t("deck.errors.updateQuantityFailed"));
    }
  }

  async function handleRemove(cardId: string, section: DeckSection) {
    if (!deck) return;

    try {
      const result = await removeCardFromDeck(deckId, {
        cardId,
        deckSection: section,
      });

      if (result.error) {
        alert(result.error);
      } else {
        await loadDeck();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : t("deck.errors.removeCardFailed"));
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (error || !deck) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive border border-destructive/20">
        {error || t("deck.errors.notFound")}
      </div>
    );
  }

  // Gruppiere Karten nach Sektion
  const mainDeckCards = deck.deckCards.filter((dc) => dc.deckSection === "MAIN");
  const extraDeckCards = deck.deckCards.filter((dc) => dc.deckSection === "EXTRA");
  const sideDeckCards = deck.deckCards.filter((dc) => dc.deckSection === "SIDE");

  // Validierung
  const validation = validateDeckSizes(
    mainDeckCards.reduce((sum, dc) => sum + dc.quantity, 0),
    extraDeckCards.reduce((sum, dc) => sum + dc.quantity, 0),
    sideDeckCards.reduce((sum, dc) => sum + dc.quantity, 0)
  );

  return (
    <div className="space-y-6">
      {/* Deck-Header */}
      <div>
        <h2 className="text-2xl font-bold">{deck.name}</h2>
        {deck.description && (
          <p className="text-muted-foreground mt-1">{deck.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-1">Format: {deck.format}</p>
      </div>

      {/* Validierungs-Status */}
      {validation.isValid ? (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">{t("deck.validation.valid")}</span>
        </div>
      ) : (
        <div className="space-y-1">
          {validation.errors.map((err, idx) => (
            <div key={idx} className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Zwei-Spalten-Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Linke Spalte: Kartensuche */}
        <div>
          <h3 className="text-lg font-semibold mb-4">{t("deck.searchCards")}</h3>
          <CardSearch onCardSelect={handleAddCard} />
        </div>

        {/* Rechte Spalte: Deckliste */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t("deck.deckEditor")}</h3>

          <DeckListSection
            title={t("deck.mainDeck")}
            section="MAIN"
            cards={mainDeckCards}
            onIncreaseQuantity={handleIncreaseQuantity}
            onDecreaseQuantity={handleDecreaseQuantity}
            onRemove={handleRemove}
          />

          <DeckListSection
            title={t("deck.extraDeck")}
            section="EXTRA"
            cards={extraDeckCards}
            onIncreaseQuantity={handleIncreaseQuantity}
            onDecreaseQuantity={handleDecreaseQuantity}
            onRemove={handleRemove}
          />

          <DeckListSection
            title={t("deck.sideDeck")}
            section="SIDE"
            cards={sideDeckCards}
            onIncreaseQuantity={handleIncreaseQuantity}
            onDecreaseQuantity={handleDecreaseQuantity}
            onRemove={handleRemove}
          />
        </div>
      </div>
    </div>
  );
}

