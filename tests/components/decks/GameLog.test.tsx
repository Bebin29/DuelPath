import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameLog } from '@/components/decks/GameLog';
import type { DeckGame, GameResult } from '@/lib/deck/games';
import type { SidePlan } from '@/lib/deck/side-plan';

const plan: SidePlan = { id: 'p1', matchup: 'Ryzeal', going: 'second', in: {}, out: {} };
const planIds = new Set(['p1']);

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
      planIds={planIds}
      matchups={['Ryzeal', 'Snake-Eye']}
      onAdd={vi.fn().mockResolvedValue(true)}
      onDelete={vi.fn()}
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

    const note = screen.getByRole('textbox', { name: /Notiz zum Spiel|Note on the game/ });
    await user.type(note, 'Brick nach dem Siden');
    await user.click(screen.getByRole('button', { name: /Niederlage eintragen|Log a loss/ }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ note: 'Brick nach dem Siden' }));
    expect(note).toHaveValue('');
  });

  it('zeigt nur die Einträge des offenen Plans und löscht einzeln', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    log([game('win'), game('loss', { sidePlanId: 'p2', matchup: 'Snake-Eye' })], { onDelete });

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: /Eintrag löschen|Delete entry/ }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
