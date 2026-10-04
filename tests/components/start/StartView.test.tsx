import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import i18n from '@/lib/i18n/config';

// Neue Combo und Einstellungen hängen an Server Actions und damit an NextAuth
vi.mock('@/components/library/NewComboButton', () => ({ NewComboButton: () => null }));
vi.mock('@/components/providers/SettingsProvider', () => ({ useCardLanguage: () => 'en' }));
// Exit-Animationen enden in jsdom nicht: das Wechselwort tauscht ohne Übergang
vi.mock('motion/react', async (original) => ({
  ...(await original<typeof import('motion/react')>()),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

import { StartView } from '@/components/start/StartView';

describe('StartView Headline', () => {
  afterEach(async () => {
    vi.useRealTimers();
    await i18n.changeLanguage('de');
  });

  it.each([
    ['de', 'Wo stoppt dich Ash?'],
    ['en', 'Where does Ash stop you?'],
  ])('%s: liest sich als ganzer Satz mit dem Wort an seiner Stelle', async (lng, sentence) => {
    await i18n.changeLanguage(lng);
    render(<StartView combos={[]} cards={{}} decks={[]} />);
    expect(screen.getByRole('heading', { level: 1, name: sentence })).toBeInTheDocument();
  });

  it('behält für Screenreader denselben Namen, während das Wort sichtbar wechselt', () => {
    vi.useFakeTimers();
    render(<StartView combos={[]} cards={{}} decks={[]} />);
    act(() => vi.advanceTimersByTime(2600));
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Imperm');
    expect(heading).toHaveAccessibleName('Wo stoppt dich Ash?');
  });

  it('beantwortet die Frage mit dem Stresstest der letzten Line', () => {
    const stress = [
      { word: 'Ash', step: 2 },
      { word: 'Nibiru', step: null },
    ];
    render(<StartView combos={[]} stress={stress} cards={{}} decks={[]} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveAccessibleName('Wo stoppt dich Ash?');
    expect(screen.getByText('In Schritt 2.', { selector: '.sr-only' })).toBeInTheDocument();
  });

  it('streicht einen Staple durch, der die Line nicht trifft', () => {
    vi.useFakeTimers();
    const stress = [
      { word: 'Ash', step: 2 },
      { word: 'Nibiru', step: null },
    ];
    render(<StartView combos={[]} stress={stress} cards={{}} decks={[]} />);
    act(() => vi.advanceTimersByTime(3400));
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Nibiru');
    expect(screen.getByText('Gar nicht.', { selector: '[aria-hidden] span' })).toBeInTheDocument();
  });
});
