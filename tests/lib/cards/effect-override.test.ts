import { describe, expect, it } from 'vitest';
import {
  buildEffects,
  draftsOf,
  effectsOf,
  mergeDraft,
  splitDraft,
} from '@/lib/cards/effect-override';

const parsed = {
  effects: [
    {
      index: 0,
      text: 'You can discard this card; negate that effect.',
      activated: true,
      patterns: [],
      opt: {
        kind: 'HARD' as const,
        wording: 'use' as const,
        per: 'turn' as const,
        limit: 1,
        group: 'Ash',
      },
    },
  ],
};

describe('Effekt-Korrektur', () => {
  it('bevorzugt die Korrektur vor der Zerlegung', () => {
    expect(effectsOf({ effects: parsed })).toHaveLength(1);
    expect(effectsOf({ effects: parsed, effectsOverride: [] })).toEqual([]);
  });

  it('behält die erkannte OPT-Klausel und berechnet Muster neu', () => {
    const [effect] = buildEffects(draftsOf(parsed.effects));
    expect(effect.opt).toMatchObject({ kind: 'HARD', group: 'Ash' });
    expect(effect.patterns).toContain('NEG_EFFECT_CHAINED');
    const soft = buildEffects([{ ...draftsOf(parsed.effects)[0], opt: 'SOFT' }])[0];
    expect(soft.opt).toEqual({ kind: 'SOFT', wording: 'use', per: 'turn', limit: 1 });
  });

  it('teilt und legt zusammen', () => {
    const drafts = draftsOf(parsed.effects);
    const split = splitDraft(drafts, 0, 'You can discard this card;'.length);
    expect(split.map((d) => d.text)).toEqual(['You can discard this card;', 'negate that effect.']);
    expect(mergeDraft(split, 0)[0].text).toBe('You can discard this card; negate that effect.');
    expect(splitDraft(drafts, 0, 0)).toBe(drafts);
  });
});
