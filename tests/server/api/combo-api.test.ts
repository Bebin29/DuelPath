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
