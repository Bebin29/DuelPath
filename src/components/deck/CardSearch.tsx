"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "@/lib/i18n/hooks";
import { Input } from "@/components/components/ui/input";
import { Button } from "@/components/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/components/ui/select";
import { Label } from "@/components/components/ui/label";
import { CardItem } from "./CardItem";
import type { Card } from "@prisma/client";
import type { CardSearchFilter } from "@/types/card.types";
import { Search, X } from "lucide-react";

interface CardSearchProps {
  onCardSelect?: (cardId: string) => void;
  showAddButton?: boolean;
}

/**
 * Kartensuche mit Filtern und Autocomplete
 */
export function CardSearch({ onCardSelect, showAddButton = true }: CardSearchProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<CardSearchFilter>({});
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<string[]>([]);
  const [archetypeSuggestions, setArchetypeSuggestions] = useState<string[]>([]);
  const [raceSuggestions, setRaceSuggestions] = useState<string[]>([]);

  // Debounced Search - useRef statt useState um Endlosschleife zu vermeiden
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (query: string, filterData: CardSearchFilter, pageNum: number) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("name", query);
      if (filterData.type) params.set("type", filterData.type);
      if (filterData.attribute) params.set("attribute", filterData.attribute);
      if (filterData.level !== undefined) params.set("level", filterData.level.toString());
      if (filterData.archetype) params.set("archetype", filterData.archetype);
      if (filterData.race) params.set("race", filterData.race);
      params.set("page", pageNum.toString());
      params.set("limit", "20");

      const response = await fetch(`/api/cards?${params.toString()}`);
      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      setCards(data.cards || []);
      setTotalPages(data.totalPages || 1);
      setPage(data.page || 1);
    } catch (error) {
      console.error("Card search error:", error);
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const performAutocomplete = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setAutocompleteSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/cards?autocomplete=true&query=${encodeURIComponent(query)}&limit=5`);
      if (!response.ok) return;

      const data = await response.json();
      setAutocompleteSuggestions(data.names || []);
    } catch (error) {
      console.error("Autocomplete error:", error);
    }
  }, []);

  const performArchetypeAutocomplete = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setArchetypeSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/cards?archetype=${encodeURIComponent(query)}&limit=10`);
      if (!response.ok) return;

      const data = await response.json();
      // Extrahiere eindeutige Archetypes aus den Ergebnissen
      const archetypes = new Set<string>();
      data.cards?.forEach((card: { archetype?: string | null }) => {
        if (card.archetype) {
          archetypes.add(card.archetype);
        }
      });
      setArchetypeSuggestions(Array.from(archetypes).slice(0, 5));
    } catch (error) {
      console.error("Archetype autocomplete error:", error);
    }
  }, []);

  const performRaceAutocomplete = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setRaceSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`/api/cards?race=${encodeURIComponent(query)}&limit=10`);
      if (!response.ok) return;

      const data = await response.json();
      // Extrahiere eindeutige Races aus den Ergebnissen
      const races = new Set<string>();
      data.cards?.forEach((card: { race?: string | null }) => {
        if (card.race) {
          races.add(card.race);
        }
      });
      setRaceSuggestions(Array.from(races).slice(0, 5));
    } catch (error) {
      console.error("Race autocomplete error:", error);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const timer = setTimeout(() => {
      if (searchQuery.length >= 2 || Object.keys(filters).length > 0) {
        performSearch(searchQuery, filters, 1);
      } else {
        setCards([]);
      }
      performAutocomplete(searchQuery);
    }, 300);

    debounceTimerRef.current = timer;

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchQuery, filters, performSearch, performAutocomplete]);

  function handleFilterChange(key: keyof CardSearchFilter, value: string | number | undefined) {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(1);
  }

  function clearFilters() {
    setFilters({});
    setSearchQuery("");
    setCards([]);
  }

  function handleCardAdd(cardId: string) {
    if (onCardSelect) {
      onCardSelect(cardId);
    }
  }

  return (
    <div className="space-y-4">
      {/* Suchfeld */}
      <div className="space-y-2">
        <Label>{t("deck.searchCards")}</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("deck.searchPlaceholder")}
            className="pl-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Autocomplete Suggestions */}
        {autocompleteSuggestions.length > 0 && (
          <div className="border rounded-md bg-card p-2 space-y-1">
            {autocompleteSuggestions.map((name) => (
              <button
                key={name}
                onClick={() => {
                  setSearchQuery(name);
                  setAutocompleteSuggestions([]);
                }}
                className="w-full text-left text-sm px-2 py-1 hover:bg-accent rounded"
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
          <Label>{t("deck.filters")}</Label>
          {(Object.keys(filters).length > 0 || searchQuery) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t("common.clear")}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">{t("deck.cardType")}</Label>
            <Select
              value={filters.type || ""}
              onValueChange={(value) => handleFilterChange("type", value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("deck.filterByType")} />
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
            <Label className="text-xs">{t("deck.attribute")}</Label>
            <Select
              value={filters.attribute || ""}
              onValueChange={(value) => handleFilterChange("attribute", value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("deck.filterByAttribute")} />
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
            <Label className="text-xs">{t("deck.level")}</Label>
            <Select
              value={filters.level?.toString() || ""}
              onValueChange={(value) =>
                handleFilterChange("level", value ? parseInt(value, 10) : undefined)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("deck.filterByLevel")} />
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
            <Label className="text-xs">{t("deck.race")}</Label>
            <div className="relative">
              <Input
                value={filters.race || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFilterChange("race", value || undefined);
                  performRaceAutocomplete(value);
                }}
                placeholder={t("deck.filterByRace")}
                className="pr-8"
              />
              {raceSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 border rounded-md bg-card shadow-lg max-h-40 overflow-y-auto">
                  {raceSuggestions.map((race) => (
                    <button
                      key={race}
                      type="button"
                      onClick={() => {
                        handleFilterChange("race", race);
                        setRaceSuggestions([]);
                      }}
                      className="w-full text-left text-sm px-3 py-2 hover:bg-accent rounded"
                    >
                      {race}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 col-span-2">
            <Label className="text-xs">{t("deck.archetype")}</Label>
            <div className="relative">
              <Input
                value={filters.archetype || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFilterChange("archetype", value || undefined);
                  performArchetypeAutocomplete(value);
                }}
                placeholder={t("deck.filterByArchetype")}
                className="pr-8"
              />
              {archetypeSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 border rounded-md bg-card shadow-lg max-h-40 overflow-y-auto">
                  {archetypeSuggestions.map((archetype) => (
                    <button
                      key={archetype}
                      type="button"
                      onClick={() => {
                        handleFilterChange("archetype", archetype);
                        setArchetypeSuggestions([]);
                      }}
                      className="w-full text-left text-sm px-3 py-2 hover:bg-accent rounded"
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

      {/* Suchergebnisse */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("common.loading")}
          </div>
        ) : cards.length > 0 ? (
          <>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {cards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  onAdd={handleCardAdd}
                  showAddButton={showAddButton}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => performSearch(searchQuery, filters, page - 1)}
                  disabled={page <= 1}
                >
                  {t("common.previous")}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t("common.page")} {page} {t("common.of")} {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => performSearch(searchQuery, filters, page + 1)}
                  disabled={page >= totalPages}
                >
                  {t("common.next")}
                </Button>
              </div>
            )}
          </>
        ) : searchQuery || Object.keys(filters).length > 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("common.noResults")}
          </div>
        ) : null}
      </div>
    </div>
  );
}


