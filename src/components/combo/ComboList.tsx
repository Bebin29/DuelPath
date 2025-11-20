'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/hooks';
import { getCombosByUser, deleteCombo } from '@/server/actions/combo.actions';
import { getUserDecks } from '@/server/actions/deck.actions';
import { Button } from '@/components/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/components/ui/card';
import { Input } from '@/components/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/components/ui/select';
import { Zap, Edit, Trash2, Play, Search, X } from 'lucide-react';
import type { Combo, Deck } from '@prisma/client';
import { useToast } from '@/components/components/ui/toast';
import useSWR from 'swr';
import { useDebounce } from '@/lib/hooks/use-debounce';

type ComboWithPreview = Combo & {
  steps?: Array<{ order: number }>;
  deck?: {
    id: string;
    name: string;
  } | null;
};

/**
 * Liste aller Kombos des Benutzers
 */
type SortOption = 'title' | 'updatedAt' | 'steps';

export function ComboList() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const router = useRouter();
  const [filterDeckId, setFilterDeckId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('updatedAt');
  const [decks, setDecks] = useState<Deck[]>([]);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Lade Decks für Filter
  useEffect(() => {
    getUserDecks().then((result) => {
      if (result.decks) {
        setDecks(result.decks);
      }
    });
  }, []);

  // SWR für Data Fetching
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    combos: ComboWithPreview[];
    error?: string;
  }>(`/api/combos${filterDeckId ? `?deckId=${filterDeckId}` : ''}`, async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch combos');
    }
    return response.json();
  });

  // Filtere und sortiere Combos
  const filteredAndSortedCombos = useMemo(() => {
    const combos = data?.combos || [];

    // Filter nach Suchbegriff
    let filtered = combos;
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = combos.filter(
        (combo) =>
          combo.title.toLowerCase().includes(query) ||
          combo.description?.toLowerCase().includes(query) ||
          combo.deck?.name.toLowerCase().includes(query)
      );
    }

    // Sortierung
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'steps':
          return (b.steps?.length || 0) - (a.steps?.length || 0);
        case 'updatedAt':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return sorted;
  }, [data?.combos, debouncedSearchQuery, sortBy]);

  async function handleDelete(comboId: string) {
    if (!confirm(t('combo.confirmDelete') || 'Möchtest du diese Kombo wirklich löschen?')) {
      return;
    }

    try {
      const result = await deleteCombo(comboId);
      if (result.error) {
        addToast({
          variant: 'error',
          title: t('combo.errors.deleteFailed') || 'Fehler beim Löschen',
          description: result.error,
        });
      } else {
        // Combo aus Liste entfernen (optimistic update)
        mutate((current) => {
          if (!current) return current;
          return {
            ...current,
            combos: current.combos.filter((combo) => combo.id !== comboId),
          };
        }, false);
        addToast({
          variant: 'success',
          title: t('combo.comboDeleted') || 'Kombo gelöscht',
          description: t('combo.comboDeletedDescription') || 'Die Kombo wurde erfolgreich gelöscht',
        });
      }
    } catch (err) {
      addToast({
        variant: 'error',
        title: t('combo.errors.deleteFailed') || 'Fehler beim Löschen',
        description:
          err instanceof Error
            ? err.message
            : t('combo.errors.deleteFailed') || 'Fehler beim Löschen',
      });
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (error || data?.error) {
    return (
      <div className="rounded-md bg-destructive/10 p-4 text-destructive border border-destructive/20">
        {error?.message || data?.error || t('combo.loadCombosFailed')}
      </div>
    );
  }

  const combos = filteredAndSortedCombos;

  if (data?.combos && data.combos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            <div>
              <CardTitle>{t('combo.noCombos') || 'Keine Kombos'}</CardTitle>
              <CardDescription>
                {t('combo.createFirstCombo') || 'Erstelle deine erste Kombo'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter und Suche */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search') || 'Suchen...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Select
          value={filterDeckId || 'all'}
          onValueChange={(value) => setFilterDeckId(value === 'all' ? undefined : value)}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder={t('combo.filterByDeck') || 'Nach Deck filtern'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('combo.allDecks') || 'Alle Decks'}</SelectItem>
            {decks.map((deck) => (
              <SelectItem key={deck.id} value={deck.id}>
                {deck.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt">{t('combo.sortByDate') || 'Neueste zuerst'}</SelectItem>
            <SelectItem value="title">{t('combo.sortByTitle') || 'Nach Titel'}</SelectItem>
            <SelectItem value="steps">{t('combo.sortBySteps') || 'Nach Schritten'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Ergebnisse */}
      {combos.length === 0 && data?.combos && data.combos.length > 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t('combo.noResults') || 'Keine Ergebnisse gefunden'}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {combos.map((combo) => (
          <Card key={combo.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{combo.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {combo.steps?.length || 0} {t('combo.steps') || 'Schritte'}
                    {combo.deck && ` • ${combo.deck.name}`}
                  </CardDescription>
                  {combo.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {combo.description}
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
                  onClick={() => router.push(`/combos/${combo.id}`)}
                  className="flex-1"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {t('common.edit')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/combos/${combo.id}?mode=play`)}
                  title={t('combo.playMode') || 'Abspielen'}
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(combo.id)}
                  title={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
