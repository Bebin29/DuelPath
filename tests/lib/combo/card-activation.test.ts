import { describe, expect, it } from 'vitest';
import {
  activationIndex,
  spellSpeedOf,
  statesForTree,
  type CardData,
  type ComboNodeData,
  type StartState,
} from '@/lib/combo/state';

const eff = (index: number, text: string, activated = true) => ({
  index,
  text,
  activated,
  patterns: [],
});

/** Wie Radiant Typhoon Vision: vor der Kartenaktivierung steht ein Effekt aus der Zerstörung */
const VISION: CardData = {
  id: 'RTV',
  name: 'Vision',
  type: 'Spell Card',
  race: 'Quick-Play',
  effects: [
    eff(
      0,
      'If this card is destroyed by the effect of "Mystical Space Typhoon": You can Set this card.'
    ),
    eff(1, 'Activate 1 of these effects; ● Draw 2 cards.'),
  ],
};
const BRIDGE: CardData = {
  id: 'RBH',
  name: 'Bridge',
  type: 'Spell Card',
  race: 'Continuous',
  effects: [eff(0, 'During your Main Phase: You can destroy 1 card you control.')],
};
const NEGATOR: CardData = {
  id: 'NEG',
  name: 'Negator',
  type: 'Effect Monster',
  effects: [
    eff(
      0,
      'When a Spell/Trap Card or effect is activated (Quick Effect): You can negate the activation.'
    ),
  ],
};
const cards = new Map([VISION, BRIDGE, NEGATOR].map((c) => [c.id, c]));

const node = (n: Partial<ComboNodeData> & Pick<ComboNodeData, 'id' | 'kind'>): ComboNodeData => ({
  parentId: null,
  player: 'self',
  ...n,
});

/** Aktivierung, Negierung der Aktivierung, Auflösen */
function negated(start: StartState, activation: Partial<ComboNodeData>) {
  const act = node({ id: 'a', kind: 'ACTIVATE', ...activation });
  const neg = node({
    id: 'n',
    parentId: 'a',
    kind: 'ACTIVATE',
    player: 'opponent',
    instanceId: 'neg',
    cardId: 'NEG',
    effectIndex: 0,
    negates: { type: 'ACTIVATION', nodeId: 'a' },
  });
  const res = node({ id: 'r', parentId: 'n', kind: 'RESOLVE' });
  return statesForTree([act, neg, res], start, cards).get('r')!;
}

describe('Kartenaktivierung von Zaubern und Fallen', () => {
  it('erkennt den Aktivierungseffekt hinter einem Zerstörungs-Effekt', () => {
    expect(activationIndex(VISION)).toBe(1);
    expect(spellSpeedOf(VISION, 1, VISION.effects[1])).toBe(2);
  });

  it('schickt eine Karte mit negierter Aktivierung auf den Friedhof', () => {
    const state = negated(
      {
        cards: [
          { instanceId: 'v', cardId: 'RTV', owner: 'self', zone: 'HAND' },
          {
            instanceId: 'neg',
            cardId: 'NEG',
            owner: 'opponent',
            zone: 'MONSTER',
            slot: 0,
            position: 'ATK',
          },
        ],
      },
      {
        instanceId: 'v',
        cardId: 'RTV',
        effectIndex: 1,
        costMoves: [{ instanceId: 'v', from: 'HAND', to: 'SPELL_TRAP', slot: 0, position: 'ATK' }],
      }
    );
    expect(state.cards.v.zone).toBe('GY');
  });

  it('lässt eine offene Continuous Spell liegen, wenn nur ihr Effekt negiert wird', () => {
    const state = negated(
      {
        cards: [
          {
            instanceId: 'b',
            cardId: 'RBH',
            owner: 'self',
            zone: 'SPELL_TRAP',
            slot: 0,
            position: 'ATK',
          },
          {
            instanceId: 'neg',
            cardId: 'NEG',
            owner: 'opponent',
            zone: 'MONSTER',
            slot: 0,
            position: 'ATK',
          },
        ],
      },
      { instanceId: 'b', cardId: 'RBH', effectIndex: 0 }
    );
    expect(state.cards.b.zone).toBe('SPELL_TRAP');
  });
});
