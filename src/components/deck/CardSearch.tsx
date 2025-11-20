'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/hooks';
import useSWR from 'swr';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Input } from '@/components/components/ui/input';
import { Button } from '@/components/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/components/ui/select';
import { Label } from '@/components/components/ui/label';
import { Badge } from '@/components/components/ui/badge';
import {
  Card as UICard,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/components/ui/card';
import { Separator } from '@/components/components/ui/separator';
import { Skeleton } from '@/components/components/ui/skeleton';
import { CardItem } from './CardItem';
import type { Card } from '@prisma/client';
import type { CardSearchFilter, CardSortOptions, CardListResult } from '@/types/card.types';
import { Search, X, Loader2, AlertCircle } from 'lucide-react';
import { useClickOutside } from '@/lib/hooks/use-click-outside';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useToast } from '@/components/components/ui/toast';
import { useCardCache } from '@/lib/hooks/use-card-cache';
import {
  VIRTUALIZATION_THRESHOLD_CARD_SEARCH,
  ESTIMATED_CARD_ITEM_HEIGHT,
  VIRTUALIZATION_OVERSCAN,
  AUTOCOMPLETE_TTL,
  AUTOCOMPLETE_CACHE_MAX_SIZE,
} from '@/lib/constants/deck.constants';

interface CardSearchProps {
  onCardSelect?: (cardId: string) => void;
  showAddButton?: boolean;
}

