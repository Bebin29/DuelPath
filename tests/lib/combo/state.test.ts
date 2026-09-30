// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { CardEffect, EffectOpt } from '@/lib/cards/effects';
import {
  stateAt,
  cardsIn,
  type CardData,
  type ComboNodeData,
  type StartState,
} from '@/lib/combo/state';

const effect = (opt?: EffectOpt, patterns: CardEffect['patterns'] = []): CardEffect => ({
  index: 0,
  text: '',
  activated: true,
  opt,
  patterns,
});
const hard = (wording: EffectOpt['wording'] = 'use'): EffectOpt => ({
  kind: 'HARD',
  wording,
  per: 'turn',
  limit: 1,
});
const soft: EffectOpt = { kind: 'SOFT', wording: 'use', per: 'turn', limit: 1 };

const CARDS = new Map<string, CardData>(
  [
    {
      id: 'starter',
      name: 'Starter',
      type: 'Effect Monster',
      effects: [effect(hard(), ['TRIGGER_IF_OPT'])],
    },
    {
      id: 'activator',
      name: 'Activator',
      type: 'Effect Monster',
      effects: [effect(hard('activate'))],
    },
    { id: 'softie', name: 'Softie', type: 'Effect Monster', effects: [effect(soft)] },
    { id: 'ash', name: 'Ash Blossom', type: 'Tuner Monster', effects: [effect(hard(), ['QUICK'])] },
    {
      id: 'pot',
      name: 'Pot',
      type: 'Spell Card',
      race: 'Normal',
      effects: [effect(hard('activateCard'))],
    },
    {
      id: 'field',
      name: 'Continuous',
      type: 'Spell Card',
      race: 'Continuous',
      effects: [effect()],
    },
    {
      id: 'strike',
      name: 'Solemn Strike',
      type: 'Trap Card',
      race: 'Counter',
      effects: [effect()],
    },
    { id: 'imperm', name: 'Imperm', type: 'Trap Card', race: 'Normal', effects: [effect()] },
  ].map((c) => [c.id, c])
);

const START: StartState = {
  cards: [
    { instanceId: 'starter-1', cardId: 'starter', owner: 'self', zone: 'HAND' },
    { instanceId: 'activator-1', cardId: 'activator', owner: 'self', zone: 'MONSTER' },
    { instanceId: 'softie-1', cardId: 'softie', owner: 'self', zone: 'MONSTER' },
    { instanceId: 'pot-1', cardId: 'pot', owner: 'self', zone: 'HAND' },
    { instanceId: 'field-1', cardId: 'field', owner: 'self', zone: 'HAND' },
    { instanceId: 'ash-1', cardId: 'ash', owner: 'opponent', zone: 'HAND' },
    {
      instanceId: 'strike-1',
      cardId: 'strike',
      owner: 'opponent',
      zone: 'SPELL_TRAP',
      position: 'SET',
    },
    { instanceId: 'imperm-1', cardId: 'imperm', owner: 'opponent', zone: 'HAND' },
  ],
};

let counter = 0;
/** Baut eine Knotenkette; jeder Knoten hängt am vorherigen, sofern parentId nicht gesetzt ist */
function chain(...specs: Partial<ComboNodeData>[]): ComboNodeData[] {
  const nodes: ComboNodeData[] = [];
  for (const spec of specs) {
    nodes.push({
      id: spec.id ?? `n${++counter}`,
      parentId: spec.parentId !== undefined ? spec.parentId : (nodes.at(-1)?.id ?? null),
      kind: 'ACTION',
      player: 'self',
      ...spec,
    });
  }
  return nodes;
}
const activate = (card: string, extra: Partial<ComboNodeData> = {}): Partial<ComboNodeData> => ({
  kind: 'ACTIVATE',
  cardId: card,
  instanceId: `${card}-1`,
  effectIndex: 0,
  ...extra,
});
const resolve = (id?: string): Partial<ComboNodeData> => ({ kind: 'RESOLVE', ...(id && { id }) });
const at = (nodes: ComboNodeData[], id = nodes.at(-1)!.id) => stateAt(nodes, id, START, CARDS);
const messages = (nodes: ComboNodeData[], id?: string) =>
  at(nodes, id).warnings.map((w) => w.message);

