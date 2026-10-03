import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameLog } from '@/components/decks/GameLog';
import type { DeckGame, GameResult } from '@/lib/deck/games';
import type { SidePlan } from '@/lib/deck/side-plan';

const plan: SidePlan = { id: 'p1', matchup: 'Ryzeal', going: 'second', in: {}, out: {} };

let n = 0;
const game = (result: GameResult, g: Partial<DeckGame> = {}): DeckGame => ({
  id: `g${n++}`,
  sidePlanId: 'p1',
  matchup: 'Ryzeal',
  going: 'second',
  result,
  note: null,
  playedAt: '2026-10-03T12:00:00.000Z',
  ...g,
});

const log = (games: DeckGame[], props: Partial<Parameters<typeof GameLog>[0]> = {}) =>
  render(
    <GameLog
      plan={plan}
      games={games}
      plans={[plan]}
      matchups={['Ryzeal', 'Snake-Eye']}
      onAdd={vi.fn().mockResolvedValue(true)}
      onDelete={vi.fn().mockResolvedValue(true)}
      {...props}
    />
  );

const wins = (count: number) => Array.from({ length: count }, () => game('win'));

describe('GameLog', () => {
  it('zeigt ohne Einträge keine Bilanz', () => {
    log([]);
    expect(screen.queryByText(/mit diesem Plan|with this plan/)).not.toBeInTheDocument();
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });

  it('zeigt die Bilanz als rohe Zahlen, ohne Prozent', () => {
    log([...wins(5), game('loss'), game('loss')]);
    expect(screen.getByText(/5 (zu|to) 2/)).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('nennt Unentschieden getrennt statt sie in die Bilanz zu rechnen', () => {
    log([game('win'), game('loss'), game('draw')]);
    expect(screen.getByText(/1 (zu|to) 1/)).toBeInTheDocument();
    expect(screen.getByText(/1 (unentschieden|drawn)/)).toBeInTheDocument();
  });

  it('trägt mit einem Klick ein, Matchup und Zugfolge aus dem Plan', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(true);
    log([], { onAdd });

    await user.click(screen.getByRole('button', { name: /Spiel eintragen|Log a game/ }));
    await user.click(screen.getByRole('button', { name: /Sieg eintragen|Log a win/ }));
    expect(onAdd).toHaveBeenCalledWith({
      sidePlanId: 'p1',
      matchup: 'Ryzeal',
      going: 'second',
      result: 'win',
      note: null,
    });
  });

  it('nimmt eine Notiz mit und leert das Feld danach', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(true);
    log([], { onAdd });

    await user.click(screen.getByRole('button', { name: /Spiel eintragen|Log a game/ }));
    const note = screen.getByRole('textbox', { name: /Notiz zum Spiel|Note on the game/ });
    await user.type(note, 'Brick nach dem Siden');
    await user.click(screen.getByRole('button', { name: /Niederlage eintragen|Log a loss/ }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ note: 'Brick nach dem Siden' }));
    expect(note).toHaveValue('');
  });

  it('zeigt auch Einträge anderer oder verschwundener Pläne und löscht einzeln', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(true);
    log([game('win'), game('loss', { sidePlanId: 'p2', matchup: 'Snake-Eye' })], { onDelete });

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: /Eintrag löschen|Delete entry/ })[0]);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

it('lässt auch ohne Side-Plan ein Spiel eintragen', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn().mockResolvedValue(true);
  log([], { plan: null, plans: [], onAdd });
  expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Spiel eintragen|Log a game/ }));
  await user.type(
    screen.getByRole('combobox', { name: /Matchup des Spiels|Game matchup/ }),
    'Ryzeal'
  );
  await user.click(screen.getByRole('button', { name: /Sieg eintragen|Log a win/ }));
  expect(onAdd).toHaveBeenCalledWith(
    expect.objectContaining({ sidePlanId: null, matchup: 'Ryzeal' })
  );
});

it('behält bei Speicherfehlern die Notiz und erlaubt einen erneuten Versuch', async () => {
  const user = userEvent.setup();
  const onAdd = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(true);
  log([], { onAdd });
  await user.click(screen.getByRole('button', { name: /Spiel eintragen|Log a game/ }));
  const note = screen.getByRole('textbox', { name: /Notiz zum Spiel|Note on the game/ });
  await user.type(note, 'Test');
  const button = screen.getByRole('button', { name: /Sieg eintragen|Log a win/ });
  await user.click(button);
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(note).toHaveValue('Test');
  expect(button).toBeEnabled();
  await user.click(button);
  expect(note).toHaveValue('');
});
