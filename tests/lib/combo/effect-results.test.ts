import { describe, expect, it } from 'vitest';
import type { CardData } from '@/lib/combo/state';
import { initialState } from '@/lib/combo/state';
import { materialCandidates, resultCandidates, resultSpecs } from '@/lib/combo/effect-results';

const card = (name: string, type: string, text = ''): CardData => ({
  id: name,
  name,
  type,
  effects: text ? [{ index: 0, text, activated: true, patterns: [] }] : [],
});

const ALUBER = card(
  'Aluber the Jester of Despia',
  'Effect Monster',
  'If this card is Normal or Special Summoned: You can add 1 "Branded" Spell/Trap from your Deck to your hand.'
);
const FUSION = card(
  'Branded Fusion',
  'Spell Card',
  'Fusion Summon 1 Fusion Monster that mentions "Fallen of Albaz" as material from your Extra Deck, using 2 monsters from your hand, Deck, or field as material.'
);
const TRAGEDY = card(
  'Despian Tragedy',
  'Effect Monster',
  'If this card is sent to the GY, or banished, by a card effect: You can add 1 "Despia" monster from your Deck to your hand, except "Despian Tragedy".'
);
const ALBAZ = card(
  'Fallen of Albaz',
  'Effect Monster',
  'If this card is Normal or Special Summoned (except during the Damage Step): You can discard 1 card; Fusion Summon 1 Fusion Monster from your Extra Deck, using monsters on either field as Fusion Material, including this card, but you cannot use other monsters you control as Fusion Material.'
);
const OPENING = card(
  'Branded Opening',
  'Spell Card',
  'Discard 1 card, then take 1 "Despia" monster from your Deck, and either add it to your hand or Special Summon it in Defense Position.'
);
const RAINBOW = card(
  'Crystal Beast Rainbow Dragon',
  'Effect Monster',
  'You can banish this Continuous Spell; Special Summon 1 Level 4 or lower "Crystal Beast" monster from your Deck, but negate its effects (if any), and if you do, add 1 "Ultimate Crystal" monster from your Deck to your hand.'
);
const IN_RED = card('Branded in Red', 'Spell Card');
const QUEM = card('Guiding Quem, the Virtuous', 'Effect Monster');
const ALBION = card('Albion the Branded Dragon', 'Fusion Monster');
const cards = new Map(
  [ALUBER, FUSION, TRAGEDY, ALBAZ, OPENING, IN_RED, QUEM, ALBION].map((c) => [c.id, c])
);

describe('resultSpecs', () => {
  it('erkennt eine Suche aus dem Deck mit Namens- und Typfilter', () => {
    expect(resultSpecs(ALUBER, 0)[0]).toMatchObject({
      verb: 'search',
      from: ['DECK'],
      to: 'HAND',
      count: 1,
      names: ['Branded'],
      kind: 'spellTrap',
    });
  });

  it('übernimmt „except“ auch hinter dem Ziel', () => {
    expect(resultSpecs(TRAGEDY, 0)[0]).toMatchObject({
      names: ['Despia'],
      except: ['Despian Tragedy'],
      kind: 'monster',
    });
  });

  it('liest Fusionsmaterial aus Hand, Deck und Feld', () => {
    expect(resultSpecs(FUSION, 0)[0]).toMatchObject({
      verb: 'fusion',
      from: ['EXTRA'],
      materials: { from: ['HAND', 'DECK', 'MONSTER'], count: 2 },
    });
  });

  it('liest Material von beiden Feldern und den Wirkungsteil nach dem Semikolon', () => {
    expect(resultSpecs(ALBAZ, 0)[0]).toMatchObject({
      verb: 'fusion',
      materials: { from: ['MONSTER'], count: 2 },
    });
  });

  it('versteht „take … from your Deck“', () => {
    expect(resultSpecs(OPENING, 0)[0]).toMatchObject({
      verb: 'search',
      from: ['DECK'],
      names: ['Despia'],
      kind: 'monster',
    });
  });

  it('liefert mehrteilige Wirkungen in Textreihenfolge', () => {
    expect(resultSpecs(RAINBOW, 0)).toMatchObject([
      { verb: 'summon', from: ['DECK'], names: ['Crystal Beast'], negate: true },
      { verb: 'search', from: ['DECK'], to: 'HAND', names: ['Ultimate Crystal'] },
    ]);
    expect(resultSpecs(RAINBOW, 0)[1].negate).toBeUndefined();
  });

  it('liefert nichts ohne erkennbares Muster', () => {
    expect(resultSpecs(QUEM, 0)).toEqual([]);
  });
});

describe('Kandidaten', () => {
  const state = initialState({
    cards: [
      { instanceId: 'bf1', cardId: FUSION.id, owner: 'self', zone: 'DECK' },
      { instanceId: 'red1', cardId: IN_RED.id, owner: 'self', zone: 'DECK' },
      { instanceId: 'red2', cardId: IN_RED.id, owner: 'self', zone: 'DECK' },
      { instanceId: 'q1', cardId: QUEM.id, owner: 'self', zone: 'DECK' },
      { instanceId: 'alb', cardId: ALBION.id, owner: 'self', zone: 'EXTRA' },
      { instanceId: 'alu', cardId: ALUBER.id, owner: 'self', zone: 'MONSTER' },
    ],
  });

  it('zeigt je Kartenname eine Kopie aus dem Deck und filtert nach Namen', () => {
    const picks = resultCandidates(resultSpecs(ALUBER, 0)[0], state, 'self', cards);
    expect(picks.map((c) => c.cardId)).toEqual([FUSION.id, IN_RED.id]);
  });

  it('zeigt mit „Alle Karten“ auch Unpassendes', () => {
    const picks = resultCandidates(resultSpecs(ALUBER, 0)[0], state, 'self', cards, true);
    expect(picks.map((c) => c.cardId)).toContain(QUEM.id);
  });

  it('bietet Fusionsmonster und Material aus den erlaubten Zonen an', () => {
    const spec = resultSpecs(FUSION, 0)[0];
    expect(resultCandidates(spec, state, 'self', cards).map((c) => c.cardId)).toEqual([ALBION.id]);
    expect(materialCandidates(spec, state, 'self', cards).map((c) => c.instanceId)).toEqual([
      'alu',
      'q1',
    ]);
  });
});
