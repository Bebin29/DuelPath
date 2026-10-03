// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

const storeCombo = vi.hoisted(() => vi.fn());
vi.mock('@/lib/prisma/client', () => ({ prisma: {} }));
vi.mock('@/lib/auth/auth', () => ({ auth: vi.fn() }));
vi.mock('@/server/services/combo-store.service', async (original) => ({
  ...(await original<typeof import('@/server/services/combo-store.service')>()),
  storeCombo,
}));

import {
  answerStep,
  buildContext,
  openPrompts,
  playStep,
  stepResult,
  stressView,
  type ComboContext,
} from '@/server/api/combo-api';
import { ApiError } from '@/server/api/http';
import type { ComboCard } from '@/lib/combo/cards';
import type { PatternKey } from '@/lib/rulings/mechanics';

const eff = (text: string, patterns: PatternKey[] = []) => ({
  index: 0,
  text,
  activated: true,
  patterns,
});
const card = (c: Partial<ComboCard> & { id: string; name: string; type: string }) =>
  ({ effects: [], ...c }) as ComboCard;
const CARDS = [
  card({
    id: 'ALU',
    name: 'Aluber the Jester of Despia',
    type: 'Effect Monster',
    effects: [
      eff(
        'If this card is Normal Summoned: You can add 1 "Branded" Spell/Trap from your Deck to your hand.',
        ['TRIGGER_IF_OPT']
      ),
    ],
  }),
  card({ id: 'BF', name: 'Branded Fusion', type: 'Spell Card' }),
  card({ id: 'ALB', name: 'Albion the Branded Dragon', type: 'Fusion Monster' }),
];

const context = (): ComboContext =>
  buildContext('user-1', {
    id: 'combo-1',
    title: 'Test',
    deckId: null,
    tags: [],
    status: 'DRAFT',
    revision: 3,
    startState: {
      cards: [
        { instanceId: 'alu', cardId: 'ALU', owner: 'self', zone: 'HAND' },
        { instanceId: 'bf', cardId: 'BF', owner: 'self', zone: 'DECK' },
        { instanceId: 'alb', cardId: 'ALB', owner: 'self', zone: 'EXTRA' },
      ],
    },
    nodes: [],
    cards: CARDS,
  });

/** Fehlercode eines abgelehnten Aufrufs */
const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'OK',
    (e) => (e instanceof ApiError ? e.code : String(e))
  );

