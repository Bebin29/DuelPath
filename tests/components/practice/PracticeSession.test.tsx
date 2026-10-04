import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PracticeSetup } from '@/lib/deck/practice';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
// Die Werkbank erscheint erst im Lauf; die Einleitung braucht sie nicht
vi.mock('@/components/workbench/Workbench', () => ({ Workbench: () => null }));
vi.mock('@/components/providers/SettingsProvider', () => ({ useCardLanguage: () => 'en' }));

import { PracticeSession } from '@/components/practice/PracticeSession';

const setup = (over: Partial<PracticeSetup>): PracticeSetup => ({
  deckId: 'd1',
  deckName: 'Branded',
  pool: [],
  entries: [],
  cards: [],
  targets: [],
  comboCount: 0,
  ...over,
});

describe('PracticeSession Einleitung', () => {
  it('sagt ohne Combo, dass erst eine Line fehlt', () => {
    render(<PracticeSession setup={setup({})} staples={[]} decks={[]} />);
    expect(screen.getByText(/noch keine Line gespeichert/)).toBeInTheDocument();
  });

  it('erklärt bei vorhandener, aber nicht übbarer Combo, woran es liegt', () => {
    render(<PracticeSession setup={setup({ comboCount: 1 })} staples={[]} decks={[]} />);
    expect(screen.getByText(/Am Deck hängt 1 Combo, aber sie lässt sich/)).toBeInTheDocument();
    expect(screen.queryByText(/noch keine Line gespeichert/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zu den Combos des Decks' })).toHaveAttribute(
      'href',
      '/decks/d1?tab=combos'
    );
  });
});
