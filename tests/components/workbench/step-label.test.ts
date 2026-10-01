import { describe, expect, it } from 'vitest';
import type { ComboCard } from '@/lib/combo/cards';
import { initialState, type ComboNodeData } from '@/lib/combo/state';
import { nodeCardId, stepLabel } from '@/components/workbench/step-label';
import { usedOptNames } from '@/lib/combo/opt-names';

const aluber: ComboCard = {
  id: 'A',
  name: 'Aluber the Jester of Despia',
  nameDe: 'Aluber, der Hofnarr der Despia',
  type: 'Effect Monster',
  imageSmall: null,
  effects: [],
};
const cards = new Map([['A', aluber]]);
const kind = (k: string) => `[${k}]`;
const node = (extra: Partial<ComboNodeData>): ComboNodeData => ({
  id: 'n',
  parentId: null,
  kind: 'ACTION',
  player: 'self',
  ...extra,
});

describe('stepLabel', () => {
  it('schreibt Beschwörungen wie Spieler: NS vor dem Namen', () => {
    expect(
      stepLabel(node({ action: 'NORMAL_SUMMON', cardId: 'A' }), cards, 'en', undefined, kind)
    ).toBe('NS Aluber the Jester of Despia');
  });

  it('nummeriert aktivierte Effekte und folgt der Kartensprache', () => {
    expect(
      stepLabel(
        node({ kind: 'ACTIVATE', cardId: 'A', effectIndex: 0 }),
        cards,
        'de',
        undefined,
        kind
      )
    ).toBe('Aluber, der Hofnarr der Despia ↯ 1');
  });

  it('fällt ohne Karte auf die Art des Schritts zurück', () => {
    expect(stepLabel(node({ kind: 'END' }), cards, 'en', undefined, kind)).toBe('[END]');
  });

  it('findet die Karte über die erste Bewegung', () => {
    const state = initialState({
      cards: [{ instanceId: 'a1', cardId: 'A', owner: 'self', zone: 'HAND' }],
    });
    const n = node({ resolveMoves: [{ instanceId: 'a1', from: 'HAND', to: 'MONSTER' }] });
    expect(nodeCardId(n, state)).toBe('A');
  });
});

describe('usedOptNames', () => {
  it('liest Namen aus Hard-, Karten- und Soft-OPT-Schlüsseln', () => {
    const state = initialState({
      cards: [{ instanceId: 'a1', cardId: 'A', owner: 'self', zone: 'MONSTER' }],
    });
    state.optUsage = {
      'hard:self:Branded Fusion#0': 1,
      'soft:a1:0:0': 1,
      'card:self:Called by the Grave': 1,
      'hard:self:Unused#0': 0,
    };
    expect(usedOptNames(state, cards, 'en')).toEqual([
      'Aluber the Jester of Despia',
      'Branded Fusion',
      'Called by the Grave',
    ]);
  });
});
