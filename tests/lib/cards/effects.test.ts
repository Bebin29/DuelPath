// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { parseEffects, splitSentences } from '@/lib/cards/effects';

// Kartentexte wie von YGOPRODeck geliefert (inkl. \r\n)
const ASH =
  'When a card or effect is activated that includes any of these effects (Quick Effect): You can discard this card; negate that effect.\r\n● Add a card from the Deck to the hand.\r\n● Special Summon from the Deck.\r\n● Send a card from the Deck to the GY.\r\nYou can only use this effect of "Ash Blossom & Joyous Spring" once per turn.';
const ACCESSCODE =
  '2+ Effect Monsters\r\nYour opponent cannot activate cards or effects in response to this card\'s effect activations. If this card is Link Summoned: You can target 1 Link Monster that was used as material for its Link Summon; this card gains ATK equal to that monster\'s Link Rating x 1000. You can banish 1 Link Monster from your field or GY; destroy 1 card your opponent controls, also for the rest of this turn, you cannot banish monsters with that same Attribute to activate this effect of "Accesscode Talker".';
const ABYSS_ACTOR =
  '[ Pendulum Effect ] \nYou can target 1 "Abyss Actor" Pendulum Monster you control and 1 monster your opponent controls; switch control of both monsters, then destroy this card. You can only use this effect of "Abyss Actor - Comic Relief" once per turn.\n\n[ Monster Effect ] \nYou take no battle damage from attacks involving this card. Once per turn, during your Standby Phase: Give control of this card to your opponent. Once per turn, if control of this face-up card changes: Activate this effect; the owner of this card can destroy 1 Set "Abyss Script" Spell in their Spell & Trap Zone.';
const MAXX_C =
  'During either player\'s turn: You can send this card from your hand to the Graveyard; this turn, each time your opponent Special Summons a monster(s), immediately draw 1 card. You can only use 1 "Maxx "C"" per turn.';

