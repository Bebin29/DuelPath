/**
 * Utility-Funktionen für Deck-Operationen
 */

import type { DeckWithCards } from "@/lib/hooks/use-deck-history";
import type { DeckSection } from "@/lib/validations/deck.schema";

/**
 * Findet eine DeckCard anhand von cardId und section
 */
export function findDeckCard(
  deck: DeckWithCards | null,
  cardId: string,
  section: DeckSection
) {
  if (!deck) return null;
  return deck.deckCards.find(
    (dc) => dc.cardId === cardId && dc.deckSection === section
  ) || null;
}

/**
 * Findet alle DeckCards für eine bestimmte Sektion
 */
export function getDeckCardsBySection(
  deck: DeckWithCards | null,
  section: DeckSection
) {
  if (!deck) return [];
  return deck.deckCards.filter((dc) => dc.deckSection === section);
}

/**
 * Berechnet die Gesamtanzahl der Karten in einer Sektion
 */
export function getSectionTotal(
  deck: DeckWithCards | null,
  section: DeckSection
): number {
  if (!deck) return 0;
  return deck.deckCards
    .filter((dc) => dc.deckSection === section)
    .reduce((sum, dc) => sum + dc.quantity, 0);
}

/**
 * Erstellt ein YDK-Format-String aus einem Deck
 */
export function createYDKContent(deck: DeckWithCards): string {
  const mainDeck = deck.deckCards
    .filter((dc) => dc.deckSection === "MAIN")
    .flatMap((dc) => Array(dc.quantity).fill(dc.cardId))
    .join("\n");

  const extraDeck = deck.deckCards
    .filter((dc) => dc.deckSection === "EXTRA")
    .flatMap((dc) => Array(dc.quantity).fill(dc.cardId))
    .join("\n");

  const sideDeck = deck.deckCards
    .filter((dc) => dc.deckSection === "SIDE")
    .flatMap((dc) => Array(dc.quantity).fill(dc.cardId))
    .join("\n");

  return `#created by DuelPath
#main
${mainDeck}
#extra
${extraDeck}
!side
${sideDeck}
`;
}

/**
 * Parst eine YDK-Datei und gibt die Sektionen zurück
 */
export function parseYDKFile(content: string): {
  main: string[];
  extra: string[];
  side: string[];
} {
  const textLower = content.toLowerCase();
  const main: string[] = [];
  const extra: string[] = [];
  const side: string[] = [];

  const mainStart = textLower.indexOf("#main");
  const extraStart = textLower.indexOf("#extra");
  const sideStart = textLower.indexOf("!side");

  if (mainStart >= 0) {
    const mainEnd = extraStart >= 0 ? extraStart : (sideStart >= 0 ? sideStart : content.length);
    const mainContent = content.substring(mainStart, mainEnd);
    main.push(...mainContent.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")));
  }

  if (extraStart >= 0) {
    const extraEnd = sideStart >= 0 ? sideStart : content.length;
    const extraContent = content.substring(extraStart, extraEnd);
    extra.push(...extraContent.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")));
  }

  if (sideStart >= 0) {
    const sideContent = content.substring(sideStart);
    side.push(...sideContent.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("!")));
  }

  return { main, extra, side };
}

/**
 * Downloadet eine Datei im Browser
 */
export function downloadFile(content: string, filename: string, mimeType: string = "text/plain"): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

