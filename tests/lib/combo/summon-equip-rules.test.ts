import { describe, expect, it } from 'vitest';
import {
  initialState,
  statesForTree,
  warningsOf,
  type CardData,
  type ComboNodeData,
  type StartState,
} from '@/lib/combo/state';
import { buildStep } from '@/lib/combo/play';

const eff = (text: string, activated = true) => ({ index: 0, text, activated, patterns: [] });
const card = (
  id: string,
  name: string,
  type: string,
  texts: string[] = [],
  race?: string
): CardData => ({
  id,
  name,
  type,
  race,
  effects: texts.map((t, i) => ({ ...eff(t), index: i })),
});

const HEART = card(
  'RBH',
  'Rainbow Bridge of the Heart',
  'Spell Card',
  [
    'During your Main Phase, you can Normal Summon 1 "Crystal Beast" monster, in addition to your Normal Summon/Set.',
  ],
  'Continuous'
);
const PEGASUS = card('PEG', 'Crystal Beast Sapphire Pegasus', 'Effect Monster');
const OTHER = card('OTH', 'Other Monster', 'Effect Monster');
const GOLDEN = card(
  'GR',
  'Golden Rule',
  'Spell Card',
  [
    'Place 2 "Crystal Beast" monsters from your Deck face-up in your Spell & Trap Zone as Continuous Spells, then Special Summon 1 "Crystal Beast" monster from your hand or GY with a different name than those cards, and if you do, equip it with this card.',
    'When this card leaves the field, destroy that monster.',
  ],
  'Equip'
);
const LINK = card('LNK', 'Some Link', 'Link Monster');
const XYZ_A = card('XA', 'Rank Four', 'XYZ Monster');
const XYZ_B = card('XB', 'Rank Five', 'XYZ Monster');
const cards = new Map([HEART, PEGASUS, OTHER, GOLDEN, LINK, XYZ_A, XYZ_B].map((c) => [c.id, c]));

type Intent = Parameters<typeof buildStep>[0];
type Step = (intent: Intent) => ComboNodeData;

/** Spielt die Schritte nacheinander und liefert den Zustand danach */
const run = (start: StartState, build: (step: Step) => void) => {
  const nodes: ComboNodeData[] = [];
  const at = () =>
    nodes.length ? statesForTree(nodes, start, cards).get(nodes.at(-1)!.id)! : initialState(start);
  const step: Step = (intent) => {
    const created = buildStep(intent, { nodes, parent: nodes.at(-1) ?? null, state: at(), cards });
    nodes.push(...created);
    return created.at(-1)!;
  };
  build(step);
  const states = statesForTree(nodes, start, cards);
  const warnings = nodes.flatMap((n) => warningsOf(states.get(n.id), n.id));
  return { warnings, last: states.get(nodes.at(-1)!.id)! };
};

describe('Xyz auf Xyz', () => {
  const start: StartState = {
    cards: [
      { instanceId: 'a', cardId: 'XA', owner: 'self', zone: 'MONSTER', slot: 5, position: 'ATK' },
      { instanceId: 'm1', cardId: 'PEG', owner: 'self', zone: 'MATERIAL', attachedTo: 'a' },
      { instanceId: 'm2', cardId: 'OTH', owner: 'self', zone: 'MATERIAL', attachedTo: 'a' },
      { instanceId: 'b', cardId: 'XB', owner: 'self', zone: 'EXTRA' },
    ],
  };

  it('übergibt die Materialien an das neue Xyz-Monster', () => {
    const { warnings, last } = run(start, (step) => {
      step({ kind: 'specialSummon', instanceId: 'b', slot: 5, materials: ['a'] });
    });
    expect(warnings).toEqual([]);
    for (const id of ['a', 'm1', 'm2'])
      expect(last.cards[id]).toMatchObject({ zone: 'MATERIAL', attachedTo: 'b' });
  });
});
