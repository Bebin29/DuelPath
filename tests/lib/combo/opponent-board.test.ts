import { describe, expect, it } from 'vitest';
import { initialState, type CardData, type StartState } from '@/lib/combo/state';
import { hitsByStep, type Hit } from '@/lib/combo/stress';
import {
  applyPreset,
  boardThreats,
  boardThreatKey,
  presetFrom,
  shortName,
} from '@/lib/combo/opponent-board';

const eff = (text: string, patterns: string[] = []) => ({
  index: 0,
  text,
  activated: true,
  patterns: patterns as never[],
});

/** Negiert die Aktivierung eines gegnerischen Monstereffekts */
const APOLLOUSA: CardData = {
  id: 'APO',
  name: 'Apollousa, Bow of the Goddess',
  type: 'Link Monster',
  effects: [
    eff(
      "(Quick Effect): You can make this card lose exactly 800 ATK, and if you do, negate the activation of an opponent's monster effect.",
      ['QUICK', 'NEG_ACTIVATION']
    ),
  ],
};
/** Negiert Zauber, Fallen und Monstereffekte und zerstört die Karte */
const BARONNE: CardData = {
  id: 'BAR',
  name: 'Baronne de Fleur',
  type: 'Synchro Monster',
  effects: [
    eff(
      'Once per turn, when a Spell/Trap Card, or monster effect, is activated (Quick Effect): You can negate the activation, and if you do, destroy that card.',
      ['QUICK', 'NEG_ACT_DESTROY', 'NEG_ACTIVATION']
    ),
  ],
};
/** Negiert die Beschwörung */
const WARNING: CardData = {
  id: 'WARN',
  name: 'Solemn Warning',
  type: 'Trap Card',
  effects: [
    eff(
      'When a monster(s) would be Summoned, OR when a card or effect is activated that includes an effect that Special Summons a monster(s): Pay 2000 LP; negate the Summon or effect, and if you do, destroy that card.',
      ['NEG_SUMMON', 'NEG_ACT_DESTROY']
    ),
  ],
};
/** Quick-Effekt ohne Negierung: stört, beantwortet aber keinen bestimmten Schritt */
const POPPER: CardData = {
  id: 'POP',
  name: 'Popper',
  type: 'Link Monster',
  effects: [eff('(Quick Effect): You can target 1 card on the field; destroy it.', ['QUICK'])],
};
const VANILLA: CardData = { id: 'VAN', name: 'Vanilla', type: 'Normal Monster', effects: [] };

const cards = new Map([APOLLOUSA, BARONNE, WARNING, POPPER, VANILLA].map((c) => [c.id, c]));

const board = (...entries: [string, string, 'ATK' | 'SET', 'MONSTER' | 'SPELL_TRAP'][]) =>
  initialState({
    cards: entries.map(([instanceId, cardId, position, zone]) => ({
      instanceId,
      cardId,
      owner: 'opponent' as const,
      zone,
      position,
    })),
  } satisfies StartState);

