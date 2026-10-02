import { describe, expect, it } from 'vitest';
import {
  statesForTree,
  warningsOf,
  type CardData,
  type ComboNodeData,
  type StartState,
} from '@/lib/combo/state';
import { targetCandidates, targetEffects, targetSpec } from '@/lib/combo/targets';
import { answerPrompt, promptsFor } from '@/lib/combo/prompts';

const card = (id: string, name: string, type: string, text: string, race?: string): CardData => ({
  id,
  name,
  type,
  race,
  effects: [{ index: 0, text, activated: true, patterns: [] }],
});

const MST = card(
  'MST',
  'Mystical Space Typhoon',
  'Spell Card',
  'Target 1 Spell/Trap on the field; destroy that target.',
  'Quick-Play'
);
const ANCHOR = card(
  'WA',
  'Widow Anchor',
  'Spell Card',
  "If you control no monsters in your Main Monster Zone: Target 1 face-up Effect Monster on the field; negate that face-up monster's effects until the end of this turn, then, if you have 3 or more Spells in your GY, you can take control of that monster until the End Phase.",
  'Quick-Play'
);
const CALLED = card(
  'CBG',
  'Called by the Grave',
  'Spell Card',
  "Target 1 monster in your opponent's GY; banish it, and if you do, until the end of the next turn, its effects are negated.",
  'Quick-Play'
);
const JAMMING = card(
  'JW',
  'Jamming Waves',
  'Spell Card',
  'Target 1 Set Spell/Trap on the field; destroy it.',
  'Normal'
);
const COMMAND = card(
  'DC',
  'DoomZ Command',
  'Spell Card',
  'If this card is in your GY: You can target 1 face-up monster you control; equip it with this card, then take damage equal to its Level x 100.',
  'Equip'
);
const AXE = card(
  'AXE',
  'Axe of Despair',
  'Spell Card',
  'The equipped monster gains 1000 ATK.',
  'Equip'
);
const MONSTER = card('MON', 'Monster', 'Effect Monster', 'You can draw 1 card.');
const TRAP = card('TRP', 'Trap', 'Trap Card', 'Draw 1 card.', 'Normal');
const BOUNCER: CardData = {
  ...card(
    'BNC',
    'Bouncer',
    'Effect Monster',
    'Quick Effect: You can return 1 Spell/Trap to the hand.'
  ),
  effects: [
    {
      index: 0,
      text: 'You can return 1 Spell/Trap to the hand.',
      activated: true,
      patterns: ['QUICK'],
    },
  ],
};
const cards = new Map(
  [MST, ANCHOR, CALLED, JAMMING, COMMAND, AXE, MONSTER, TRAP, BOUNCER].map((c) => [c.id, c])
);

const node = (n: Partial<ComboNodeData> & Pick<ComboNodeData, 'id' | 'kind'>): ComboNodeData => ({
  parentId: null,
  player: 'self',
  ...n,
});
const activateMst = node({
  id: 'a',
  kind: 'ACTIVATE',
  instanceId: 'mst',
  cardId: 'MST',
  effectIndex: 0,
  targets: ['trap'],
  costMoves: [{ instanceId: 'mst', from: 'HAND', to: 'SPELL_TRAP', slot: 1, position: 'ATK' }],
});
const resolveAll = (start: StartState, nodes: ComboNodeData[]) => {
  const states = statesForTree(nodes, start, cards);
  return {
    last: states.get(nodes.at(-1)!.id)!,
    warnings: nodes.flatMap((n) => warningsOf(states.get(n.id), n.id)),
  };
};

describe('Ziele aus dem Kartentext', () => {
  it('liest Anzahl, Zonen, Seite und Art', () => {
    expect(targetSpec(MST, 0)).toMatchObject({
      count: 1,
      zones: ['SPELL_TRAP', 'FIELD'],
      side: 'any',
      kind: 'spellTrap',
    });
    expect(targetSpec(ANCHOR, 0)).toMatchObject({
      zones: ['MONSTER'],
      kind: 'effectMonster',
      faceUp: true,
    });
    expect(targetSpec(CALLED, 0)).toMatchObject({
      zones: ['GY'],
      side: 'opponent',
      kind: 'monster',
    });
    expect(targetSpec(JAMMING, 0)).toMatchObject({ set: true, kind: 'spellTrap' });
    expect(targetSpec(COMMAND, 0)).toMatchObject({ side: 'self', faceUp: true, kind: 'monster' });
    expect(targetSpec(AXE, 0)).toMatchObject({ zones: ['MONSTER'], faceUp: true });
    expect(targetSpec(MONSTER, 0)).toBeNull();
  });

  it('liest „on the field, including a monster you control“ als beide Seiten', () => {
    const knight = card(
      'SPK',
      'S:P Little Knight',
      'Link Monster',
      'When your opponent activates a card or effect (Quick Effect): You can target 2 face-up monsters on the field, including a monster you control; banish both until the End Phase.'
    );
    expect(targetSpec(knight, 0)).toMatchObject({ count: 2, side: 'any', faceUp: true });
    expect(targetEffects(knight, 0)).toEqual([{ kind: 'move', to: 'BANISHED' }]);
  });

  it('leitet ab, was mit dem Ziel geschieht', () => {
    expect(targetEffects(MST, 0)).toEqual([{ kind: 'move', to: 'GY' }]);
    expect(targetEffects(CALLED, 0)).toEqual([{ kind: 'move', to: 'BANISHED' }]);
    expect(targetEffects(COMMAND, 0)).toEqual([{ kind: 'equip' }]);
    expect(targetEffects(ANCHOR, 0)).toEqual([{ kind: 'negate' }, { kind: 'control' }]);
  });
});

