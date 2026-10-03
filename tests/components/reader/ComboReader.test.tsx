import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_SETTINGS } from '@/lib/settings';

// Einstellungen, Kartenblatt und Speichern hängen an Server Actions und damit an NextAuth
vi.mock('@/components/providers/SettingsProvider', () => ({
  useCardLanguage: () => 'en',
  useSettings: () => ({ settings: DEFAULT_SETTINGS, update: () => {} }),
}));
vi.mock('@/components/cards/CardSheet', () => ({
  useCardSheet: () => ({ open: () => Promise.resolve() }),
}));
vi.mock('@/server/actions/combo.actions', () => ({
  saveCombo: () => Promise.resolve({ data: { revision: 2 } }),
}));
vi.mock('@/components/command/CommandPalette', () => ({
  usePalette: () => ({ open: () => {}, close: () => {} }),
  usePaletteSource: () => {},
}));

import { ComboReader } from '@/components/reader/ComboReader';
import type { ComboNodeData, StartState } from '@/lib/combo/state';

const node = (id: string, parentId: string | null): ComboNodeData => ({
  id,
  parentId,
  kind: 'ACTION',
  player: 'self',
  action: 'OTHER',
  edgeLabel: id,
});

const combo = {
  id: 'c1',
  title: 'Branded Despia',
  deckId: null,
  tags: [],
  status: 'DRAFT' as const,
  revision: 1,
  startState: { cards: [] } satisfies StartState,
  nodes: [node('a', null), node('b', 'a'), node('c', 'b')],
  cards: [],
};

const openReader = () => render(<ComboReader initial={combo} staples={[]} />);

describe('ComboReader · Übungsmodus', () => {
  it('startet bei der Starthand mit stehender Uhr', () => {
    openReader();
    expect(screen.getByText('0:00')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Uhr weiterlaufen lassen' })).toBeTruthy();
  });

  it('lässt die Zeit laufen, sobald jemand einen Schritt weiter geht', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      openReader();
      fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3_000);
      });
      expect(screen.getByText('0:03')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Uhr anhalten' })).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('zeigt die Schrittzahl der Line in der Positionszeile', () => {
    openReader();
    expect(screen.getByText('Schritt 0 von 3')).toBeTruthy();
  });

  it('hält am Ende der Line an und sagt, was das Durchspielen gekostet hat', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      openReader();
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));
        await act(async () => {
          await vi.advanceTimersByTimeAsync(2_000);
        });
      }
      // Der letzte Abschnitt zählt nicht mehr mit: nach dem dritten Schritt steht die Uhr
      expect(screen.getByText('0:04')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Uhr weiterlaufen lassen' })).toBeTruthy();
      expect(screen.getByText('Gebraucht: 0:04 für 3 Schritte')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});
