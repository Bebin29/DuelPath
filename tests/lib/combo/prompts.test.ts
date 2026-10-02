import { describe, expect, it } from 'vitest';
import { initialState, statesForTree, type CardData, type StartState } from '@/lib/combo/state';
import { buildStep } from '@/lib/combo/play';
import { answerPrompt, promptCandidates, promptsFor } from '@/lib/combo/prompts';
import { commandMatches, parseCommand } from '@/lib/combo/command';

const eff = (text: string) => ({ index: 0, text, activated: true, patterns: [] });
const ALUBER: CardData = {
  id: 'ALU',
  name: 'Aluber the Jester of Despia',
  type: 'Effect Monster',
  effects: [
    eff(
      'If this card is Normal Summoned: You can add 1 "Branded" Spell/Trap from your Deck to your hand.'
    ),
  ],
};
const OPENING: CardData = {
  id: 'BO',
  name: 'Branded Opening',
  type: 'Spell Card',
  race: 'Normal',
  effects: [eff('Discard 1 card, then take 1 "Despia" monster from your Deck.')],
};
const FUSION: CardData = { id: 'BF', name: 'Branded Fusion', type: 'Spell Card', effects: [] };
const cards = new Map([ALUBER, OPENING, FUSION].map((c) => [c.id, c]));
const start: StartState = {
  cards: [
    { instanceId: 'alu', cardId: 'ALU', owner: 'self', zone: 'HAND' },
    { instanceId: 'bo', cardId: 'BO', owner: 'self', zone: 'HAND' },
    { instanceId: 'bf', cardId: 'BF', owner: 'self', zone: 'DECK' },
    { instanceId: 'alu2', cardId: 'ALU', owner: 'self', zone: 'DECK' },
  ],
};

describe('Abfragen', () => {
  it('fragt nach dem Suchziel und schreibt die Antwort in den Schritt', () => {
    const s0 = initialState(start);
    const [ns] = buildStep(
      { kind: 'normalSummon', instanceId: 'alu' },
      { nodes: [], parent: null, state: s0, cards }
    );
    const s1 = statesForTree([ns], start, cards).get(ns.id)!;
    const [act] = buildStep(
      { kind: 'activate', instanceId: 'alu', effectIndex: 0 },
      { nodes: [ns], parent: ns, state: s1, cards }
    );
    const [prompt] = promptsFor(act, s1, cards);
    expect(prompt).toMatchObject({ kind: 'result', stepId: act.id });
    const s2 = statesForTree([ns, act], start, cards).get(act.id)!;
    expect(promptCandidates(prompt, s2, cards).map((c) => c.instanceId)).toEqual(['bf']);
    const answered = answerPrompt([ns, act], prompt, ['bf'], s2);
    expect(answered[1].resolveMoves).toEqual([
      { instanceId: 'bf', cardId: 'BF', from: 'DECK', to: 'HAND' },
    ]);
  });

  it('fragt bei Branded Opening zuerst nach der abgeworfenen Karte, als Wirkung', () => {
    const s0 = initialState(start);
    const [act] = buildStep(
      { kind: 'activate', instanceId: 'bo', effectIndex: 0 },
      { nodes: [], parent: null, state: s0, cards }
    );
    const prompts = promptsFor(act, s0, cards);
    expect(prompts.map((p) => p.kind)).toEqual(['discard', 'result']);
    expect(prompts[0]).toMatchObject({ key: 'resolveMoves', exclude: 'bo' });
  });
});

describe('Mehrteilige Effekte', () => {
  const RAINBOW: CardData = {
    id: 'RD',
    name: 'Crystal Beast Rainbow Dragon',
    type: 'Effect Monster',
    effects: [
      eff(
        'You can banish this Continuous Spell; Special Summon 1 Level 4 or lower "Crystal Beast" monster from your Deck, but negate its effects (if any), and if you do, add 1 "Ultimate Crystal" monster from your Deck to your hand.'
      ),
    ],
  };
  const BEAST: CardData = {
    id: 'CB',
    name: 'Crystal Beast Sapphire Pegasus',
    type: 'Effect Monster',
    effects: [],
  };
  const ULTIMATE: CardData = {
    id: 'UC',
    name: 'Ultimate Crystal Rainbow Dragon',
    type: 'Effect Monster',
    effects: [],
  };
  const all = new Map([RAINBOW, BEAST, ULTIMATE].map((c) => [c.id, c]));
  const board: StartState = {
    cards: [
      {
        instanceId: 'rd',
        cardId: 'RD',
        owner: 'self',
        zone: 'SPELL_TRAP',
        slot: 0,
        position: 'ATK',
      },
      { instanceId: 'cb', cardId: 'CB', owner: 'self', zone: 'DECK' },
      { instanceId: 'uc', cardId: 'UC', owner: 'self', zone: 'DECK' },
    ],
  };

  it('fragt alle Teile nacheinander ab und löst sie in einem Schritt auf', () => {
    const s0 = initialState(board);
    const [act] = buildStep(
      { kind: 'activate', instanceId: 'rd', effectIndex: 0 },
      { nodes: [], parent: null, state: s0, cards: all }
    );
    expect(act.costMoves).toEqual([
      { instanceId: 'rd', cardId: 'RD', from: 'SPELL_TRAP', to: 'BANISHED' },
    ]);
    const prompts = promptsFor(act, s0, all);
    expect(prompts.map((p) => p.kind === 'result' && p.spec.verb)).toEqual(['summon', 'search']);

    const s1 = statesForTree([act], board, all).get(act.id)!;
    let nodes = answerPrompt([act], prompts[0], ['cb'], s1);
    nodes = answerPrompt(nodes, prompts[1], ['uc'], s1);
    expect(nodes[0].negates).toEqual({ type: 'CARD', instanceId: 'cb' });

    const [resolve] = buildStep(
      { kind: 'resolve' },
      { nodes, parent: nodes[0], state: s1, cards: all }
    );
    const end = statesForTree([...nodes, resolve], board, all).get(resolve.id)!;
    expect(end.cards.rd.zone).toBe('BANISHED');
    expect(end.cards.cb).toMatchObject({ zone: 'MONSTER', slot: 0 });
    expect(end.negatedCards.cb).toBe(end.cards.cb.epoch);
    expect(end.cards.uc.zone).toBe('HAND');
    expect(end.warnings).toEqual([]);
  });
});

describe('Befehle', () => {
  it('findet die gemeinte Karte samt Aktion', () => {
    const s0 = initialState(start);
    const matches = commandMatches(parseCommand('ns alub')!, s0, cards);
    expect(matches.map((m) => [m.instanceId, m.action?.id])).toEqual([['alu', 'ns']]);
    const act = commandMatches(parseCommand('act opening')!, s0, cards);
    expect(act[0].action?.intent).toMatchObject({ kind: 'activate', instanceId: 'bo' });
  });
});
