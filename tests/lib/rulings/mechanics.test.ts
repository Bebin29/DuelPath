// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { PATTERNS, RULING_MECHANICS, detectPatterns } from '@/lib/rulings/mechanics';

const ASH =
  'When a card or effect is activated that includes any of these effects (Quick Effect): You can discard this card; negate that effect.\n● Add a card from the Deck to the hand.\n● Special Summon from the Deck.\n● Send a card from the Deck to the GY.\nYou can only use this effect of "Ash Blossom & Joyous Spring" once per turn.';
const MAXX_C =
  'During either player\'s turn: You can send this card from your hand to the Graveyard; this turn, each time your opponent Special Summons a monster(s), immediately draw 1 card. You can only use 1 "Maxx "C"" per turn.';
const POT_OF_PROSPERITY =
  'Banish 3 or 6 cards of your choice face-down from your Extra Deck; excavate cards from the top of your Deck equal to the number of cards banished, add 1 of them to your hand, place the rest on the bottom of your Deck in any order, also, for the rest of this turn, any damage your opponent takes is halved. You can only activate 1 "Pot of Prosperity" per turn.';
const SOLEMN_STRIKE =
  'When a monster(s) would be Summoned, OR a Monster Effect is activated: Pay 1500 LP; negate the Summon or activation, and if you do, destroy that card.';
const IMPERM =
  'Target 1 face-up monster your opponent controls; negate its effects (until the end of this turn), then, if this card was Set before activation and is on the field at resolution, for the rest of this turn all other Spell/Trap effects in this column are negated. If you control no cards, you can activate this card from your hand.';
const CALLED_BY =
  "Target 1 monster in your opponent's GY; banish it, and if you do, until the end of the next turn, its effects are negated, as well as the activated effects and effects on the field of monsters with the same original name.";

describe('PATTERNS', () => {
  it('erkennt Hard OPT mit "use" und liefert den Kartennamen', () => {
    expect(ASH.match(PATTERNS.OPT_USE_THIS)?.[1]).toBe('Ash Blossom & Joyous Spring');
    expect(detectPatterns(ASH)).toEqual(
      expect.arrayContaining(['OPT_USE_THIS', 'QUICK', 'NEG_EFFECT_CHAINED', 'COST_VERB'])
    );
    expect(detectPatterns(ASH)).not.toContain('OPT_SOFT');
  });

  it('liest Kartennamen mit Anführungszeichen (Maxx "C")', () => {
    expect(MAXX_C.match(PATTERNS.OPT_USE_CARD)?.[1]).toBe('Maxx "C"');
    expect(detectPatterns(MAXX_C)).toContain('QUICK');
  });

  it('unterscheidet "activate 1 X per turn"', () => {
    expect(POT_OF_PROSPERITY.match(PATTERNS.OPT_ACTIVATE_CARD)?.[1]).toBe('Pot of Prosperity');
    expect(detectPatterns(POT_OF_PROSPERITY)).not.toContain('OPT_USE_THIS');
  });

  it('erkennt die Negierungsarten', () => {
    expect(detectPatterns(SOLEMN_STRIKE)).toEqual(
      expect.arrayContaining(['NEG_ACT_DESTROY', 'NEG_SUMMON'])
    );
    expect(detectPatterns(IMPERM)).toContain('NEG_EFFECTS_LINGER');
    expect(detectPatterns(CALLED_BY)).toEqual(
      expect.arrayContaining(['NEG_BY_NAME', 'CONJ_AND_IFYOUDO'])
    );
  });

  it('erkennt Soft OPT und "each effect"', () => {
    expect(
      detectPatterns('Once per turn: You can target 1 monster on the field; destroy it.')
    ).toContain('OPT_SOFT');
    expect(
      'You can only use each effect of "Example" once per turn.'.match(PATTERNS.OPT_USE_EACH)?.[1]
    ).toBe('Example');
  });
});

describe('RULING_MECHANICS', () => {
  it('enthält genau die Einträge aus docs/research/rulings.md', () => {
    const doc = readFileSync('docs/research/rulings.md', 'utf8');
    const section = doc.slice(doc.indexOf('### Einträge'), doc.indexOf('## Quellen'));
    const docKeys = [...section.matchAll(/^\| `([A-Z_]+)`/gm)].map((m) => m[1]);

    expect(RULING_MECHANICS.map((m) => m.key)).toEqual(docKeys);
  });

  it('verweist nur auf existierende Muster', () => {
    const known = new Set<string>([...Object.keys(PATTERNS), 'engine', 'cardType', 'context']);
    for (const mechanic of RULING_MECHANICS) {
      for (const detect of mechanic.detect) {
        expect(known, `${mechanic.key} -> ${detect}`).toContain(detect);
      }
    }
  });
});
