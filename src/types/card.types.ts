import type { Card } from "@prisma/client";

/**
 * Karten-Suchfilter
 */
export interface CardSearchFilter {
  name?: string;
  type?: string;
  race?: string;
  attribute?: string;
  level?: number;
  atk?: number;
  def?: number;
  archetype?: string;
  banlistInfo?: string;
}

/**
 * Karten-Sortierung
 */
export type CardSortBy =
  | "name"
  | "type"
  | "level"
  | "atk"
  | "def"
  | "archetype";

export type CardSortOrder = "asc" | "desc";

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


