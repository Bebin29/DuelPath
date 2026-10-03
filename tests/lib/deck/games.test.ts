import { describe, expect, it } from 'vitest';
import {
  gameInputSchema,
  knownMatchups,
  tally,
  gamesForPlans,
  type DeckGame,
  type GameResult,
} from '@/lib/deck/games';
import type { SidePlan } from '@/lib/deck/side-plan';

const plan = (p: Partial<SidePlan>): SidePlan => ({
  id: 'p1',
  matchup: 'Ryzeal',
  going: 'second',
  in: {},
  out: {},
  ...p,
});

let n = 0;
const game = (g: Partial<DeckGame>): DeckGame => ({
  id: `g${n++}`,
  sidePlanId: 'p1',
  matchup: 'Ryzeal',
  going: 'second',
  result: 'win',
  note: null,
  playedAt: '2026-10-03T12:00:00.000Z',
  ...g,
});

const ids = (...v: string[]) => new Set(v);

describe('tally', () => {
  it('zählt die Einträge des Plans über die Id', () => {
    const games = [
      game({ sidePlanId: 'p1', result: 'win' }),
      game({ sidePlanId: 'p1', result: 'win' }),
      game({ sidePlanId: 'p1', result: 'loss' }),
      game({ sidePlanId: 'p2', result: 'win' }),
    ];
    expect(tally(games, plan({}), ids('p1', 'p2'))).toEqual({
      win: 2,
      loss: 1,
      draw: 0,
      total: 3,
    });
  });

  it('zählt Einträge ohne Plan in keine Planbilanz', () => {
    const games = [
      game({ sidePlanId: null, result: 'loss' }),
      // anderes Matchup
      game({ sidePlanId: null, matchup: 'Snake-Eye' }),
      // gleiches Matchup, andere Zugfolge
      game({ sidePlanId: null, going: 'first' }),
    ];
    expect(tally(games, plan({}), ids('p1'))).toEqual({ win: 0, loss: 0, draw: 0, total: 0 });
  });

  it('errät den Plan nicht aus einer ähnlichen Matchup-Schreibweise', () => {
    const games = [game({ sidePlanId: null, matchup: ' ryzeal ' })];
    expect(tally(games, plan({ matchup: 'Ryzeal' }), ids('p1')).total).toBe(0);
  });

  it('zählt verwaiste Einträge nach dem Löschen eines Plans nicht weiter', () => {
    // Der Eintrag zeigt noch auf den gelöschten Plan p0, der Eintrag selbst bleibt unangetastet
    const games = [game({ sidePlanId: 'p0', result: 'draw' })];
    expect(tally(games, plan({ id: 'p1' }), ids('p1'))).toEqual({
      win: 0,
      loss: 0,
      draw: 0,
      total: 0,
    });
  });

  it('zählt einen Eintrag eines anderen bestehenden Plans nicht über das Matchup mit', () => {
    // p2 hat dasselbe Matchup und dieselbe Zugfolge, der Eintrag gehört trotzdem nur dorthin
    const games = [game({ sidePlanId: 'p2' })];
    expect(tally(games, plan({ id: 'p1' }), ids('p1', 'p2')).total).toBe(0);
  });

  it('ist ohne Einträge leer', () => {
    expect(tally([], plan({}), ids('p1'))).toEqual({ win: 0, loss: 0, draw: 0, total: 0 });
  });
});

describe('knownMatchups', () => {
  it('führt Schreibweisen zusammen und sortiert', () => {
    const plans = [plan({ matchup: 'Ryzeal' }), plan({ id: 'p2', matchup: '' })];
    const games = [game({ matchup: 'ryzeal' }), game({ matchup: 'Snake-Eye' })];
    expect(knownMatchups(plans, games)).toEqual(['Ryzeal', 'Snake-Eye']);
  });
});

describe('gameInputSchema', () => {
  it('nimmt einen Eintrag mit leerer Notiz als ohne Notiz', () => {
    const parsed = gameInputSchema.parse({
      sidePlanId: 'p1',
      matchup: ' Ryzeal ',
      going: 'second',
      result: 'win',
      note: '   ',
    });
    expect(parsed).toEqual({
      sidePlanId: 'p1',
      matchup: 'Ryzeal',
      going: 'second',
      result: 'win',
      note: null,
    });
  });

  it('lehnt ein unbekanntes Ergebnis ab', () => {
    const input = {
      sidePlanId: null,
      matchup: 'Ryzeal',
      going: 'second',
      result: 'scoop' as GameResult,
      note: null,
    };
    expect(gameInputSchema.safeParse(input).success).toBe(false);
  });
});

it('zeigt verwaiste Einträge ohne Bezug und erhält die gespeicherte Referenz', () => {
  const original = game({ sidePlanId: 'deleted' });
  expect(gamesForPlans([original], [plan({})])).toEqual([{ ...original, sidePlanId: null }]);
  expect(original.sidePlanId).toBe('deleted');
});