describe('parseEffects', () => {
  it('Ash Blossom: ein Quick Effect mit Hard OPT, Aufzählung bleibt im Effekt', () => {
    const r = parseEffects(ASH, { name: 'Ash Blossom & Joyous Spring', type: 'Effect Monster' });
    expect(r.needsReview).toBe(false);
    expect(r.effects).toHaveLength(1);
    expect(r.effects[0]).toMatchObject({
      activated: true,
      opt: { kind: 'HARD', wording: 'use', per: 'turn', limit: 1 },
    });
    expect(r.effects[0].text).toContain('● Send a card from the Deck to the GY.');
    expect(r.effects[0].patterns).toEqual(expect.arrayContaining(['QUICK', 'NEG_EFFECT_CHAINED']));
  });

  it('Accesscode Talker: Materialzeile, Continuous Effect und zwei aktivierte Effekte', () => {
    const r = parseEffects(ACCESSCODE, { name: 'Accesscode Talker', type: 'Link Monster' });
    expect(r.materials).toBe('2+ Effect Monsters');
    expect(r.effects.map((e) => e.activated)).toEqual([false, true, true]);
    expect(r.effects.every((e) => !e.opt)).toBe(true);
    expect(r.needsReview).toBe(false);
  });

  it('Pendel-Karte: OPT gilt nur im Pendel-Abschnitt, Soft OPT im Monster-Abschnitt', () => {
    const r = parseEffects(ABYSS_ACTOR, {
      name: 'Abyss Actor - Comic Relief',
      type: 'Pendulum Effect Monster',
    });
    expect(r.effects.map((e) => [e.section, e.activated, e.opt?.kind])).toEqual([
      ['pendulum', true, 'HARD'],
      ['monster', false, undefined],
      ['monster', true, 'SOFT'],
      ['monster', true, 'SOFT'],
    ]);
    expect(r.needsReview).toBe(false);
  });

  it('Maxx "C": gemeinsamer Zähler über den Kartennamen mit Anführungszeichen', () => {
    const r = parseEffects(MAXX_C, { name: 'Maxx "C"', type: 'Effect Monster' });
    expect(r.effects).toHaveLength(1);
    expect(r.effects[0].opt).toEqual({
      kind: 'HARD',
      wording: 'shared',
      per: 'turn',
      limit: 1,
      group: 'Maxx "C"',
    });
  });

  it('"use each effect" gibt jedem aktivierten Effekt einen eigenen Hard OPT', () => {
    const r = parseEffects(
      'If this card is Normal Summoned: You can add 1 card from your Deck to your hand. If this card is sent to the GY: You can draw 1 card. You can only use each effect of "Example" once per turn.',
      { name: 'Example', type: 'Effect Monster' }
    );
    expect(r.effects.map((e) => e.opt?.kind)).toEqual(['HARD', 'HARD']);
    expect(r.effects.every((e) => !e.opt?.group)).toBe(true);
  });

  it('Aufzählung nach "each of the following effects" wird zu eigenen Effekten', () => {
    const r = parseEffects(
      'You can only use each of the following effects of "Therion "King" Regulus" once per turn.\r\n● You can target 1 "Therion" monster in your GY; Special Summon this card from your hand, and if you do, equip that monster to this card.\r\n● When a card or effect is activated (Quick Effect): You can send 1 Equip Card you control to the GY; negate the activation.',
      { name: 'Therion "King" Regulus', type: 'Effect Monster' }
    );
    expect(r.effects.map((e) => [e.activated, e.opt?.kind])).toEqual([
      [true, 'HARD'],
      [true, 'HARD'],
    ]);
    expect(r.effects[0].text.startsWith('You can target')).toBe(true);
    expect(r.needsReview).toBe(false);
  });

  it('"each of these effects" und Materialien mit " / " (Tsuchigumo)', () => {
    const r = parseEffects(
      '1 Tuner + 1+ non-Tuner monsters / You can only control 1 "Tsuchigumo, the Poisonous Mayakashi". You can only use each of these effects of "Tsuchigumo, the Poisonous Mayakashi" once per turn.\r\n● If a Synchro Monster you control is destroyed: You can Special Summon this card from your GY.\r\n● When this card destroys a monster by battle: You can draw 1 card.',
      { name: 'Tsuchigumo, the Poisonous Mayakashi', type: 'Synchro Monster' }
    );
    expect(r.materials).toBe('1 Tuner + 1+ non-Tuner monsters');
    expect(r.effects.map((e) => [e.activated, e.opt?.kind])).toEqual([
      [false, undefined],
      [true, 'HARD'],
      [true, 'HARD'],
    ]);
  });

  it('Fusion ohne Materialzeile: der erste Satz bleibt ein Effekt', () => {
    const r = parseEffects(
      'Must be Special Summoned with "The Fang of Critias". If this card is Special Summoned: You can look at your opponent\'s hand.',
      { name: 'Doom Virus Dragon', type: 'Fusion Monster' }
    );
    expect(r.materials).toBeUndefined();
    expect(r.effects).toHaveLength(2);
  });

  it('Normal Spell: Kartenaktivierung ist ein Chain Link, auch ohne Doppelpunkt', () => {
    const r = parseEffects('Draw 2 cards.', {
      name: 'Pot of Greed',
      type: 'Spell Card',
      race: 'Normal',
    });
    expect(r.effects).toEqual([expect.objectContaining({ activated: true })]);
  });

  it('"activate 1 X per turn" landet auf der Kartenaktivierung', () => {
    const r = parseEffects(
      'Banish 3 or 6 cards of your choice face-down from your Extra Deck; excavate cards from the top of your Deck equal to the number of cards banished, add 1 of them to your hand. You can only activate 1 "Pot of Prosperity" per turn.',
      { name: 'Pot of Prosperity', type: 'Spell Card', race: 'Normal' }
    );
    expect(r.effects[0].opt).toMatchObject({ kind: 'HARD', wording: 'activateCard' });
    expect(r.needsReview).toBe(false);
  });

  it('Normal Monster hat keine Effekte', () => {
    const r = parseEffects('The ultimate wizard in terms of attack and defense.', {
      name: 'Dark Magician',
      type: 'Normal Monster',
    });
    expect(r.effects).toEqual([]);
    expect(r.needsReview).toBe(false);
  });

  it('markiert OPT-Klauseln ohne passenden Effekt zur Prüfung', () => {
    const r = parseEffects(
      'This card cannot be destroyed by battle. You can only use this effect of "Example" once per turn.',
      { name: 'Example', type: 'Effect Monster' }
    );
    expect(r.needsReview).toBe(true);
  });
});

describe('splitSentences', () => {
  it('trennt nicht innerhalb von Kartennamen oder Klammern', () => {
    expect(
      splitSentences(
        'You can banish 1 "D.D. Crow" from your GY; draw 1 card. (This card\'s name is always treated as "Example".) Then shuffle.'
      )
    ).toEqual([
      'You can banish 1 "D.D. Crow" from your GY; draw 1 card.',
      '(This card\'s name is always treated as "Example".)',
      'Then shuffle.',
    ]);
  });
});