describe('REST-API: Schritte', () => {
  beforeEach(() => {
    storeCombo.mockReset();
    storeCombo.mockImplementation(async (_u, _c, _i, rev?: number) => ({
      revision: (rev ?? 3) + 1,
    }));
  });

  it('spielt einen Befehl, speichert mit Revision und nennt den Trigger', async () => {
    const result = await playStep(context(), { command: 'ns aluber', revision: 3 });
    expect(storeCombo).toHaveBeenCalledWith(
      'user-1',
      'combo-1',
      expect.objectContaining({
        nodes: [expect.objectContaining({ action: 'NORMAL_SUMMON', cardId: 'ALU' })],
      }),
      3
    );
    const view = stepResult(result.ctx, result.created, result.prompts);
    expect(view.revision).toBe(4);
    expect(view.state.self.MONSTER.map((c) => c.instanceId)).toEqual(['alu']);
    expect(view.triggers).toEqual([
      expect.objectContaining({
        instanceId: 'alu',
        intent: { kind: 'activate', instanceId: 'alu', effectIndex: 0 },
      }),
    ]);
  });

  it('stellt die Suchfrage und nimmt nur Kandidaten als Antwort', async () => {
    let { ctx } = await playStep(context(), { command: 'ns aluber' });
    const act = await playStep(ctx, { command: 'act aluber' });
    ctx = act.ctx;
    const stepId = act.created.at(-1)!.id;
    const view = stepResult(ctx, act.created, act.prompts);
    expect(view.prompts).toEqual([
      expect.objectContaining({
        kind: 'result',
        question: 'What did you search?',
        candidates: [expect.objectContaining({ instanceId: 'bf' })],
      }),
    ]);

    expect(await codeOf(answerStep(ctx, stepId, { picks: ['alb'] }))).toBe('INVALID');
    const answered = await answerStep(ctx, stepId, { picks: ['bf'] });
    expect(answered.prompts).toEqual([]);
    expect(storeCombo.mock.lastCall![2].nodes.at(-1).resolveMoves).toEqual([
      { instanceId: 'bf', cardId: 'BF', from: 'DECK', to: 'HAND' },
    ]);
  });

  it('beantwortete Fragen sind nicht mehr offen', async () => {
    const { ctx } = await playStep(context(), { command: 'ns aluber' });
    const act = await playStep(ctx, { command: 'act aluber' });
    const stepId = act.created.at(-1)!.id;
    expect(openPrompts(act.ctx, stepId)).toHaveLength(1);
    storeCombo.mockResolvedValue({ revision: 9 });
    await answerStep(act.ctx, stepId, { picks: ['bf'] });
    const nodes = storeCombo.mock.lastCall![2].nodes;
    const after = buildContext('user-1', { ...act.ctx.combo, nodes });
    expect(openPrompts(after, stepId)).toEqual([]);
  });

  it('fragt nach dem Ziel und wendet die Wirkung beim Auflösen darauf an', async () => {
    const MST = card({
      id: 'MST',
      name: 'Mystical Space Typhoon',
      type: 'Spell Card',
      race: 'Quick-Play',
      effects: [eff('Target 1 Spell/Trap on the field; destroy that target.')],
    });
    const TRAP = card({ id: 'TRP', name: 'Some Trap', type: 'Trap Card' });
    const ctx = buildContext('user-1', {
      ...context().combo,
      startState: {
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
        ],
      },
      cards: [MST, TRAP],
    });
    const act = await playStep(ctx, { command: 'act mystical' });
    const stepId = act.created.at(-1)!.id;
    expect(stepResult(act.ctx, act.created, act.prompts).prompts).toEqual([
      expect.objectContaining({
        kind: 'target',
        question: 'Which card do you target?',
        candidates: [expect.objectContaining({ instanceId: 'trap' })],
      }),
    ]);
    const answered = await answerStep(act.ctx, stepId, { kind: 'target', picks: ['trap'] });
    expect(answered.prompts).toEqual([]);
    const nodes = storeCombo.mock.lastCall![2].nodes;
    expect(nodes.at(-1).targets).toEqual(['trap']);
    const res = await playStep(buildContext('user-1', { ...act.ctx.combo, nodes }), {
      command: 'res',
    });
    const view = stepResult(res.ctx, res.created, res.prompts);
    expect(view.state.opponent.GY.map((c) => c.instanceId)).toEqual(['trap']);
  });

  it('lehnt veraltete Revisionen ab, bevor Regeln geprüft werden', async () => {
    expect(await codeOf(playStep(context(), { command: 'res', revision: 2 }))).toBe('CONFLICT');
    expect(storeCombo).not.toHaveBeenCalled();
  });

  it('meldet einen Konflikt beim Speichern als CONFLICT', async () => {
    storeCombo.mockResolvedValue({ code: 'CONFLICT', message: 'geändert' });
    expect(await codeOf(playStep(context(), { command: 'ns aluber' }))).toBe('CONFLICT');
  });

  it('erklärt, was fehlt oder nicht geht', async () => {
    expect(await codeOf(playStep(context(), { command: 'fly aluber' }))).toBe('INVALID');
    expect(await codeOf(playStep(context(), { command: 'res' }))).toBe('NOT_POSSIBLE');
    expect(await codeOf(playStep(context(), { command: 'ns nichts' }))).toBe('NOT_POSSIBLE');
    const extra = await playStep(context(), { command: 'ss albion' }).catch((e) => e);
    expect(extra).toMatchObject({ code: 'NOT_POSSIBLE', details: { needs: 'materials' } });
  });
});

/**
 * Gegnerboard im Stresstest (Lücke L1). Startzustand: Aluber auf der Hand, Apollousa offen
 * beim Gegner. Von Hand: Schritt 1 ist die Normalbeschwörung, die Apollousa nicht beantwortet;
 * Schritt 2 ist Alubers Monstereffekt, den Apollousa negiert.
 */
describe('REST-API: Stresstest gegen das Gegnerboard', () => {
  const APOLLOUSA = card({
    id: 'APO',
    name: 'Apollousa, Bow of the Goddess',
    type: 'Link Monster',
    effects: [
      eff(
        "(Quick Effect): You can make this card lose exactly 800 ATK, and if you do, negate the activation of an opponent's monster effect.",
        ['QUICK', 'NEG_ACTIVATION']
      ),
    ],
  });
  const withBoard = (): ComboContext =>
    buildContext('user-1', {
      ...context().combo,
      cards: [...CARDS, APOLLOUSA],
      startState: {
        cards: [
          ...context().combo.startState.cards,
          {
            instanceId: 'apo',
            cardId: 'APO',
            owner: 'opponent',
            zone: 'MONSTER',
            position: 'ATK',
          },
        ],
      },
    });

  beforeEach(() => {
    storeCombo.mockReset();
    storeCombo.mockResolvedValue({ revision: 4 });
  });

  it('nennt pro Schritt die liegende Karte, die ihn beantwortet', async () => {
    const { ctx } = await playStep(withBoard(), { command: 'ns aluber' });
    const act = await playStep(ctx, { command: 'act aluber' });
    const hits = stressView(act.ctx, null, false).filter((h) => h.source);
    expect(hits).toEqual([
      expect.objectContaining({
        name: 'Apollousa, Bow of the Goddess',
        short: 'Apollousa',
        pattern: 'MONSTER_EFFECT',
        step: 2,
        source: expect.objectContaining({ instanceId: 'apo', zone: 'MONSTER' }),
      }),
    ]);
  });

  it('ohne Gegnerboard meldet dieselbe Line keine liegende Karte', async () => {
    const { ctx } = await playStep(context(), { command: 'ns aluber' });
    const act = await playStep(ctx, { command: 'act aluber' });
    expect(stressView(act.ctx, null, false).filter((h) => h.source)).toEqual([]);
  });
});
