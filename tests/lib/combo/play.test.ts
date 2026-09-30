import { describe, expect, it } from 'vitest';
import {
  initialState,
  statesForTree,
  type CardData,
  type ComboNodeData,
  type StartState,
} from '@/lib/combo/state';
import {
  buildStep,
  costMovesFor,
  dropMeaning,
  freeEmz,
  fusionMoves,
  insertBefore,
  needsDiscard,
  replaceMain,
  resultMoves,
  triggerOffers,
} from '@/lib/combo/play';

const eff = (text: string, patterns: string[] = []) => ({
  index: 0,
  text,
  activated: true,
  patterns: patterns as never[],
});
const ALUBER: CardData = {
  id: 'ALU',
  name: 'Aluber',
  type: 'Effect Monster',
  effects: [
    eff(
      'If this card is Normal or Special Summoned: You can add 1 "Branded" Spell/Trap from your Deck to your hand.',
      ['TRIGGER_IF_OPT']
    ),
  ],
};
const FUSION: CardData = {
  id: 'BF',
  name: 'Branded Fusion',
  type: 'Spell Card',
  race: 'Normal',
  effects: [eff('Fusion Summon 1 Fusion Monster …')],
};
const FIELD: CardData = {
  id: 'FLD',
  name: 'Some Field',
  type: 'Spell Card',
  race: 'Field',
  effects: [eff('Activate.')],
};
const ASH: CardData = {
  id: 'ASH',
  name: 'Ash',
  type: 'Tuner Monster',
  effects: [
    eff(
      'When a card or effect is activated (Quick Effect): You can discard this card; negate that effect.',
      ['QUICK']
    ),
  ],
};
const DISCARDER: CardData = {
  id: 'DIS',
  name: 'Discarder',
  type: 'Effect Monster',
  effects: [eff('You can discard 1 card; draw 1 card.')],
};
const cards = new Map([ALUBER, FUSION, FIELD, ASH, DISCARDER].map((c) => [c.id, c]));

const start: StartState = {
  cards: [
    { instanceId: 'alu', cardId: 'ALU', owner: 'self', zone: 'HAND' },
    { instanceId: 'bf', cardId: 'BF', owner: 'self', zone: 'HAND' },
    { instanceId: 'fld', cardId: 'FLD', owner: 'self', zone: 'HAND' },
    { instanceId: 'occupied', cardId: 'DIS', owner: 'self', zone: 'MONSTER', slot: 0 },
    { instanceId: 'ash', cardId: 'ASH', owner: 'opponent', zone: 'HAND' },
  ],
};
const ctx = (nodes: ComboNodeData[], parent: ComboNodeData | null) => {
  const state = parent ? statesForTree(nodes, start, cards).get(parent.id)! : initialState(start);
  return { nodes, parent, state, cards };
};

describe('buildStep', () => {
  it('legt einen Normal Summon in die erste freie Monsterzone', () => {
    const [ns] = buildStep({ kind: 'normalSummon', instanceId: 'alu' }, ctx([], null));
    expect(ns).toMatchObject({
      kind: 'ACTION',
      action: 'NORMAL_SUMMON',
      cardId: 'ALU',
      parentId: null,
      rank: 0,
    });
    expect(ns.resolveMoves).toEqual([
      { instanceId: 'alu', cardId: 'ALU', from: 'HAND', to: 'MONSTER', slot: 1, position: 'ATK' },
    ]);
  });

  it('legt Zauber bei der Aktivierung aufs Feld, Spielfeldzauber in die Spielfeldzone', () => {
    const [bf] = buildStep({ kind: 'activate', instanceId: 'bf', effectIndex: 0 }, ctx([], null));
    expect(bf.costMoves?.[0]).toMatchObject({ to: 'SPELL_TRAP', slot: 0, position: 'ATK' });
    const [fld] = buildStep({ kind: 'activate', instanceId: 'fld', effectIndex: 0 }, ctx([], null));
    expect(fld.costMoves?.[0]).toMatchObject({ to: 'FIELD' });
  });

  it('löst eine offene Chain vor dem nächsten Schritt auf, außer es wird gechaint', () => {
    const [ns] = buildStep({ kind: 'normalSummon', instanceId: 'alu' }, ctx([], null));
    const [act] = buildStep({ kind: 'activate', instanceId: 'alu', effectIndex: 0 }, ctx([ns], ns));
    const nodes = [ns, act];
    const next = buildStep({ kind: 'activate', instanceId: 'bf', effectIndex: 0 }, ctx(nodes, act));
    expect(next.map((n) => n.kind)).toEqual(['RESOLVE', 'ACTIVATE']);
    expect(next[1].parentId).toBe(next[0].id);
    const chained = buildStep(
      { kind: 'activate', instanceId: 'ash', effectIndex: 0, chain: true },
      ctx(nodes, act)
    );
    expect(chained.map((n) => n.kind)).toEqual(['ACTIVATE']);
    expect(chained[0].player).toBe('opponent');
  });

  it('wird zum Branch, wenn der Schritt schon eine Fortsetzung hat', () => {
    const [ns] = buildStep({ kind: 'normalSummon', instanceId: 'alu' }, ctx([], null));
    const [alt] = buildStep(
      { kind: 'activate', instanceId: 'bf', effectIndex: 0 },
      ctx([ns], null)
    );
    expect(alt.rank).toBe(1);
  });
});