describe('stateAt', () => {
  it('berechnet pro Zweig einen eigenen Zustand (keine Reaktion vs. Ash Blossom)', () => {
    const nodes = chain(
      {
        id: 'ns',
        action: 'NORMAL_SUMMON',
        resolveMoves: [{ instanceId: 'starter-1', from: 'HAND', to: 'MONSTER', position: 'ATK' }],
      },
      activate('starter', {
        id: 'search',
        resolveMoves: [{ instanceId: 'target-1', cardId: 'pot', from: 'DECK', to: 'HAND' }],
      }),
      { id: 'opp', kind: 'OPPONENT' }
    );
    nodes.push(...chain({ ...resolve('a'), parentId: 'opp', edgeLabel: 'Keine Reaktion' }));
    nodes.push(
      ...chain(
        {
          ...activate('ash', {
            player: 'opponent',
            costMoves: [{ instanceId: 'ash-1', from: 'HAND', to: 'GY' }],
            negates: { type: 'EFFECT', nodeId: 'search' },
          }),
          id: 'ash',
          parentId: 'opp',
          edgeLabel: 'Ash Blossom',
        },
        resolve('b')
      )
    );

    const a = at(nodes, 'a');
    expect(a.cards['target-1'].zone).toBe('HAND');
    expect(a.optUsage['hard:self:Starter#0']).toBe(1);
    expect(a.chain).toEqual([]);

    const b = at(nodes, 'b');
    expect(b.cards['target-1']).toBeUndefined();
    expect(b.cards['ash-1'].zone).toBe('GY');
    // Effekt negiert: OPT trotzdem verbraucht
    expect(b.optUsage['hard:self:Starter#0']).toBe(1);
    expect(b.warnings).toEqual([]);

    // Der Zustand vor der Verzweigung hat eine offene Chain
    expect(at(nodes, 'opp').chain.map((l) => l.nodeId)).toEqual(['search']);
  });

  it('warnt bei doppelter Nutzung eines Hard OPT', () => {
    const nodes = chain(activate('activator'), resolve(), activate('activator'), resolve());
    expect(messages(nodes)).toContain('OPT von Activator ist in diesem Zug bereits verbraucht');
  });

  it('negierte Aktivierung: "activate" gibt den OPT frei, "use" nicht', () => {
    const negate = (id: string) =>
      activate('strike', { player: 'opponent', negates: { type: 'ACTIVATION', nodeId: id } });

    const activateWording = chain(activate('activator', { id: 'x' }), negate('x'), resolve());
    expect(at(activateWording).optUsage['hard:self:Activator#0']).toBe(0);

    const useWording = chain(activate('starter', { id: 'y' }), negate('y'), resolve());
    expect(at(useWording).optUsage['hard:self:Starter#0']).toBe(1);

    // Counter Trap nach der Chain auf den Friedhof
    expect(at(useWording).cards['strike-1'].zone).toBe('GY');
  });

  it('optOverride überschreibt die Regel', () => {
    const nodes = chain(activate('activator', { optOverride: false }), resolve());
    expect(at(nodes).optUsage['hard:self:Activator#0']).toBeUndefined();
  });

  it('räumt nach der Chain auf: Normal Spell auf den Friedhof, Continuous bleibt', () => {
    const toField = (id: string) => [
      { instanceId: id, from: 'HAND' as const, to: 'SPELL_TRAP' as const },
    ];
    const pot = chain(activate('pot', { costMoves: toField('pot-1') }), resolve());
    expect(at(pot).cards['pot-1'].zone).toBe('GY');
    expect(at(pot).optUsage['card:self:Pot']).toBe(1);

    const cont = chain(activate('field', { costMoves: toField('field-1') }), resolve());
    expect(at(cont).cards['field-1'].zone).toBe('SPELL_TRAP');

    // Aktivierung negiert: auch die Continuous Spell geht auf den Friedhof, der OPT ist wieder frei
    const negated = chain(
      activate('pot', { id: 'p', costMoves: toField('pot-1') }),
      activate('strike', { player: 'opponent', negates: { type: 'ACTIVATION', nodeId: 'p' } }),
      resolve()
    );
    expect(at(negated).cards['pot-1'].zone).toBe('GY');
    expect(at(negated).optUsage['card:self:Pot']).toBe(0);
  });

  it('negierte Normal Summon: Monster auf den Friedhof, Normal Summon bleibt verbraucht', () => {
    const nodes = chain(
      {
        id: 'ns',
        action: 'NORMAL_SUMMON',
        resolveMoves: [{ instanceId: 'starter-1', from: 'HAND', to: 'MONSTER' }],
      },
      activate('strike', { player: 'opponent', negates: { type: 'SUMMON', nodeId: 'ns' } }),
      resolve('r'),
      {
        action: 'NORMAL_SUMMON',
        resolveMoves: [{ instanceId: 'activator-1', from: 'MONSTER', to: 'MONSTER' }],
      }
    );
    const r = at(nodes, 'r');
    expect(r.cards['starter-1'].zone).toBe('GY');
    expect(r.normalSummonUsed).toBe(true);
    expect(messages(nodes)).toContain('Normal Summon in diesem Zug bereits verbraucht');
  });

  it('Soft OPT gilt pro Ortsepoche und ist nach Verlassen des Feldes wieder frei', () => {
    const again = chain(activate('softie'), resolve(), activate('softie'), resolve());
    expect(messages(again)).toContain('OPT von Softie ist in diesem Zug bereits verbraucht');

    const leftField = chain(
      activate('softie'),
      resolve(),
      { resolveMoves: [{ instanceId: 'softie-1', from: 'MONSTER', to: 'GY' }] },
      { resolveMoves: [{ instanceId: 'softie-1', from: 'GY', to: 'MONSTER' }] },
      activate('softie'),
      resolve()
    );
    expect(messages(leftField)).toEqual([]);
  });

  it('Imperm negiert die Effekte der Karte, auch ihren Link in der Chain', () => {
    const nodes = chain(
      activate('softie', {
        id: 's',
        resolveMoves: [{ instanceId: 'x-1', cardId: 'pot', from: 'DECK', to: 'HAND' }],
      }),
      activate('imperm', {
        player: 'opponent',
        costMoves: [{ instanceId: 'imperm-1', from: 'HAND', to: 'SPELL_TRAP' }],
        negates: { type: 'CARD', instanceId: 'softie-1' },
      }),
      resolve('r'),
      activate('softie', { optOverride: false })
    );
    const r = at(nodes, 'r');
    expect(r.cards['x-1']).toBeUndefined();
    expect(r.cards['imperm-1'].zone).toBe('GY');
    expect(messages(nodes)).toContain('Effekte von Softie sind negiert');

    // Verlässt die Karte das Feld, endet die Negierung
    const later = chain(
      ...nodes.slice(0, 3).map((n) => ({ ...n, id: `${n.id}-l`, parentId: undefined })),
      { resolveMoves: [{ instanceId: 'softie-1', from: 'MONSTER', to: 'GY' }] },
      { resolveMoves: [{ instanceId: 'softie-1', from: 'GY', to: 'MONSTER' }] },
      activate('softie')
    );
    expect(messages(later)).not.toContain('Effekte von Softie sind negiert');
  });

  it('warnt bei zu niedrigem Spell Speed, nicht bei Triggern', () => {
    const ignition = chain(activate('activator'), activate('softie'));
    expect(messages(ignition)).toContain(
      'Spell Speed 1 kann nicht auf Spell Speed 1 gechaint werden'
    );

    const quick = chain(activate('activator'), activate('ash', { player: 'opponent' }));
    expect(messages(quick)).toEqual([]);

    const trigger = chain(activate('activator'), activate('starter'));
    expect(messages(trigger)).toEqual([]);
  });

  it('meldet Bewegungen aus der falschen Zone', () => {
    const nodes = chain({ resolveMoves: [{ instanceId: 'starter-1', from: 'GY', to: 'MONSTER' }] });
    expect(messages(nodes)).toEqual(['starter-1 liegt in HAND, nicht in GY']);
    expect(cardsIn(at(nodes), 'self', 'MONSTER').map((c) => c.instanceId)).toContain('starter-1');
  });

  it('erkennt Zyklen im Baum', () => {
    const nodes: ComboNodeData[] = [
      { id: 'a', parentId: 'b', kind: 'END', player: 'self' },
      { id: 'b', parentId: 'a', kind: 'END', player: 'self' },
    ];
    expect(() => at(nodes, 'a')).toThrow(/Zyklus/);
  });
});
