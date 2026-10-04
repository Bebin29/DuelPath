import { StrictMode } from 'react';
import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeckPage } from '@/components/decks/DeckPage';
import type { DeckGame } from '@/lib/deck/games';
import type { DeckVersionView } from '@/server/actions/deck-view.actions';

const actions = vi.hoisted(() => ({
  add: vi.fn(),
  remove: vi.fn(),
  save: vi.fn().mockResolvedValue({ data: true }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/decks/d',
}));
vi.mock('@/components/cards/CardSheet', () => ({ useCardSheet: () => ({ open: vi.fn() }) }));
vi.mock('@/components/providers/SettingsProvider', () => ({
  useSettings: () => ({ settings: {} }),
  useCardLanguage: () => 'en',
}));
vi.mock('@/server/actions/deck-game.actions', () => ({
  addDeckGame: actions.add,
  deleteDeckGame: actions.remove,
}));
vi.mock('@/server/actions/deck-view.actions', () => ({
  saveDeck: actions.save,
  getDeckView: vi.fn(),
  createDeckVersion: vi.fn(),
  deleteDeckVersion: vi.fn(),
}));
vi.mock('@/server/actions/deck.actions', () => ({ importYdkToDeck: vi.fn() }));
vi.mock('@/components/decks/DeckListTab', () => ({ DeckListTab: () => null }));
vi.mock('@/components/decks/DeckCombosTab', () => ({ DeckCombosTab: () => null }));
vi.mock('@/components/decks/HandTester', () => ({ HandTester: () => null }));
vi.mock('@/components/decks/RatiosTab', () => ({
  RatiosTab: ({ comparison }: { comparison: React.ReactNode }) => comparison,
}));
vi.mock('@/components/decks/DeckVersions', () => ({
  DeckVersions: ({
    versions,
    onRestore,
  }: {
    versions: DeckVersionView[];
    onRestore: (v: DeckVersionView) => void;
  }) => <button onClick={() => onRestore(versions[0])}>Restore test version</button>,
}));

const plan = { id: 'p1', matchup: 'Ryzeal', going: 'second' as const, in: {}, out: {} };
const game: DeckGame = {
  id: 'g1',
  sidePlanId: 'p1',
  matchup: 'Ryzeal',
  going: 'second',
  result: 'win',
  note: 'Historical result',
  playedAt: '2026-10-03T12:00:00Z',
};
const renderDeck = (games: DeckGame[] = [game], strict = false) =>
  render(
    <DeckPage
      deck={{
        id: 'd',
        name: 'Deck',
        entries: [],
        cards: [],
        roles: {},
        sidePlans: [plan],
        versions: [
          {
            id: 'v',
            name: 'Old version',
            entries: [],
            roles: {},
            createdAt: '2026-10-01T00:00:00Z',
          },
        ],
        games,
      }}
      combos={[]}
      comboCards={{}}
      handtraps={[]}
      staples={[]}
      banlists={{ current: null, next: null }}
      initialTab="side"
    />,
    // Wie Next.js im Entwicklungsmodus: Effekte laufen beim Einhängen zweimal
    { wrapper: strict ? StrictMode : undefined }
  );

it('behält nach explizitem Löschen des Plans das Spiel sichtbar ohne Planbezug', async () => {
  vi.clearAllMocks();
  const user = userEvent.setup();
  renderDeck();
  await user.click(screen.getByRole('button', { name: /Plan löschen|Delete plan/ }));
  expect(screen.getByText('Historical result')).toBeInTheDocument();
  expect(screen.getByText(/Ohne Planbezug|No linked plan/)).toBeInTheDocument();
  expect(screen.queryByText(/mit diesem Plan|with this plan/)).not.toBeInTheDocument();
  await waitFor(() => expect(actions.save).toHaveBeenCalled());
  expect(actions.save.mock.lastCall?.[1]).not.toHaveProperty('games');
  expect(actions.remove).not.toHaveBeenCalled();
});

it('Strg+Z nimmt einen neuen Side-Plan zurück, aber nicht dessen neu eingetragenes Spiel', async () => {
  vi.clearAllMocks();
  actions.add.mockImplementation(async (_deck, input) => ({
    data: { ...game, ...input, note: 'New result' },
  }));
  const user = userEvent.setup();
  renderDeck([]);
  await user.click(screen.getByRole('button', { name: /^Matchup$/ }));
  await user.click(screen.getByRole('button', { name: /Spiel eintragen|Log a game/ }));
  await user.click(screen.getByRole('button', { name: /Sieg eintragen|Log a win/ }));
  expect(screen.getByText('New result')).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
  expect(screen.getByText('New result')).toBeInTheDocument();
  expect(screen.getByText(/Ohne Planbezug|No linked plan/)).toBeInTheDocument();
  expect(actions.add).toHaveBeenCalledTimes(1);
  expect(actions.remove).not.toHaveBeenCalled();
});

it('Zurückholen einer DeckVersion verändert keine Spiele', async () => {
  vi.clearAllMocks();
  const user = userEvent.setup();
  renderDeck();
  await user.click(screen.getByRole('tab', { name: /Quoten|Ratios/ }));
  await user.click(screen.getByRole('button', { name: 'Restore test version' }));
  await user.click(screen.getByRole('tab', { name: /Side/ }));
  expect(screen.getByText('Historical result')).toBeInTheDocument();
  expect(screen.getByText(/1 (zu|to) 0/)).toBeInTheDocument();
  await waitFor(() => expect(actions.save).toHaveBeenCalled());
  expect(actions.save.mock.lastCall?.[1]).not.toHaveProperty('games');
  expect(actions.add).not.toHaveBeenCalled();
  expect(actions.remove).not.toHaveBeenCalled();
});

it('speichert beim bloßen Öffnen nichts, auch im Strict Mode', async () => {
  vi.clearAllMocks();
  renderDeck([game], true);
  await new Promise((resolve) => setTimeout(resolve, 900));
  expect(actions.save).not.toHaveBeenCalled();
});