describe('Einfügen und Ersetzen', () => {
  const a: ComboNodeData = { id: 'a', parentId: null, kind: 'ACTION', player: 'self', rank: 0 };
  const b: ComboNodeData = { id: 'b', parentId: 'a', kind: 'ACTION', player: 'self', rank: 0 };
  const c: ComboNodeData = { id: 'c', parentId: 'b', kind: 'ACTION', player: 'self', rank: 0 };
  const n: ComboNodeData = { id: 'n', parentId: 'a', kind: 'ACTION', player: 'self', rank: 1 };

  it('hängt die bisherige Fortsetzung hinter den neuen Schritt', () => {
    const out = insertBefore([a, b, c, n], 'n');
    expect(out.find((x) => x.id === 'b')).toMatchObject({ parentId: 'n', rank: 0 });
    expect(out.find((x) => x.id === 'n')).toMatchObject({ parentId: 'a', rank: 0 });
  });

  it('verwirft beim Ersetzen die alte Fortsetzung samt Folgeschritten', () => {
    const out = replaceMain([a, b, c, n], 'n');
    expect(out.map((x) => x.id)).toEqual(['a', 'n']);
    expect(out[1].rank).toBe(0);
  });
});

describe('Kosten und Trigger', () => {
  it('erkennt „discard this card“ als Kosten und „discard 1 card“ als Abfrage', () => {
    const state = initialState(start);
    expect(costMovesFor(state, 'ash', ASH, 0)).toEqual([
      { instanceId: 'ash', cardId: 'ASH', from: 'HAND', to: 'GY' },
    ]);
    expect(needsDiscard(DISCARDER, 0)).toBe(true);
    expect(needsDiscard(ASH, 0)).toBe(false);
  });

  it('bietet den Beschwörungs-Trigger der frisch beschworenen Karte an', () => {
    const [ns] = buildStep({ kind: 'normalSummon', instanceId: 'alu' }, ctx([], null));
    const after = statesForTree([ns], start, cards).get(ns.id)!;
    const offers = triggerOffers(
      initialState(start),
      after,
      cards,
      (c) => c.id === 'ALU',
      () => true
    );
    expect(offers).toEqual([{ instanceId: 'alu', effectIndex: 0, cardId: 'ALU' }]);
  });
});

describe('dropMeaning', () => {
  const TRAP: CardData = {
    id: 'TRP',
    name: 'Trap',
    type: 'Trap Card',
    race: 'Normal',
    effects: [],
  };
  const XYZ: CardData = { id: 'EXT', name: 'Albion', type: 'Fusion Monster', effects: [] };
  const all = new Map([...cards, [TRAP.id, TRAP], [XYZ.id, XYZ]]);
  const s = initialState({
    cards: [
      ...start.cards,
      { instanceId: 'trp', cardId: 'TRP', owner: 'self', zone: 'HAND' },
      { instanceId: 'ext', cardId: 'EXT', owner: 'self', zone: 'EXTRA' },
      { instanceId: 'gy', cardId: 'DIS', owner: 'self', zone: 'GY' },
    ],
  });
  const mz = { player: 'self' as const, zone: 'MONSTER' as const, slot: 2 };
  const st = { player: 'self' as const, zone: 'SPELL_TRAP' as const, slot: 1 };

  it('beschwört Handmonster normal, mit Umschalt gesetzt, nach dem Normal Summon speziell', () => {
    expect(dropMeaning(s, all, 'alu', mz)?.label).toBe('normalSummon');
    expect(dropMeaning(s, all, 'alu', mz, true)?.label).toBe('setMonster');
    expect(dropMeaning({ ...s, normalSummonUsed: true }, all, 'alu', mz)?.label).toBe(
      'specialSummon'
    );
  });

  it('aktiviert Zauber, setzt Fallen und schickt Extra-Deck-Monster in die Materialwahl', () => {
    expect(dropMeaning(s, all, 'bf', st)?.label).toBe('activate');
    expect(dropMeaning(s, all, 'trp', st)?.label).toBe('setSpellTrap');
    expect(dropMeaning(s, all, 'ext', mz)).toEqual({
      label: 'extraSummon',
      instanceId: 'ext',
      slot: 2,
    });
  });

  it('beschwört aus dem Friedhof speziell und bewegt sonst frei', () => {
    expect(dropMeaning(s, all, 'gy', mz)?.label).toBe('specialSummon');
    expect(dropMeaning(s, all, 'alu', { player: 'self', zone: 'GY' })?.label).toBe('move');
  });
});

describe('Abfrage-Ergebnisse', () => {
  it('beschwört in die nächsten freien Zonen und sucht auf die Hand', () => {
    const state = initialState(start);
    expect(resultMoves('MONSTER', ['alu', 'bf'], state, 'self').map((m) => m.slot)).toEqual([1, 2]);
    expect(resultMoves('HAND', ['bf'], state, 'self')[0]).toMatchObject({
      from: 'HAND',
      to: 'HAND',
    });
  });

  it('gibt bei der Fusion die Zone der Materialien frei', () => {
    const state = initialState(start);
    const moves = fusionMoves('alu', ['occupied'], state, 'self');
    expect(moves[0]).toMatchObject({ instanceId: 'occupied', to: 'GY' });
    expect(moves[1]).toMatchObject({ instanceId: 'alu', to: 'MONSTER', slot: 0 });
  });

  it('nimmt die linke Extra Monster Zone zuerst', () => {
    const state = initialState(start);
    expect(freeEmz(state)).toBe(5);
    const taken = initialState({
      cards: [
        ...start.cards,
        { instanceId: 'x', cardId: 'ALU', owner: 'self', zone: 'MONSTER', slot: 5 },
      ],
    });
    expect(freeEmz(taken)).toBe(6);
  });
});