describe('boardThreats', () => {
  it('liest Apollousa als Antwort auf Monstereffekte', () => {
    const [threat, ...rest] = boardThreats(board(['apo', 'APO', 'ATK', 'MONSTER']), cards);
    expect(rest).toEqual([]);
    expect(threat.instanceId).toBe('apo');
    expect(threat.staple).toMatchObject({
      name: boardThreatKey('apo'),
      short: 'Apollousa',
      side: 'opponent',
      kind: 'onField',
      hits: ['MONSTER_EFFECT'],
      negation: 'ACTIVATION_TOP',
    });
    expect(threat.staple.removes).toBeUndefined();
  });

  it('liest Baronne als Antwort auf Monstereffekte und auf Zauber und Fallen', () => {
    const [threat] = boardThreats(board(['bar', 'BAR', 'ATK', 'MONSTER']), cards);
    expect(threat.staple.hits).toEqual(
      expect.arrayContaining(['MONSTER_EFFECT', 'SPELL_TRAP_ACTIVATION'])
    );
    expect(threat.staple.hits).toHaveLength(2);
    expect(threat.staple.removes).toBe('destroy');
  });

  it('liest eine gesetzte Falle, die die Beschwörung negiert', () => {
    const [threat] = boardThreats(board(['warn', 'WARN', 'SET', 'SPELL_TRAP']), cards);
    expect(threat.staple.kind).toBe('setTrap');
    expect(threat.staple.hits).toEqual(['SUMMON', 'SUMMONING_EFFECT']);
    expect(threat.staple.negation).toBe('ACTIVATION_OR_SUMMON');
  });

  it('nimmt störende Karten ohne Negierung ohne Muster auf', () => {
    const [threat] = boardThreats(board(['pop', 'POP', 'ATK', 'MONSTER']), cards);
    expect(threat.staple.hits).toBeUndefined();
  });

  it('lässt Karten ohne Unterbrechung und bereits gewählte Staples weg', () => {
    expect(boardThreats(board(['van', 'VAN', 'ATK', 'MONSTER']), cards)).toEqual([]);
    expect(
      boardThreats(board(['warn', 'WARN', 'SET', 'SPELL_TRAP']), cards, new Set(['WARN']))
    ).toEqual([]);
  });

  it('zählt eigene Karten nicht und gibt jeder Kopie einen eigenen Eintrag', () => {
    const state = initialState({
      cards: [
        { instanceId: 'apo1', cardId: 'APO', owner: 'opponent', zone: 'MONSTER', position: 'ATK' },
        { instanceId: 'apo2', cardId: 'APO', owner: 'opponent', zone: 'MONSTER', position: 'ATK' },
        { instanceId: 'mine', cardId: 'BAR', owner: 'self', zone: 'MONSTER', position: 'ATK' },
      ],
    });
    expect(boardThreats(state, cards).map((t) => t.instanceId)).toEqual(['apo1', 'apo2']);
  });

  it('speichert ein Gegnerboard und setzt es ohne die eigene Hand wieder ein', () => {
    const start: StartState = {
      cards: [
        { instanceId: 'alu', cardId: 'ALU', owner: 'self', zone: 'HAND' },
        { instanceId: 'apo', cardId: 'APO', owner: 'opponent', zone: 'MONSTER', position: 'ATK' },
        {
          instanceId: 'warn',
          cardId: 'WARN',
          owner: 'opponent',
          zone: 'SPELL_TRAP',
          position: 'SET',
        },
        // Das gegnerische Deck gehört nicht zum Board
        { instanceId: 'deck', cardId: 'VAN', owner: 'opponent', zone: 'DECK' },
      ],
    };
    const preset = presetFrom(start, '  Fiendsmith ');
    expect(preset).toEqual({
      name: 'Fiendsmith',
      cards: [
        { cardId: 'APO', zone: 'MONSTER', position: 'ATK' },
        { cardId: 'WARN', zone: 'SPELL_TRAP', position: 'SET' },
      ],
    });

    const other: StartState = {
      cards: [
        { instanceId: 'mine', cardId: 'VAN', owner: 'self', zone: 'HAND' },
        { instanceId: 'alt', cardId: 'BAR', owner: 'opponent', zone: 'MONSTER', position: 'ATK' },
      ],
    };
    const applied = applyPreset(other, preset);
    // Die eigene Hand bleibt, das alte Gegnerboard geht, die neuen Karten sind eigene Instanzen
    expect(applied.cards.filter((c) => c.owner === 'self')).toEqual(other.cards.slice(0, 1));
    expect(applied.cards.filter((c) => c.owner === 'opponent').map((c) => c.cardId)).toEqual([
      'APO',
      'WARN',
    ]);
    expect(applied.cards.some((c) => c.instanceId === 'alt')).toBe(false);
    expect(new Set(applied.cards.map((c) => c.instanceId)).size).toBe(3);
    // Eingesetzt stört das Board wieder genauso
    expect(
      boardThreats(initialState(applied), cards)
        .map((t) => t.staple.short)
        .sort()
    ).toEqual(['Apollousa', 'Solemn Warning']);
  });

  it('kürzt lange Kartennamen für Chips', () => {
    expect(shortName('Apollousa, Bow of the Goddess')).toBe('Apollousa');
    expect(shortName('Baronne de Fleur')).toBe('Baronne de Fleur');
    expect(shortName('Mekk-Knight Crusadia Avramax')).toBe('Mekk-Knight Crusa…');
  });
});

describe('hitsByStep', () => {
  it('stellt die liegende Gegnerkarte vor die Handtraps', () => {
    const hit = (staple: string, source?: string) =>
      ({
        staple,
        pattern: 'MONSTER_EFFECT',
        stepId: 's1',
        anchorId: 's1',
        ...(source && { source }),
      }) as Hit;
    expect(
      hitsByStep([hit('Ash'), hit('board:apo', 'apo'), hit('Veiler')])
        .get('s1')!
        .map((h) => h.staple)
    ).toEqual(['board:apo', 'Ash', 'Veiler']);
  });
});