// Fetcher für SWR
const fetcher = async (url: string): Promise<CardListResult> => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Search failed: ${response.status} ${response.statusText}`
    );
  }
  const data = await response.json();
  if (data.error) {
    throw new Error(data.message || data.error);
  }
  return data;
};

/**
 * Kartensuche mit Filtern und Autocomplete
 *
 * Features:
 * - Autocomplete mit Keyboard-Navigation
 * - Debounced Search
 * - Filter-Badges
 * - Loading States
 * - Error Handling
 * - Sortierung
 * - Accessibility
 */
export function CardSearch({ onCardSelect, showAddButton = true }: CardSearchProps) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingAutocomplete, setIsLoadingAutocomplete] = useState(false);
  const [isLoadingRace, setIsLoadingRace] = useState(false);
  const [isLoadingArchetype, setIsLoadingArchetype] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<CardSearchFilter>({});
  const [sortOptions, setSortOptions] = useState<CardSortOptions>({ sortBy: 'name', order: 'asc' });
  const [useRegex, setUseRegex] = useState(false);
  const [atkRange, setAtkRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [defRange, setDefRange] = useState<{ min: string; max: string }>({ min: '', max: '' });

  // Separater State für Archetype-Input (unabhängig von den ausgewählten Filtern)
  const [archetypeInputValue, setArchetypeInputValue] = useState('');

  // Autocomplete States
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [archetypeSuggestions, setArchetypeSuggestions] = useState<string[]>([]);
  const [raceSuggestions, setRaceSuggestions] = useState<string[]>([]);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(-1);
  const [selectedArchetypeIndex, setSelectedArchetypeIndex] = useState(-1);
  const [selectedRaceIndex, setSelectedRaceIndex] = useState(-1);

  // Refs für Click-Outside
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const archetypeRef = useRef<HTMLDivElement>(null);
  const raceRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Separate AbortController für jeden Request-Typ (nur für Autocomplete)
  const autocompleteAbortControllerRef = useRef<AbortController | null>(null);
  const raceAbortControllerRef = useRef<AbortController | null>(null);
  const archetypeAbortControllerRef = useRef<AbortController | null>(null);

  // Request-Tracking für Race-Condition-Prävention (nur für Autocomplete)
  const autocompleteRequestIdRef = useRef<number>(0);
  const raceRequestIdRef = useRef<number>(0);
  const archetypeRequestIdRef = useRef<number>(0);

  // Client-seitiges Caching für Autocomplete-Ergebnisse (LRU-Cache)
  const autocompleteCacheRef = useRef<Map<string, { results: string[]; timestamp: number }>>(
    new Map()
  );
  const archetypeCacheRef = useRef<Map<string, { results: string[]; timestamp: number }>>(
    new Map()
  );
  const raceCacheRef = useRef<Map<string, { results: string[]; timestamp: number }>>(new Map());

  // LRU-Cache-Helper: Entfernt älteste Einträge wenn Cache zu groß wird
  const trimCache = useCallback((cache: Map<string, { results: string[]; timestamp: number }>) => {
    if (cache.size > AUTOCOMPLETE_CACHE_MAX_SIZE) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, cache.size - AUTOCOMPLETE_CACHE_MAX_SIZE);
      toRemove.forEach(([key]) => cache.delete(key));
    }
  }, []);

  // Debounced values
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const debouncedRaceFilter = useDebounce(filters.race || '', 300);
  const debouncedArchetypeInput = useDebounce(archetypeInputValue, 300);

  // SWR für Kartensuche mit Caching
  const searchKey = useMemo(() => {
    // Prüfe ob Filter gesetzt sind
    const hasFilters = Object.keys(filters).length > 0;
    const hasRanges = !!(atkRange.min || atkRange.max || defRange.min || defRange.max);
    const hasSearchQuery = debouncedSearchQuery.length >= 2;

    // Wenn keine Suche, keine Filter und keine Ranges, dann keine API-Anfrage
    if (!hasSearchQuery && !hasFilters && !hasRanges) {
      return null;
    }
    const params = new URLSearchParams();
    if (debouncedSearchQuery) {
      params.set('name', debouncedSearchQuery);
      if (useRegex) params.set('useRegex', 'true');
    }
    if (filters.type) params.set('type', filters.type);
    if (filters.attribute) params.set('attribute', filters.attribute);
    if (filters.level !== undefined) params.set('level', filters.level.toString());
    // Unterstützt mehrere Archetypes
    if (filters.archetype) {
      if (Array.isArray(filters.archetype)) {
        filters.archetype.forEach((arch) => params.append('archetype', arch));
      } else {
        params.set('archetype', filters.archetype);
      }
    }
    if (filters.race) params.set('race', filters.race);
    // ATK/DEF Range
    if (atkRange.min) {
      const min = parseInt(atkRange.min, 10);
      if (!isNaN(min)) params.set('atkMin', min.toString());
    }
    if (atkRange.max) {
      const max = parseInt(atkRange.max, 10);
      if (!isNaN(max)) params.set('atkMax', max.toString());
    }
    if (defRange.min) {
      const min = parseInt(defRange.min, 10);
      if (!isNaN(min)) params.set('defMin', min.toString());
    }
    if (defRange.max) {
      const max = parseInt(defRange.max, 10);
      if (!isNaN(max)) params.set('defMax', max.toString());
    }
    params.set('page', page.toString());
    params.set('limit', '20');
    params.set('sortBy', sortOptions.sortBy);
    params.set('order', sortOptions.order);
    return `/api/cards?${params.toString()}`;
  }, [debouncedSearchQuery, filters, page, sortOptions, useRegex, atkRange, defRange]);

  const {
    data: searchData,
    error: searchError,
    isLoading,
  } = useSWR<CardListResult>(searchKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const cards = searchData?.cards || [];
  const total = searchData?.total || 0;
  const totalPages = searchData?.totalPages || 1;
  const error = searchError?.message || null;

  // Debug-Logging (kann später entfernt werden)
  useEffect(() => {
    if (searchData) {
      console.log('CardSearch: Received data', {
        cardsCount: cards.length,
        total,
        totalPages,
        searchKey,
        hasCards: cards.length > 0,
      });
    }
    if (searchError) {
      console.error('CardSearch: Error', searchError);
    }
  }, [searchData, searchError, cards.length, total, totalPages, searchKey]);

  // Card-Cache für bessere Performance
  const { addMultipleToCache } = useCardCache();

  // Füge Suchergebnisse zum Cache hinzu
  useEffect(() => {
    if (cards.length > 0) {
      addMultipleToCache(cards);
    }
  }, [cards, addMultipleToCache]);

  // Click-Outside Handler
  useClickOutside(autocompleteRef as React.RefObject<HTMLDivElement>, () => {
    setAutocompleteSuggestions([]);
    setSelectedAutocompleteIndex(-1);
  });

  useClickOutside(archetypeRef as React.RefObject<HTMLDivElement>, () => {
    setArchetypeSuggestions([]);
    setSelectedArchetypeIndex(-1);
  });

  useClickOutside(raceRef as React.RefObject<HTMLDivElement>, () => {
    setRaceSuggestions([]);
    setSelectedRaceIndex(-1);
  });

  // Keyboard-Shortcut für Fokus (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Error-Handling für SWR
  useEffect(() => {
    if (searchError) {
      addToast({
        variant: 'error',
        title: t('deck.searchError'),
        description: searchError.message || t('deck.searchError'),
        duration: 5000,
      });
    }
  }, [searchError, t, addToast]);

  const performAutocomplete = useCallback(
    async (query: string, signal?: AbortSignal, requestId?: number) => {
      if (!query || query.length < 2) {
        setAutocompleteSuggestions([]);
        setIsLoadingAutocomplete(false);
        return;
      }

      const normalizedQuery = query.toLowerCase().trim();

      // Prüfe Cache
      const cached = autocompleteCacheRef.current.get(normalizedQuery);
      if (cached && Date.now() - cached.timestamp < AUTOCOMPLETE_TTL) {
        setAutocompleteSuggestions(cached.results);
        setIsLoadingAutocomplete(false);
        return;
      }

      setIsLoadingAutocomplete(true);
      try {
        const response = await fetch(
          `/api/cards?autocomplete=true&query=${encodeURIComponent(query)}&limit=5`,
          {
            signal,
            headers: {
              'Cache-Control': 'public, max-age=300', // 5 Minuten Cache
            },
          }
        );

        if (signal?.aborted) return;
        if (!response.ok) {
          setIsLoadingAutocomplete(false);
          return;
        }

        const data = await response.json();

        // Ignoriere veraltete Responses (Race-Condition-Prävention)
        if (requestId !== undefined && requestId !== autocompleteRequestIdRef.current) {
          return;
        }

        const results = data.names || [];
        setAutocompleteSuggestions(results);

        // Speichere im Cache (mit LRU-Trim)
        autocompleteCacheRef.current.set(normalizedQuery, {
          results,
          timestamp: Date.now(),
        });
        trimCache(autocompleteCacheRef.current);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Autocomplete error:', error);
        // Autocomplete-Fehler werden nicht als Toast angezeigt, da sie weniger kritisch sind
      } finally {
        setIsLoadingAutocomplete(false);
      }
    },
    []
  );

  const performArchetypeAutocomplete = useCallback(
    async (query: string, signal?: AbortSignal, requestId?: number) => {
      if (!query || query.length < 2) {
        setArchetypeSuggestions([]);
        setIsLoadingArchetype(false);
        return;
      }

      const normalizedQuery = query.toLowerCase().trim();

      // Prüfe Cache
      const cached = archetypeCacheRef.current.get(normalizedQuery);
      if (cached && Date.now() - cached.timestamp < AUTOCOMPLETE_TTL) {
        setArchetypeSuggestions(cached.results);
        setIsLoadingArchetype(false);
        return;
      }

      setIsLoadingArchetype(true);
      try {
        const response = await fetch(`/api/cards?archetype=${encodeURIComponent(query)}&limit=5`, {
          signal,
          headers: {
            'Cache-Control': 'public, max-age=300', // 5 Minuten Cache
          },
        });

        if (signal?.aborted) return;
        if (!response.ok) {
          setIsLoadingArchetype(false);
          return;
        }

        const data = await response.json();

        // Ignoriere veraltete Responses (Race-Condition-Prävention)
        if (requestId !== undefined && requestId !== archetypeRequestIdRef.current) {
          return;
        }

        const archetypes = new Set<string>();
        data.cards?.forEach((card: { archetype?: string | null }) => {
          if (card.archetype) {
            archetypes.add(card.archetype);
          }
        });
        const results = Array.from(archetypes).slice(0, 5);
        setArchetypeSuggestions(results);

        // Speichere im Cache (mit LRU-Trim)
        archetypeCacheRef.current.set(normalizedQuery, {
          results,
          timestamp: Date.now(),
        });
        trimCache(archetypeCacheRef.current);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Archetype autocomplete error:', error);
        // Autocomplete-Fehler werden nicht als Toast angezeigt, da sie weniger kritisch sind
      } finally {
        setIsLoadingArchetype(false);
      }
    },
    []
  );

  const performRaceAutocomplete = useCallback(
    async (query: string, signal?: AbortSignal, requestId?: number) => {
      if (!query || query.length < 1) {
        setRaceSuggestions([]);
        setIsLoadingRace(false);
        return;
      }

      const normalizedQuery = query.toLowerCase().trim();

      // Prüfe Cache
      const cached = raceCacheRef.current.get(normalizedQuery);
      if (cached && Date.now() - cached.timestamp < AUTOCOMPLETE_TTL) {
        setRaceSuggestions(cached.results);
        setIsLoadingRace(false);
        return;
      }

      setIsLoadingRace(true);
      try {
        const response = await fetch(`/api/cards?race=${encodeURIComponent(query)}&limit=5`, {
          signal,
          headers: {
            'Cache-Control': 'public, max-age=300', // 5 Minuten Cache
          },
        });

        if (signal?.aborted) return;
        if (!response.ok) {
          setIsLoadingRace(false);
          return;
        }

        const data = await response.json();

        // Ignoriere veraltete Responses (Race-Condition-Prävention)
        if (requestId !== undefined && requestId !== raceRequestIdRef.current) {
          return;
        }

        const races = new Set<string>();
        data.cards?.forEach((card: { race?: string | null }) => {
          if (card.race) {
            races.add(card.race);
          }
        });
        const results = Array.from(races).slice(0, 5);
        setRaceSuggestions(results);

        // Speichere im Cache (mit LRU-Trim)
        raceCacheRef.current.set(normalizedQuery, {
          results,
          timestamp: Date.now(),
        });
        trimCache(raceCacheRef.current);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        console.error('Race autocomplete error:', error);
        // Autocomplete-Fehler werden nicht als Toast angezeigt, da sie weniger kritisch sind
      } finally {
        setIsLoadingRace(false);
      }
    },
    []
  );

  // Autocomplete effect (unabhängig von SWR)
  useEffect(() => {
    // Cancel previous autocomplete request
    if (autocompleteAbortControllerRef.current) {
      autocompleteAbortControllerRef.current.abort();
    }

    // Erstelle neuen Controller
    autocompleteAbortControllerRef.current = new AbortController();
    const autocompleteSignal = autocompleteAbortControllerRef.current.signal;

    // Erhöhe Request-ID für Race-Condition-Prävention
    autocompleteRequestIdRef.current += 1;
    const currentAutocompleteRequestId = autocompleteRequestIdRef.current;

    performAutocomplete(debouncedSearchQuery, autocompleteSignal, currentAutocompleteRequestId);

    return () => {
      if (autocompleteAbortControllerRef.current) {
        autocompleteAbortControllerRef.current.abort();
      }
    };
  }, [debouncedSearchQuery, performAutocomplete]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery, filters, sortOptions]);

  // Debounced autocomplete for race
  useEffect(() => {
    if (raceAbortControllerRef.current) {
      raceAbortControllerRef.current.abort();
    }

    raceAbortControllerRef.current = new AbortController();
    const signal = raceAbortControllerRef.current.signal;

    // Erhöhe Request-ID für Race-Condition-Prävention
    raceRequestIdRef.current += 1;
    const currentRequestId = raceRequestIdRef.current;

    performRaceAutocomplete(debouncedRaceFilter, signal, currentRequestId);

    return () => {
      if (raceAbortControllerRef.current) {
        raceAbortControllerRef.current.abort();
      }
    };
  }, [debouncedRaceFilter, performRaceAutocomplete]);

  // Debounced autocomplete for archetype (basierend auf Input, nicht auf ausgewählten Filtern)
  useEffect(() => {
    if (archetypeAbortControllerRef.current) {
      archetypeAbortControllerRef.current.abort();
    }

    archetypeAbortControllerRef.current = new AbortController();
    const signal = archetypeAbortControllerRef.current.signal;

    // Erhöhe Request-ID für Race-Condition-Prävention
    archetypeRequestIdRef.current += 1;
    const currentRequestId = archetypeRequestIdRef.current;

    performArchetypeAutocomplete(debouncedArchetypeInput, signal, currentRequestId);

    return () => {
      if (archetypeAbortControllerRef.current) {
        archetypeAbortControllerRef.current.abort();
      }
    };
  }, [debouncedArchetypeInput, performArchetypeAutocomplete]);

  function handleFilterChange(
    key: keyof CardSearchFilter,
    value: string | string[] | number | undefined
  ) {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(1);
  }

  function removeFilter(key: keyof CardSearchFilter) {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
    setPage(1);
  }

  function clearFilters() {
    setFilters({});
    setSearchQuery('');
    setArchetypeInputValue('');
    setAtkRange({ min: '', max: '' });
    setDefRange({ min: '', max: '' });
    setUseRegex(false);
    setPage(1);
  }

  function handleCardAdd(cardId: string) {
    if (onCardSelect) {
      onCardSelect(cardId);
    }
  }

  function handleAutocompleteSelect(name: string) {
    setSearchQuery(name);
    setAutocompleteSuggestions([]);
    setSelectedAutocompleteIndex(-1);
  }

  function handleArchetypeSelect(archetype: string) {
    const currentArchetypes = Array.isArray(filters.archetype)
      ? filters.archetype
      : filters.archetype
        ? [filters.archetype]
        : [];

    // Füge nur hinzu, wenn noch nicht vorhanden
    if (!currentArchetypes.includes(archetype)) {
      handleFilterChange('archetype', [...currentArchetypes, archetype]);
    }

    // Leere das Input-Feld
    setArchetypeInputValue('');
    setArchetypeSuggestions([]);
    setSelectedArchetypeIndex(-1);
  }

  function handleRemoveArchetype(archetypeToRemove: string) {
    const currentArchetypes = Array.isArray(filters.archetype)
      ? filters.archetype
      : filters.archetype
        ? [filters.archetype]
        : [];

    const newArchetypes = currentArchetypes.filter((arch) => arch !== archetypeToRemove);

    if (newArchetypes.length === 0) {
      handleFilterChange('archetype', undefined);
    } else if (newArchetypes.length === 1) {
      handleFilterChange('archetype', newArchetypes[0]);
    } else {
      handleFilterChange('archetype', newArchetypes);
    }
  }

  function handleRaceSelect(race: string) {
    handleFilterChange('race', race);
    setRaceSuggestions([]);
    setSelectedRaceIndex(-1);
  }

  // Keyboard Navigation für Autocomplete
  function handleAutocompleteKeyDown(
    e: React.KeyboardEvent,
    suggestions: string[],
    selectedIndex: number,
    onSelect: (value: string) => void
  ) {
    if (suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedAutocompleteIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedAutocompleteIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          onSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setAutocompleteSuggestions([]);
        setSelectedAutocompleteIndex(-1);
        break;
    }
  }

  function handleArchetypeKeyDown(e: React.KeyboardEvent) {
    if (archetypeSuggestions.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedArchetypeIndex((prev) =>
            prev < archetypeSuggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedArchetypeIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedArchetypeIndex >= 0 && selectedArchetypeIndex < archetypeSuggestions.length) {
            handleArchetypeSelect(archetypeSuggestions[selectedArchetypeIndex]);
          } else if (archetypeInputValue.trim()) {
            // Wenn kein Vorschlag ausgewählt ist, aber Text eingegeben wurde, füge ihn hinzu
            handleArchetypeSelect(archetypeInputValue.trim());
          }
          break;
        case 'Escape':
          setArchetypeSuggestions([]);
          setSelectedArchetypeIndex(-1);
          setArchetypeInputValue('');
          break;
      }
    }
  }

  function handleRaceKeyDown(e: React.KeyboardEvent) {
    if (raceSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedRaceIndex((prev) => (prev < raceSuggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedRaceIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedRaceIndex >= 0 && selectedRaceIndex < raceSuggestions.length) {
          handleRaceSelect(raceSuggestions[selectedRaceIndex]);
        }
        break;
      case 'Escape':
        setRaceSuggestions([]);
        setSelectedRaceIndex(-1);
        break;
    }
  }

  // Aktive Filter für Badges
  const activeFilters = useMemo(() => {
    const active: Array<{
      key: keyof CardSearchFilter;
      label: string;
      value: string;
      removeValue?: string;
    }> = [];
    if (filters.type) active.push({ key: 'type', label: t('deck.cardType'), value: filters.type });
    if (filters.attribute)
      active.push({ key: 'attribute', label: t('deck.attribute'), value: filters.attribute });
    if (filters.level !== undefined)
      active.push({ key: 'level', label: t('deck.level'), value: `Level ${filters.level}` });
    if (filters.race) active.push({ key: 'race', label: t('deck.race'), value: filters.race });

    // Mehrere Archetypes als separate Badges
    if (filters.archetype) {
      const archetypes = Array.isArray(filters.archetype) ? filters.archetype : [filters.archetype];
      archetypes.forEach((arch) => {
        active.push({
          key: 'archetype',
          label: t('deck.archetype'),
          value: arch,
          removeValue: arch, // Spezifischer Wert zum Entfernen
        });
      });
    }

    return active;
  }, [filters, t]);

  const hasActiveSearch = searchQuery.length >= 2 || Object.keys(filters).length > 0;

  return (
    <div className="space-y-4">
      {/* Suchfeld */}
      <div className="space-y-2">
        <Label htmlFor="card-search">{t('deck.searchCards')}</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="card-search"
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedAutocompleteIndex(-1);
              }}
              onKeyDown={(e) =>
                handleAutocompleteKeyDown(
                  e,
                  autocompleteSuggestions,
                  selectedAutocompleteIndex,
                  handleAutocompleteSelect
                )
              }
              placeholder={t('deck.searchPlaceholder')}
              className="pl-9 pr-20"
              aria-label={t('deck.searchCards')}
              aria-autocomplete="list"
              aria-expanded={autocompleteSuggestions.length > 0}
              aria-controls="autocomplete-suggestions"
              aria-busy={isLoadingAutocomplete}
              role="combobox"
            />
            {isLoadingAutocomplete && (
              <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => {
                  setSearchQuery('');
                  setAutocompleteSuggestions([]);
                }}
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant={useRegex ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUseRegex(!useRegex)}
            title={useRegex ? t('deck.regexEnabled') : t('deck.enableRegex')}
          >
            .*
          </Button>
        </div>

        {/* Autocomplete Suggestions */}
        {autocompleteSuggestions.length > 0 && (
          <div
            ref={autocompleteRef}
            id="autocomplete-suggestions"
            className="border rounded-md bg-card shadow-lg p-1 space-y-1 max-h-60 overflow-y-auto"
            role="listbox"
            aria-label={t('deck.searchCards')}
            aria-live="polite"
            aria-atomic="false"
          >
            {autocompleteSuggestions.map((name, index) => (
              <button
                key={name}
                onClick={() => handleAutocompleteSelect(name)}
                onMouseEnter={() => setSelectedAutocompleteIndex(index)}
                className={`w-full text-left text-sm px-3 py-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                  selectedAutocompleteIndex === index
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                }`}
                role="option"
                aria-selected={selectedAutocompleteIndex === index}
                tabIndex={selectedAutocompleteIndex === index ? 0 : -1}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t('deck.filters')}</Label>
          {hasActiveSearch && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t('common.clear')}
            </Button>
          )}
        </div>

        {/* Active Filter Badges */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter, index) => (
              <Badge
                key={`${filter.key}-${index}-${filter.value}`}
                variant="secondary"
                className="gap-1"
              >
                <span className="text-xs">
                  {filter.label}: {filter.value}
                </span>
                <button
                  onClick={() => {
                    if (filter.key === 'archetype' && filter.removeValue) {
                      handleRemoveArchetype(filter.removeValue);
                    } else {
                      removeFilter(filter.key);
                    }
                  }}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                  aria-label={`${t('common.close')} ${filter.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs" htmlFor="filter-type">
              {t('deck.cardType')}
            </Label>
            <Select
              value={filters.type || ''}
              onValueChange={(value) => handleFilterChange('type', value || undefined)}
            >
              <SelectTrigger id="filter-type" aria-label={t('deck.filterByType')}>
                <SelectValue placeholder={t('deck.filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal Monster">Normal Monster</SelectItem>
                <SelectItem value="Effect Monster">Effect Monster</SelectItem>
                <SelectItem value="Spell Card">Spell Card</SelectItem>
                <SelectItem value="Trap Card">Trap Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs" htmlFor="filter-attribute">
              {t('deck.attribute')}
            </Label>
            <Select
              value={filters.attribute || ''}
              onValueChange={(value) => handleFilterChange('attribute', value || undefined)}
            >
              <SelectTrigger id="filter-attribute" aria-label={t('deck.filterByAttribute')}>
                <SelectValue placeholder={t('deck.filterByAttribute')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LIGHT">LIGHT</SelectItem>
                <SelectItem value="DARK">DARK</SelectItem>
                <SelectItem value="EARTH">EARTH</SelectItem>
                <SelectItem value="WATER">WATER</SelectItem>
                <SelectItem value="FIRE">FIRE</SelectItem>
                <SelectItem value="WIND">WIND</SelectItem>
                <SelectItem value="DIVINE">DIVINE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs" htmlFor="filter-level">
              {t('deck.level')}
            </Label>
            <Select
              value={filters.level?.toString() || ''}
              onValueChange={(value) =>
                handleFilterChange('level', value ? parseInt(value, 10) : undefined)
              }
            >
              <SelectTrigger id="filter-level" aria-label={t('deck.filterByLevel')}>
                <SelectValue placeholder={t('deck.filterByLevel')} />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 13 }, (_, i) => i).map((level) => (
                  <SelectItem key={level} value={level.toString()}>
                    Level {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs" htmlFor="filter-atk-min">
              {t('deck.atk')} (Range)
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                id="filter-atk-min"
                type="number"
                placeholder="Min"
                value={atkRange.min}
                onChange={(e) => setAtkRange((prev) => ({ ...prev, min: e.target.value }))}
                className="w-20"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                id="filter-atk-max"
                type="number"
                placeholder="Max"
                value={atkRange.max}
                onChange={(e) => setAtkRange((prev) => ({ ...prev, max: e.target.value }))}
                className="w-20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs" htmlFor="filter-def-min">
              {t('deck.def')} (Range)
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                id="filter-def-min"
                type="number"
                placeholder="Min"
                value={defRange.min}
                onChange={(e) => setDefRange((prev) => ({ ...prev, min: e.target.value }))}
                className="w-20"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                id="filter-def-max"
                type="number"
                placeholder="Max"
                value={defRange.max}
                onChange={(e) => setDefRange((prev) => ({ ...prev, max: e.target.value }))}
                className="w-20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs" htmlFor="filter-race">
              {t('deck.race')}
            </Label>
            <div className="relative">
              <Input
                id="filter-race"
                value={filters.race || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFilterChange('race', value || undefined);
                }}
                onKeyDown={handleRaceKeyDown}
                placeholder={t('deck.filterByRace')}
                className="pr-8"
                aria-label={t('deck.filterByRace')}
                aria-autocomplete="list"
                aria-expanded={raceSuggestions.length > 0}
                aria-controls="race-suggestions"
                aria-busy={isLoadingRace}
                role="combobox"
              />
              {isLoadingRace && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {raceSuggestions.length > 0 && (
                <div
                  ref={raceRef}
                  id="race-suggestions"
                  className="absolute z-10 w-full mt-1 border rounded-md bg-card shadow-lg max-h-40 overflow-y-auto"
                  role="listbox"
                  aria-label={t('deck.filterByRace')}
                  aria-live="polite"
                  aria-atomic="false"
                >
                  {raceSuggestions.map((race, index) => (
                    <button
                      key={race}
                      type="button"
                      onClick={() => handleRaceSelect(race)}
                      onMouseEnter={() => setSelectedRaceIndex(index)}
                      className={`w-full text-left text-sm px-3 py-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                        selectedRaceIndex === index
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      }`}
                      role="option"
                      aria-selected={selectedRaceIndex === index}
                      tabIndex={selectedRaceIndex === index ? 0 : -1}
                    >
                      {race}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="text-xs" htmlFor="filter-archetype">
              {t('deck.archetype')}
            </Label>
            <div className="relative">
              <Input
                id="filter-archetype"
                value={archetypeInputValue}
                onChange={(e) => {
                  setArchetypeInputValue(e.target.value);
                }}
                onKeyDown={handleArchetypeKeyDown}
                placeholder={
                  Array.isArray(filters.archetype) && filters.archetype.length > 0
                    ? `${t('deck.filterByArchetype')} (${filters.archetype.length} ${t('common.selected')})`
                    : t('deck.filterByArchetype')
                }
                className="pr-8"
                aria-label={t('deck.filterByArchetype')}
                aria-autocomplete="list"
                aria-expanded={archetypeSuggestions.length > 0}
                aria-controls="archetype-suggestions"
                aria-busy={isLoadingArchetype}
                role="combobox"
              />
              {isLoadingArchetype && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {archetypeSuggestions.length > 0 && (
                <div
                  ref={archetypeRef}
                  id="archetype-suggestions"
                  className="absolute z-10 w-full mt-1 border rounded-md bg-card shadow-lg max-h-40 overflow-y-auto"
                  role="listbox"
                  aria-label={t('deck.filterByArchetype')}
                  aria-live="polite"
                  aria-atomic="false"
                >
                  {archetypeSuggestions.map((archetype, index) => (
                    <button
                      key={archetype}
                      type="button"
                      onClick={() => handleArchetypeSelect(archetype)}
                      onMouseEnter={() => setSelectedArchetypeIndex(index)}
                      className={`w-full text-left text-sm px-3 py-2 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                        selectedArchetypeIndex === index
                          ? 'bg-accent text-accent-foreground'
                          : 'hover:bg-accent/50'
                      }`}
                      role="option"
                      aria-selected={selectedArchetypeIndex === index}
                      tabIndex={selectedArchetypeIndex === index ? 0 : -1}
                    >
                      {archetype}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Sortierung */}
      {hasActiveSearch && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="sort-by" className="text-sm">
              {t('deck.sortBy')}
            </Label>
            <Select
              value={`${sortOptions.sortBy}-${sortOptions.order}`}
              onValueChange={(value) => {
                const [sortBy, order] = value.split('-') as [
                  CardSortOptions['sortBy'],
                  'asc' | 'desc',
                ];
                setSortOptions({ sortBy, order });
              }}
            >
              <SelectTrigger id="sort-by" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">{t('deck.sortByName')} (A-Z)</SelectItem>
                <SelectItem value="name-desc">{t('deck.sortByName')} (Z-A)</SelectItem>
                <SelectItem value="level-asc">{t('deck.sortByLevel')} (↑)</SelectItem>
                <SelectItem value="level-desc">{t('deck.sortByLevel')} (↓)</SelectItem>
                <SelectItem value="atk-asc">{t('deck.sortByAtk')} (↑)</SelectItem>
                <SelectItem value="atk-desc">{t('deck.sortByAtk')} (↓)</SelectItem>
                <SelectItem value="def-asc">{t('deck.sortByDef')} (↑)</SelectItem>
                <SelectItem value="def-desc">{t('deck.sortByDef')} (↓)</SelectItem>
                <SelectItem value="type-asc">{t('deck.sortByType')} (A-Z)</SelectItem>
                <SelectItem value="type-desc">{t('deck.sortByType')} (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {total > 0 && (
            <span className="text-sm text-muted-foreground">
              {t('deck.searchResultsCount', { count: total })}
            </span>
          )}
        </div>
      )}

      {/* Suchergebnisse */}
      <div
        className="space-y-2"
        role="region"
        aria-label={t('deck.searchResultsCount', { count: total })}
        aria-live="polite"
        aria-atomic="false"
      >
        {error ? (
          <UICard className="border-destructive" role="alert" aria-live="assertive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
                {t('deck.searchError')}
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => window.location.reload()}>{t('deck.searchRetry')}</Button>
            </CardContent>
          </UICard>
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border bg-card p-3">
                <div className="flex gap-3">
                  <Skeleton className="h-20 w-14 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : cards.length > 0 ? (
          <>
            {/* Debug: Zeige Anzahl Karten */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-muted-foreground mb-2">
                Debug: {cards.length} Karten geladen
              </div>
            )}
            <VirtualizedCardList
              cards={cards}
              onCardAdd={handleCardAdd}
              showAddButton={showAddButton}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  aria-label={t('common.previous')}
                >
                  {t('common.previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('common.page')} {page} {t('common.of')} {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  aria-label={t('common.next')}
                >
                  {t('common.next')}
                </Button>
              </div>
            )}
          </>
        ) : hasActiveSearch ? (
          <UICard>
            <CardContent className="pt-6">
              <div className="text-center py-8 space-y-2">
                <p className="text-muted-foreground">{t('common.noResults')}</p>
                <p className="text-sm text-muted-foreground">{t('deck.searchNoResultsHint')}</p>
              </div>
            </CardContent>
          </UICard>
        ) : (
          <UICard>
            <CardContent className="pt-6">
              <div className="text-center py-8 space-y-2">
                <p className="text-muted-foreground">{t('deck.searchEmptyState')}</p>
                <p className="text-sm text-muted-foreground">{t('deck.searchEmptyStateHint')}</p>
              </div>
            </CardContent>
          </UICard>
        )}
      </div>
    </div>
  );
}

/**
 * Virtualisierte Kartenliste für bessere Performance bei vielen Karten
 */
function VirtualizedCardList({
  cards,
  onCardAdd,
  showAddButton,
}: {
  cards: Card[];
  onCardAdd?: (cardId: string) => void;
  showAddButton?: boolean;
}) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: cards.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_CARD_ITEM_HEIGHT,
    overscan: VIRTUALIZATION_OVERSCAN,
  });

  // Debug-Logging für Virtualisierung
  useEffect(() => {
    if (cards.length > VIRTUALIZATION_THRESHOLD_CARD_SEARCH) {
      console.log('VirtualizedCardList: Using virtualization', {
        cardsCount: cards.length,
        virtualItems: virtualizer.getVirtualItems().length,
        totalSize: virtualizer.getTotalSize(),
      });
    }
  }, [cards.length, virtualizer]);

  if (cards.length <= VIRTUALIZATION_THRESHOLD_CARD_SEARCH) {
    // Keine Virtualisierung für kleine Listen
    if (cards.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">Keine Karten gefunden</div>;
    }
    return (
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {cards.map((card) => (
          <CardItem key={card.id} card={card} onAdd={onCardAdd} showAddButton={showAddButton} />
        ))}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="max-h-[600px] overflow-auto" style={{ contain: 'strict' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const card = cards[virtualItem.index];
          if (!card) {
            console.warn('VirtualizedCardList: Missing card at index', virtualItem.index);
            return null;
          }
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="p-1">
                <CardItem card={card} onAdd={onCardAdd} showAddButton={showAddButton} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
