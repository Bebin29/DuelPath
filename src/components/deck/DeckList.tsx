'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/hooks';
import { getUserDecks, deleteDeck } from '@/server/actions/deck.actions';
import { Button } from '@/components/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/components/ui/card';
import { Library, Edit, Trash2 } from 'lucide-react';
import type { Deck } from '@prisma/client';
import { useToast } from '@/components/components/ui/toast';

type DeckWithCount = Deck & {
  _count?: {
    deckCards: number;
  };
};

/**
 * Liste aller Decks des Benutzers
 */
export function DeckList() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();
  const [decks, setDecks] = useState<DeckWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDecks() {
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
      setError(err instanceof Error ? err.message : 'Failed to load decks');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(deckId: string) {
    if (!confirm(t('deck.confirmDelete'))) {
      return;
    }

    try {
      const result = await deleteDeck(deckId);
      if (result.error) {
        addToast({
          variant: 'error',
          title: t('deck.errors.deleteFailed'),
          description: result.error,
        });
      } else {
        // Deck aus Liste entfernen
        setDecks(decks.filter((deck) => deck.id !== deckId));
        addToast({
          variant: 'success',
          title: t('deck.deckDeleted'),
          description: t('deck.deckDeletedDescription'),
        });
      }
    } catch (err) {
      addToast({
        variant: 'error',
        title: t('deck.errors.deleteFailed'),
        description: err instanceof Error ? err.message : t('deck.errors.deleteFailed'),
      });
    }
  }

  useEffect(() => {
    loadDecks();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive border border-destructive/20">
        {error}
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Library className="w-8 h-8 text-primary" />
            <div>
              <CardTitle>{t('deck.noDecks')}</CardTitle>
              <CardDescription>{t('deck.createFirstDeck')}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {decks.map((deck) => (
        <Card key={deck.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{deck.name}</CardTitle>
                <CardDescription className="mt-1">
                  {deck.format} • {deck._count?.deckCards || 0} Karten
                </CardDescription>
                {deck.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {deck.description}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push(`/decks/${deck.id}`)}
                className="flex-1"
              >
                <Edit className="mr-2 h-4 w-4" />
                {t('common.edit')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(deck.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