describe('Zielwahl am Schritt', () => {
  const start: StartState = {
    cards: [
      { instanceId: 'mst', cardId: 'MST', owner: 'self', zone: 'HAND' },
      {
        instanceId: 'trap',
        cardId: 'TRP',
        owner: 'opponent',
        zone: 'SPELL_TRAP',
        slot: 0,
        position: 'SET',
      },
      {
        instanceId: 'mon',
        cardId: 'MON',
        owner: 'opponent',
        zone: 'MONSTER',
        slot: 0,
        position: 'ATK',
      },
    ],
  };

  it('fragt nach dem Ziel, bietet passende Karten an und speichert die Wahl', () => {
    const act = node({
      id: 'a',
      kind: 'ACTIVATE',
      instanceId: 'mst',
      cardId: 'MST',
      effectIndex: 0,
    });
    const state = statesForTree([act], start, cards).get('a')!;
    const [prompt] = promptsFor(act, state, cards);
    expect(prompt).toMatchObject({ kind: 'target', stepId: 'a' });
    if (prompt.kind !== 'target') throw new Error('kein Ziel');
    expect(
      targetCandidates(prompt.spec, state, 'self', cards, 'mst').map((c) => c.instanceId)
    ).toEqual(['trap']);
    expect(answerPrompt([act], prompt, ['trap'], state)[0].targets).toEqual(['trap']);
  });

  it('zerstört das Ziel beim Auflösen', () => {
    const { last, warnings } = resolveAll(start, [
      activateMst,
      node({ id: 'r', parentId: 'a', kind: 'RESOLVE' }),
    ]);
    expect(warnings).toEqual([]);
    expect(last.cards.trap.zone).toBe('GY');
    expect(last.cards.mst.zone).toBe('GY');
  });

  it('wirkt nicht, wenn das Ziel vor dem Auflösen weg ist', () => {
    const { last, warnings } = resolveAll(
      {
        cards: [
          ...start.cards,
          {
            instanceId: 'bnc',
            cardId: 'BNC',
            owner: 'opponent',
            zone: 'MONSTER',
            slot: 1,
            position: 'ATK',
          },
        ],
      },
      [
        activateMst,
        node({
          id: 'b',
          parentId: 'a',
          kind: 'ACTIVATE',
          player: 'opponent',
          instanceId: 'bnc',
          cardId: 'BNC',
          effectIndex: 0,
          resolveMoves: [{ instanceId: 'trap', from: 'SPELL_TRAP', to: 'HAND' }],
        }),
        node({ id: 'r', parentId: 'b', kind: 'RESOLVE' }),
      ]
    );
    expect(last.cards.trap.zone).toBe('HAND');
    expect(warnings).toEqual(['Ziel Trap ist beim Auflösen nicht mehr da']);
  });
});

describe('Ausrüsten über ein Ziel', () => {
  const start: StartState = {
    cards: [
      { instanceId: 'axe', cardId: 'AXE', owner: 'self', zone: 'HAND' },
      {
        instanceId: 'mon',
        cardId: 'MON',
        owner: 'self',
        zone: 'MONSTER',
        slot: 0,
        position: 'ATK',
      },
    ],
  };
  const equip = [
    node({
      id: 'a',
      kind: 'ACTIVATE',
      instanceId: 'axe',
      cardId: 'AXE',
      effectIndex: 0,
      targets: ['mon'],
      costMoves: [{ instanceId: 'axe', from: 'HAND', to: 'SPELL_TRAP', slot: 0, position: 'ATK' }],
    }),
    node({ id: 'r', parentId: 'a', kind: 'RESOLVE' }),
  ];

  it('hängt die Equip Spell an das gewählte Monster', () => {
    const { last } = resolveAll(start, equip);
    expect(last.cards.axe).toMatchObject({ zone: 'SPELL_TRAP', equippedTo: 'mon' });
  });

  it('schickt sie auf den Friedhof, wenn das Monster geht', () => {
    const { last } = resolveAll(start, [
      ...equip,
      node({
        id: 'x',
        parentId: 'r',
        kind: 'ACTION',
        action: 'OTHER',
        resolveMoves: [{ instanceId: 'mon', from: 'MONSTER', to: 'GY' }],
      }),
    ]);
    expect(last.cards.axe.zone).toBe('GY');
  });
});
