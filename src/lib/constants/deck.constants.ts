/**
 * Konstanten für Deck-Verwaltung
 */

/**
 * Maximale Anzahl Kopien einer Karte pro Deck
 */
export const MAX_CARD_COPIES = 3;

/**
 * Debounce-Zeit in Millisekunden für Such-Inputs
 */
export const DEBOUNCE_MS = 300;

/**
 * Cache-TTL für Autocomplete-Ergebnisse in Millisekunden (5 Minuten)
 */
export const AUTOCOMPLETE_TTL = 5 * 60 * 1000;

/**
 * Maximale Cache-Größe für Autocomplete-Ergebnisse
 */
export const AUTOCOMPLETE_CACHE_MAX_SIZE = 100;

/**
 * Schwellenwert für Virtualisierung in CardSearch (Anzahl Items)
 * Virtualisierung wird nur verwendet, wenn mehr Karten als dieser Wert vorhanden sind
 */
export const VIRTUALIZATION_THRESHOLD_CARD_SEARCH = 50;

/**
 * Schwellenwert für Virtualisierung in DeckListSection (Anzahl Items)
 * Virtualisierung wird nur verwendet, wenn mehr Karten als dieser Wert vorhanden sind
 */
export const VIRTUALIZATION_THRESHOLD_DECK_LIST = 100;

/**
 * Geschätzte Höhe einer Karte in der CardSearch-Liste (in px)
 */
export const ESTIMATED_CARD_ITEM_HEIGHT = 100;

/**
 * Geschätzte Höhe einer Deck-Karte in der DeckListSection (in px)
 */
export const ESTIMATED_DECK_CARD_HEIGHT = 80;

/**
 * Overscan-Anzahl für Virtualisierung (Items außerhalb des Viewports)
 */
export const VIRTUALIZATION_OVERSCAN = 5;

/**
 * Drag-Aktivierungsdistanz in Pixeln
 */
export const DRAG_ACTIVATION_DISTANCE = 8;

