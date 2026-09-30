import { describe, expect, it } from 'vitest';
import { initialState, type StartState } from '@/lib/combo/state';
import { boardOf, EMZ_RIGHT } from '@/lib/combo/board';

const start = (cards: StartState['cards']) => initialState({ cards });

describe('boardOf', () => {
  it('legt Karten mit Platz dorthin und füllt den Rest von links auf', () => {
    const state = start([
      { instanceId: 'a', cardId: 'A', owner: 'self', zone: 'MONSTER', slot: 2 },
      { instanceId: 'b', cardId: 'B', owner: 'self', zone: 'MONSTER' },
      { instanceId: 'c', cardId: 'C', owner: 'self', zone: 'MONSTER', slot: EMZ_RIGHT },
    ]);
    const side = boardOf(state, 'self');
    expect(side.monsters.map((c) => c?.instanceId ?? null)).toEqual(['b', null, 'a', null, null]);
    expect(side.extraMonsters.map((c) => c?.instanceId ?? null)).toEqual([null, 'c']);
  });

  it('meldet Karten, für die keine Zone frei ist', () => {
    const cards = Array.from({ length: 6 }, (_, i) => ({
      instanceId: `s${i}`,
      cardId: 'S',
      owner: 'self' as const,
      zone: 'SPELL_TRAP' as const,
    }));
    const side = boardOf(start(cards), 'self');
    expect(side.spellTraps.every(Boolean)).toBe(true);
    expect(side.overflow).toHaveLength(1);
  });

  it('ordnet Feldkarten dem Kontrolleur zu, Stapel dem Besitzer', () => {
    const state = start([
      { instanceId: 'x', cardId: 'X', owner: 'self', zone: 'MONSTER', controller: 'opponent' },
      { instanceId: 'g', cardId: 'G', owner: 'self', zone: 'GY' },
    ]);
    expect(boardOf(state, 'opponent').monsters[0]?.instanceId).toBe('x');
    expect(boardOf(state, 'self').gy.map((c) => c.instanceId)).toEqual(['g']);
    expect(boardOf(state, 'self').monsters.every((c) => c === null)).toBe(true);
  });
});
