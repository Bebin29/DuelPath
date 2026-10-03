// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { matchMechanics, type MechanicCard } from '@/lib/rulings/match';
import { parseEffects } from '@/lib/cards/effects';
import { RULING_MECHANICS } from '@/lib/rulings/mechanics';
import { RULING_SOURCES } from '@/lib/rulings/sources';

const ASH = {
  name: 'Ash Blossom & Joyous Spring',
  type: 'Tuner Monster',
  race: 'Zombie',
  desc: 'When a card or effect is activated that includes any of these effects (Quick Effect): You can discard this card; negate that effect.\n● Add a card from the Deck to the hand.\n● Special Summon from the Deck.\n● Send a card from the Deck to the GY.\nYou can only use this effect of "Ash Blossom & Joyous Spring" once per turn.',
};
const POT_OF_PROSPERITY = {
  name: 'Pot of Prosperity',
  type: 'Spell Card',
  race: 'Normal',
  desc: 'Banish 3 or 6 cards of your choice face-down from your Extra Deck; excavate cards from the top of your Deck equal to the number of cards banished, add 1 of them to your hand, place the rest on the bottom of your Deck in any order, also, for the rest of this turn, any damage your opponent takes is halved. You can only activate 1 "Pot of Prosperity" per turn.',
};
const SOLEMN_STRIKE = {
  name: 'Solemn Strike',
  type: 'Trap Card',
  race: 'Counter',
  desc: 'When a monster(s) would be Summoned, OR a Monster Effect is activated: Pay 1500 LP; negate the Summon or activation, and if you do, destroy that card.',
};
const IMPERM = {
  name: 'Infinite Impermanence',
  type: 'Trap Card',
  race: 'Normal',
  desc: 'Target 1 face-up monster your opponent controls; negate its effects (until the end of this turn), then, if this card was Set before activation and is on the field at resolution, for the rest of this turn all other Spell/Trap effects in this column are negated. If you control no cards, you can activate this card from your hand.',
};
const DARK_MAGICAL_CIRCLE = {
  name: 'Dark Magical Circle',
  type: 'Spell Card',
  race: 'Continuous',
  desc: 'When this card is activated: You can look at the top 3 cards of your Deck, then place 1 of them on top of your Deck and the rest on the bottom of your Deck in any order, then, if you placed a "Dark Magician" on top of your Deck, you can add 1 card from your hand or Deck to your hand. You can only use this effect of "Dark Magical Circle" once per turn.',
};

/** Karte wie im Import zerlegt, damit der Abgleich dieselben Muster sieht wie die App */
function card(input: { name: string; type: string; race: string; desc: string }): MechanicCard {
  return { ...input, effects: parseEffects(input.desc, input).effects };
}
const keysOf = (input: Parameters<typeof card>[0]) =>
  matchMechanics(card(input)).matched.map((m) => m.mechanic.key);

