/**
 * Unit-Tests für Deck-Utilities
 */

import { describe, it, expect } from 'vitest';
import {
  findDeckCard,
  getDeckCardsBySection,
  getSectionTotal,
  createYDKContent,
  parseYDKFile,
} from '@/lib/utils/deck.utils';
import type { DeckWithCards } from '@/lib/hooks/use-deck-history';
import type { DeckSection } from '@/lib/validations/deck.schema';

describe('deck.utils', () => {
  const mockDeck: DeckWithCards = {
    id: 'deck-1',
    name: 'Test Deck',
    description: 'Test Description',
    format: 'TCG',
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deckCards: [
      {
        id: 'dc-1',
        deckId: 'deck-1',
        cardId: 'card-1',
        quantity: 2,
        deckSection: 'MAIN',
        card: {
          id: 'card-1',
          name: 'Test Card 1',
          type: 'Effect Monster',
          race: 'Warrior',
          attribute: 'LIGHT',
          level: 4,
          atk: 1800,
          def: 1200,
          archetype: null,
          imageSmall: null,
          passcode: '12345678',
        },
      },
      {
        id: 'dc-2',
        deckId: 'deck-1',
        cardId: 'card-2',
        quantity: 1,
        deckSection: 'EXTRA',
        card: {
          id: 'card-2',
          name: 'Test Card 2',
          type: 'Fusion Monster',
          race: 'Dragon',
          attribute: 'DARK',
          level: 8,
          atk: 3000,
          def: 2500,
          archetype: null,
          imageSmall: null,
          passcode: '87654321',
        },
      },
      {
        id: 'dc-3',
        deckId: 'deck-1',
        cardId: 'card-3',
        quantity: 3,
        deckSection: 'MAIN',
        card: {
          id: 'card-3',
          name: 'Test Card 3',
          type: 'Spell Card',
          race: null,
          attribute: null,
          level: null,
          atk: null,
          def: null,
          archetype: null,
          imageSmall: null,
          passcode: '11111111',
        },
      },
    ],
  };

  describe('findDeckCard', () => {
    it('sollte eine DeckCard finden', () => {
      const result = findDeckCard(mockDeck, 'card-1', 'MAIN');
      expect(result).toBeDefined();
      expect(result?.cardId).toBe('card-1');
      expect(result?.deckSection).toBe('MAIN');
    });

    it('sollte null zurückgeben wenn Karte nicht gefunden', () => {
      const result = findDeckCard(mockDeck, 'card-999', 'MAIN');
      expect(result).toBeNull();
    });

    it('sollte null zurückgeben wenn Deck null ist', () => {
      const result = findDeckCard(null, 'card-1', 'MAIN');
      expect(result).toBeNull();
    });
  });

  describe('getDeckCardsBySection', () => {
    it('sollte alle Karten einer Sektion zurückgeben', () => {
      const result = getDeckCardsBySection(mockDeck, 'MAIN');
      expect(result).toHaveLength(2);
      expect(result.every((dc) => dc.deckSection === 'MAIN')).toBe(true);
    });

    it('sollte leeres Array zurückgeben wenn keine Karten in Sektion', () => {
      const result = getDeckCardsBySection(mockDeck, 'SIDE');
      expect(result).toHaveLength(0);
    });

    it('sollte leeres Array zurückgeben wenn Deck null ist', () => {
      const result = getDeckCardsBySection(null, 'MAIN');
      expect(result).toHaveLength(0);
    });
  });

  describe('getSectionTotal', () => {
    it('sollte Gesamtanzahl der Karten in einer Sektion berechnen', () => {
      const result = getSectionTotal(mockDeck, 'MAIN');
      expect(result).toBe(5); // 2 + 3
    });

    it('sollte 0 zurückgeben wenn keine Karten in Sektion', () => {
      const result = getSectionTotal(mockDeck, 'SIDE');
      expect(result).toBe(0);
    });

    it('sollte 0 zurückgeben wenn Deck null ist', () => {
      const result = getSectionTotal(null, 'MAIN');
      expect(result).toBe(0);
    });
  });

  describe('createYDKContent', () => {
    it('sollte YDK-Format-String erstellen', () => {
      const result = createYDKContent(mockDeck);
      expect(result).toContain('#created by DuelPath');
      expect(result).toContain('#main');
      expect(result).toContain('#extra');
      expect(result).toContain('!side');
      // YDK verwendet passcode, nicht card.id
      expect(result).toContain('12345678'); // passcode von card-1
      expect(result).toContain('87654321'); // passcode von card-2
      expect(result).toContain('11111111'); // passcode von card-3
    });

    it('sollte korrekte Anzahl von Karten pro Sektion enthalten', () => {
      const result = createYDKContent(mockDeck);
      const mainMatches =
        result
          .match(/#main\n([\s\S]*?)\n#extra/)?.[1]
          ?.trim()
          .split('\n') || [];
      const mainCards = mainMatches.filter((line) => line && !line.startsWith('#'));
      // YDK verwendet passcode, nicht card.id
      expect(mainCards.length).toBe(5); // 2x card-1 + 3x card-3
    });
  });

  describe('parseYDKFile', () => {
    it('sollte YDK-Datei korrekt parsen', () => {
      const ydkContent = `#created by DuelPath
#main
card-1
card-1
card-3
#extra
card-2
!side
card-4
card-4
`;
      const result = parseYDKFile(ydkContent);
      expect(result.main).toHaveLength(3);
      expect(result.extra).toHaveLength(1);
      expect(result.side).toHaveLength(2);
      // YDK verwendet passcode, nicht card.id
      expect(result.main.length).toBeGreaterThan(0);
      expect(result.extra.length).toBeGreaterThan(0);
      expect(result.side.length).toBeGreaterThan(0);
    });

    it('sollte leere Arrays zurückgeben wenn Sektionen fehlen', () => {
      const ydkContent = `#main
card-1
`;
      const result = parseYDKFile(ydkContent);
      expect(result.main.length).toBeGreaterThan(0);
      expect(result.extra).toHaveLength(0);
      expect(result.side).toHaveLength(0);
    });

    it('sollte Kommentare und leere Zeilen ignorieren', () => {
      const ydkContent = `#created by DuelPath
#main
card-1

# Kommentar
card-2
#extra
card-3
`;
      const result = parseYDKFile(ydkContent);
      expect(result.main.filter((c) => c && !c.startsWith('#')).length).toBe(2);
      expect(result.extra.filter((c) => c && !c.startsWith('#')).length).toBe(1);
    });
  });
});
