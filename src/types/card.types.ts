import type { Card } from '@prisma/client';

/**
 * Karten-Suchfilter
 */
export interface CardSearchFilter {
  name?: string;
  type?: string;
  race?: string;
  attribute?: string;
  level?: number;
  atk?: number; // Exakter ATK-Wert
  def?: number; // Exakter DEF-Wert
  atkMin?: number; // Minimum ATK für Range
  atkMax?: number; // Maximum ATK für Range
  defMin?: number; // Minimum DEF für Range
  defMax?: number; // Maximum DEF für Range
  archetype?: string | string[]; // Unterstützt einzelne oder mehrere Archetypes
  banlistInfo?: string;
  useRegex?: boolean; // Regex-Support für Name-Suche
}

/**
 * Karten-Sortierung
 */
export type CardSortBy = 'name' | 'type' | 'level' | 'atk' | 'def' | 'archetype';

export type CardSortOrder = 'asc' | 'desc';

/**
 * Karten-Sortier-Optionen
 */
export interface CardSortOptions {
  sortBy: CardSortBy;
  order: CardSortOrder;
}

/**
 * Karten-Liste mit Pagination
 */
export interface CardListResult {
  cards: Card[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