describe('matchMechanics', () => {
  it('erkennt Negierungsart und Hard OPT bei Ash Blossom', () => {
    const keys = keysOf(ASH);
    expect(keys).toEqual(
      expect.arrayContaining(['NEGATE_EFFECT_CHAINED', 'OPT_HARD_USE', 'COST', 'SPELL_SPEED'])
    );
    // Soft OPT und "activate"-Varianten gehören einer anderen Karte
    expect(keys).not.toContain('OPT_SOFT');
    expect(keys).not.toContain('OPT_HARD_ACTIVATE_CARD');
    expect(keys).not.toContain('NEGATE_ACTIVATION');
  });

  it('unterscheidet "activate 1 X per turn" von "use this effect"', () => {
    const keys = keysOf(POT_OF_PROSPERITY);
    expect(keys).toContain('OPT_HARD_ACTIVATE_CARD');
    expect(keys).not.toContain('OPT_HARD_USE');
    // Normal Spell: geht nach der Chain auf den Friedhof
    expect(keys).toContain('CHAIN_CLEANUP');
  });

  it('erkennt Negierung von Aktivierung und Beschwörung bei Solemn Strike', () => {
    const keys = keysOf(SOLEMN_STRIKE);
    expect(keys).toEqual(
      expect.arrayContaining(['NEGATE_ACTIVATION_DESTROY', 'NEGATE_SUMMON', 'COST', 'SPELL_SPEED'])
    );
  });

  it('erkennt die bleibende Negierung von Infinite Impermanence', () => {
    expect(keysOf(IMPERM)).toContain('NEGATE_EFFECTS_LINGER');
  });

  it('hält TRIGGER_IF_OR_MANDATORY von Quick Effects mit "When" fern', () => {
    // Der Eintrag sagt selbst: TRIGGER_MANDATORY trifft auch Quick Effects, zuerst QUICK prüfen
    expect(keysOf(ASH)).not.toContain('TRIGGER_IF_OR_MANDATORY');
    // Ohne Quick Effect bleibt der Pflicht-Trigger ein Treffer
    const trigger = {
      name: 'X',
      type: 'Effect Monster',
      race: 'Warrior',
      desc: 'If this card is Normal Summoned: Draw 1 card.',
    };
    expect(keysOf(trigger)).toContain('TRIGGER_IF_OR_MANDATORY');
  });

  it('zeigt für Quick Effects keine Regel zum verpassten Trigger-Timing', () => {
    expect(keysOf(ASH)).not.toContain('TRIGGER_WHEN_OPTIONAL');
    const mixed = {
      name: 'X',
      type: 'Effect Monster',
      race: 'Warrior',
      desc: 'When this card is Normal Summoned: You can draw 1 card.\nWhen a card or effect is activated (Quick Effect): You can discard this card; negate that effect.',
    };
    expect(keysOf(mixed)).toContain('TRIGGER_WHEN_OPTIONAL');
    expect(
      keysOf({ ...mixed, desc: mixed.desc.replace('When this card', 'If this card') })
    ).toContain('TRIGGER_IF_OR_MANDATORY');
  });

  it('verlangt für CONTINUOUS_ST_MUST_REMAIN eine Continuous Spell mit aktiviertem Effekt', () => {
    expect(keysOf(DARK_MAGICAL_CIRCLE)).toContain('CONTINUOUS_ST_MUST_REMAIN');
    // Normal Spell bleibt nicht liegen, die Regel passt nicht
    expect(keysOf(POT_OF_PROSPERITY)).not.toContain('CONTINUOUS_ST_MUST_REMAIN');
  });

  it('meldet OPT_PER_DUEL und OPT_MULTI nur beim passenden Wortlaut', () => {
    const base = { name: 'X', type: 'Effect Monster', race: 'Warrior' };
    const perTurn = {
      ...base,
      desc: 'You can banish 1 card; draw 1 card. You can only use this effect of "X" once per turn.',
    };
    const perDuel = {
      ...base,
      desc: 'You can banish 1 card; draw 1 card. You can only use this effect of "X" once per Duel.',
    };
    const twice = {
      ...base,
      desc: 'You can banish 1 card; draw 1 card. You can only use this effect of "X" twice per turn.',
    };

    expect(keysOf(perTurn)).not.toContain('OPT_PER_DUEL');
    expect(keysOf(perTurn)).not.toContain('OPT_MULTI');
    expect(keysOf(perDuel)).toContain('OPT_PER_DUEL');
    expect(keysOf(twice)).toContain('OPT_MULTI');
  });

  it('zählt COST nur, wenn ein Kostenverb vor dem Semikolon steht', () => {
    const base = { name: 'X', type: 'Effect Monster', race: 'Warrior' };
    // "send" steht erst im Auflösungsteil, ist also kein Kosten
    const noCost = {
      ...base,
      desc: 'If this card is Summoned: Send 1 card from your Deck to the GY.',
    };
    const withCost = { ...base, desc: 'You can discard 1 card; draw 1 card.' };

    expect(keysOf(noCost)).not.toContain('COST');
    expect(
      keysOf({
        ...base,
        desc: 'If this card is Summoned: You can send 1 card from your Deck to the GY.',
      })
    ).not.toContain('COST');
    expect(keysOf(withCost)).toContain('COST');
  });

  it('hält Spielregeln und unbelegte Fälle aus den Treffern heraus', () => {
    const { matched, general } = matchMechanics(card(ASH));
    const generalKeys = general.map((m) => m.key);

    expect(generalKeys).toEqual([
      'NORMAL_SUMMON_LIMIT',
      'SEGOC_TCG',
      'SEGOC_HAND_SS_LIMIT',
      'TRIGGER_LOCATION_CHANGE',
      'TRIGGER_NEGATED_SUMMON',
      'CHAIN_RESOLVE_REVERSE',
      'EQUIP_NEGATED',
    ]);
    expect(matched.map((m) => m.mechanic.key)).not.toEqual(expect.arrayContaining(generalKeys));
    // Jeder Treffer nennt, woran er erkannt wurde
    for (const hit of matched)
      expect(hit.patterns.length > 0 || hit.byCardType || hit.byStructure).toBe(true);
  });
});

describe('RULING_SOURCES', () => {
  it('kennt jedes Quellenkürzel aus RULING_MECHANICS', () => {
    for (const mechanic of RULING_MECHANICS) {
      expect(mechanic.sources.length, mechanic.key).toBeGreaterThan(0);
      for (const key of mechanic.sources) expect(RULING_SOURCES, mechanic.key).toHaveProperty(key);
    }
  });

  it('enthält genau die Kürzel aus docs/research/rulings.md', async () => {
    const { readFileSync } = await import('node:fs');
    const doc = readFileSync('docs/research/rulings.md', 'utf8');
    const section = doc.slice(doc.indexOf('## Quellen'));
    const docKeys = [...section.matchAll(/^- \[([A-Z]\d+)\]/gm)].map((m) => m[1]);

    expect(Object.keys(RULING_SOURCES)).toEqual(docKeys);
  });
});
