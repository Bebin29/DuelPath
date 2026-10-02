import { z } from 'zod';
import { prisma } from '@/lib/prisma/client';
import {
  isOptAvailable,
  isTriggerEffect,
  initialState,
  pathTo,
  statesForTree,
  warningsOf,
  type ComboNodeData,
  type GameState,
  type PlacedCard,
  type Zone,
} from '@/lib/combo/state';
import type { ComboCard } from '@/lib/combo/cards';
import { childrenOf, lineSteps, lineThrough, nextRank, promoteLine } from '@/lib/combo/lines';
import { removeSubtree, updateNode } from '@/lib/combo/tree';
import { buildStep, freeEmz, resolveOf, triggerOffers, type PlayIntent } from '@/lib/combo/play';
import { cardActions } from '@/lib/combo/card-actions';
import { commandMatches, matchCards, parseCommand } from '@/lib/combo/command';
import { answerPrompt, promptCandidates, promptsFor, type PromptSpec } from '@/lib/combo/prompts';
import { existingBranch, stressBranch, stressTest, type Hit } from '@/lib/combo/stress';
import { endboardSummary, lineEnds } from '@/lib/combo/endboard';
import { usedOptNames } from '@/lib/combo/opt-names';
import { STAPLES, type Staple } from '@/lib/combo/reactions';
import { toComboCard } from '@/lib/combo/cards';
import { nicknameMap, parseSettings } from '@/lib/settings';
import { stepLabel } from '@/components/workbench/step-label';
import { COMBO_STATUSES } from '@/lib/combo/library';
import { suggestTitle } from '@/lib/deck/hand-tester';
import {
  CARD_SELECT,
  createComboFor,
  isStoreError,
  loadDeckEntries,
  loadCards,
  loadCombo,
  storeCombo,
  type LoadedCombo,
} from '@/server/services/combo-store.service';
import { ApiError } from './http';

/**
 * Combo-Logik der REST-API. Sie nutzt dieselbe Spielbibliothek wie die Workbench: Schritte
 * entstehen aus Befehlen oder Absichten, offene Fragen werden wie in der Schrittleiste abgeleitet.
 * Ein Agent sieht nach jedem Aufruf das Board, die Warnungen und was als Nächstes geht.
 */

const KIND_LABEL: Record<ComboNodeData['kind'], string> = {
  ACTION: 'Action',
  ACTIVATE: 'Activation',
  OPPONENT: 'Opponent responds',
  RESOLVE: 'Resolve chain',
  END: 'Endboard',
};

export interface ComboContext {
  userId: string;
  combo: LoadedCombo;
  cards: Map<string, ComboCard>;
  start: GameState;
  states: Map<string, GameState>;
  nicknames: Record<string, string[]>;
  staples: { staple: Staple; card: ComboCard }[];
}

export async function comboContext(userId: string, comboId: string): Promise<ComboContext> {
  const combo = await loadCombo(userId, comboId);
  if (!combo) throw new ApiError('NOT_FOUND', 'Combo nicht gefunden');
  const [user, stapleRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { settings: true } }),
    prisma.card.findMany({
      where: {
        name: { in: STAPLES.map((s) => s.name) },
        OR: [{ banTcg: null }, { banTcg: { not: 'Forbidden' } }],
      },
      select: CARD_SELECT,
    }),
  ]);
  const settings = parseSettings(user?.settings);
  const byName = new Map(stapleRows.map((r) => [r.name, toComboCard(r)]));
  const staples = STAPLES.filter((s) => s.side === 'opponent')
    .filter((s) => !settings.staples || settings.staples.includes(s.name))
    .flatMap((staple) => {
      const card = byName.get(staple.name);
      return card ? [{ staple, card }] : [];
    });
  return buildContext(userId, combo, nicknameMap(settings.nicknames), staples);
}

/** Kontext aus bereits geladenen Daten, ohne Datenbank */
export function buildContext(
  userId: string,
  combo: LoadedCombo,
  nicknames: Record<string, string[]> = {},
  staples: ComboContext['staples'] = []
): ComboContext {
  return withNodes(
    {
      userId,
      combo,
      cards: new Map(combo.cards.map((c) => [c.id, c])),
      start: initialState(combo.startState),
      states: new Map(),
      nicknames,
      staples,
    },
    combo.nodes
  );
}

/** Kontext mit neuen Knoten; Zustände werden neu berechnet */
function withNodes(ctx: ComboContext, nodes: ComboNodeData[]): ComboContext {
  return {
    ...ctx,
    combo: { ...ctx.combo, nodes },
    states: statesForTree(nodes, ctx.combo.startState, ctx.cards),
  };
}

/** Karten nachladen, die neu dazukommen (Staples, Spielmarken) */
async function ensureCards(ctx: ComboContext, ids: string[]) {
  const missing = ids.filter((id) => !ctx.cards.has(id));
  if (!missing.length) return;
  for (const card of await loadCards(missing)) ctx.cards.set(card.id, card);
}

// ---------------------------------------------------------------- Schritte finden

export const node = (ctx: ComboContext, id: string) => {
  const found = ctx.combo.nodes.find((n) => n.id === id);
  if (!found) throw new ApiError('NOT_FOUND', `Schritt ${id} nicht gefunden`);
  return found;
};

/** Ende der Hauptline: dort hängt ein Schritt ohne Angabe von `after` an */
const mainLeaf = (ctx: ComboContext) => lineThrough(ctx.combo.nodes, null).at(-1) ?? null;

/** `after`: Schritt-ID, "start" für die Starthand, ohne Angabe das Ende der Hauptline */
export function resolveAfter(ctx: ComboContext, after: string | null | undefined) {
  if (after === undefined) return mainLeaf(ctx);
  if (after === null || after === 'start') return null;
  return node(ctx, after);
}

export const stateAt = (ctx: ComboContext, stepId: string | null) =>
  (stepId && ctx.states.get(stepId)) || ctx.start;

// ---------------------------------------------------------------- Ansichten

export function cardView(ctx: ComboContext, placed: PlacedCard) {
  const card = ctx.cards.get(placed.cardId);
  return {
    instanceId: placed.instanceId,
    cardId: placed.cardId,
    name: card?.name ?? placed.cardId,
    ...(card?.nameDe && { nameDe: card.nameDe }),
    type: card?.type,
    zone: placed.zone,
    ...(placed.slot !== undefined && { slot: placed.slot }),
    ...(placed.position && { position: placed.position }),
    owner: placed.owner,
    controller: placed.controller,
    ...(placed.attachedTo && { attachedTo: placed.attachedTo }),
    ...(placed.token && { token: true }),
  };
}

const ZONES: Zone[] = [
  'HAND',
  'MONSTER',
  'SPELL_TRAP',
  'FIELD',
  'GY',
  'BANISHED',
  'EXTRA',
  'DECK',
  'MATERIAL',
];

/** Board, Chain, HOPT-Stand und Warnungen zu einem Schritt */
export function stateView(ctx: ComboContext, state: GameState, stepId: string | null) {
  const side = (player: 'self' | 'opponent') =>
    Object.fromEntries(
      ZONES.map((zone) => [
        zone,
        Object.values(state.cards)
          .filter(
            (c) =>
              c.zone === zone &&
              (zone === 'MONSTER' || zone === 'SPELL_TRAP' || zone === 'FIELD'
                ? c.controller
                : c.owner) === player
          )
          .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0) || a.instanceId.localeCompare(b.instanceId))
          .map((c) => cardView(ctx, c)),
      ])
    );
  return {
    stepId,
    lp: state.lp,
    normalSummonUsed: state.normalSummonUsed,
    chain: state.chain.map((link, i) => ({
      link: i + 1,
      stepId: link.nodeId,
      player: link.player,
      instanceId: link.instanceId,
      card: link.cardId ? ctx.cards.get(link.cardId)?.name : undefined,
      effectIndex: link.effectIndex,
      ...(link.negated && { negated: link.negated }),
    })),
    self: side('self'),
    opponent: side('opponent'),
    hoptUsed: usedOptNames(state, ctx.cards, 'en'),
    warnings: stepId ? warningsOf(state, stepId) : [],
  };
}

/** Was mit einer Karte geht, als fertige Absicht zum Absenden */
export function actionsView(ctx: ComboContext, state: GameState, instanceId: string) {
  const { effects, other } = cardActions(state, ctx.cards, instanceId);
  return [...effects, ...other].map((a) => ({
    id: a.id,
    label: a.label === 'effect' ? `effect ${Number(a.id.split('-')[1]) + 1}` : a.label,
    ...(a.key && { key: a.key }),
    ...(a.effectText && { text: a.effectText }),
    ...(a.opt && { opt: a.opt, free: a.free }),
    ...(a.intent && { intent: a.intent }),
    ...(a.extraSummon && { needsMaterials: true }),
  }));
}

export function stepView(ctx: ComboContext, n: ComboNodeData, number?: number) {
  const state = ctx.states.get(n.id);
  return {
    id: n.id,
    parentId: n.parentId,
    ...(number !== undefined && { number }),
    rank: n.rank ?? 0,
    kind: n.kind,
    player: n.player,
    label: stepLabel(n, ctx.cards, 'en', state, (k) => KIND_LABEL[k]),
    ...(n.edgeLabel && { edgeLabel: n.edgeLabel }),
    ...(n.instanceId && { instanceId: n.instanceId }),
    ...(n.cardId && { card: ctx.cards.get(n.cardId)?.name ?? n.cardId }),
    ...(n.effectIndex != null && { effectIndex: n.effectIndex }),
    ...(n.action && { action: n.action }),
    ...(n.note && { note: n.note }),
    ...(n.negates && { negates: n.negates }),
    ...(n.targets?.length && {
      targets: n.targets.map((id) => {
        const placed = state?.cards[id];
        return { instanceId: id, card: placed ? ctx.cards.get(placed.cardId)?.name : undefined };
      }),
    }),
    warnings: state ? warningsOf(state, n.id) : [],
  };
}

/** Line durch einen Schritt, wie die Line-Liste sie zeigt, mit Branches */
export function lineView(ctx: ComboContext, stepId: string | null) {
  const line = lineThrough(ctx.combo.nodes, stepId);
  const label = (n: ComboNodeData) =>
    stepLabel(n, ctx.cards, 'en', ctx.states.get(n.id), (k) => KIND_LABEL[k]);
  return {
    leafId: line.at(-1)?.id ?? null,
    steps: lineSteps(ctx.combo.nodes, line, label).map((s) => ({
      ...stepView(ctx, s.node, s.number),
      chainDepth: s.chainDepth,
      branches: s.branches,
    })),
  };
}

export function linesOverview(ctx: ComboContext) {
  return lineEnds(ctx.combo.nodes).map(({ leaf, branches }) => ({
    leafId: leaf.id,
    main: branches.length === 0,
    branches: branches.map((b) => b.edgeLabel || stepView(ctx, b).label),
  }));
}

// ---------------------------------------------------------------- Fragen

/** Noch offene Fragen eines Aktivierungsschritts (bereits beantwortete fallen weg) */
export function openPrompts(ctx: ComboContext, stepId: string): PromptSpec[] {
  const step = node(ctx, stepId);
  const before = stateAt(ctx, step.parentId);
  return promptsFor(step, before, ctx.cards).filter((p) => {
    switch (p.kind) {
      case 'discard':
        return !(step[p.key] ?? []).some(
          (m) => m.from === 'HAND' && m.to === 'GY' && m.instanceId !== p.exclude
        );
      case 'result':
        return !(step.resolveMoves ?? []).some(
          (m) => m.to === p.spec.to && p.spec.from.includes(m.from)
        );
      case 'fusion':
        return !(step.resolveMoves ?? []).some((m) => m.from === 'EXTRA' && m.to === 'MONSTER');
      case 'target':
        return !step.targets?.length;
    }
  });
}

const QUESTION: Record<string, string> = {
  discard: 'Which card do you discard?',
  search: 'What did you search?',
  summon: 'What did you summon?',
  send: 'What did you send?',
  banish: 'What did you banish?',
  fusion: 'Which Fusion Monster, and which materials?',
  target: 'Which card do you target?',
};

export function promptView(ctx: ComboContext, p: PromptSpec, all = false) {
  const state = stateAt(ctx, p.stepId);
  const question =
    p.kind === 'discard' || p.kind === 'target' ? QUESTION[p.kind] : QUESTION[p.spec.verb];
  const base = {
    kind: p.kind,
    stepId: p.stepId,
    question,
    candidates: promptCandidates(p, state, ctx.cards, { all }).map((c) => cardView(ctx, c)),
  };
  if (p.kind === 'discard') return { ...base, count: 1 };
  if (p.kind === 'target') return { ...base, count: p.spec.count, filter: p.spec };
  if (p.kind === 'result')
    return { ...base, count: p.spec.count, filter: { names: p.spec.names, kind: p.spec.kind } };
  return {
    ...base,
    count: 1,
    materials: {
      count: p.spec.materials?.count ?? 2,
      candidates: promptCandidates(p, state, ctx.cards, { fusionId: 'any' }).map((c) =>
        cardView(ctx, c)
      ),
    },
  };
}

// ---------------------------------------------------------------- Speichern

/** Veraltete Revision gleich ablehnen, bevor Regeln geprüft werden */
function expectRevision(ctx: ComboContext, revision?: number) {
  if (revision !== undefined && revision !== ctx.combo.revision)
    throw new ApiError('CONFLICT', 'Die Combo wurde inzwischen geändert', {
      revision: ctx.combo.revision,
    });
}

export async function persist(
  ctx: ComboContext,
  nodes: ComboNodeData[],
  expectedRevision?: number
): Promise<ComboContext> {
  const { combo } = ctx;
  const stored = await storeCombo(
    ctx.userId,
    combo.id,
    {
      title: combo.title,
      deckId: combo.deckId,
      tags: combo.tags,
      status: combo.status,
      startState: combo.startState,
      nodes,
    },
    expectedRevision
  );
  if (isStoreError(stored)) throw new ApiError(stored.code, stored.message);
  const next = withNodes(ctx, nodes);
  return { ...next, combo: { ...next.combo, revision: stored.revision } };
}

// ---------------------------------------------------------------- Schritte spielen

const intentSchema: z.ZodType<PlayIntent> = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('normalSummon'),
    instanceId: z.string(),
    slot: z.number().int().optional(),
  }),
  z.object({
    kind: z.literal('setMonster'),
    instanceId: z.string(),
    slot: z.number().int().optional(),
  }),
  z.object({
    kind: z.literal('specialSummon'),
    instanceId: z.string(),
    slot: z.number().int().optional(),
    position: z.enum(['ATK', 'DEF', 'SET']).optional(),
    materials: z.array(z.string()).max(6).optional(),
  }),
  z.object({
    kind: z.literal('activate'),
    instanceId: z.string(),
    effectIndex: z.number().int().min(0).max(20),
    slot: z.number().int().optional(),
    chain: z.boolean().optional(),
  }),
  z.object({
    kind: z.literal('setSpellTrap'),
    instanceId: z.string(),
    slot: z.number().int().optional(),
  }),
  z.object({
    kind: z.literal('move'),
    instanceId: z.string(),
    to: z.enum(['HAND', 'DECK', 'EXTRA', 'MONSTER', 'SPELL_TRAP', 'FIELD', 'GY', 'BANISHED']),
    slot: z.number().int().optional(),
    controller: z.enum(['self', 'opponent']).optional(),
  }),
  z.object({ kind: z.literal('changePosition'), instanceId: z.string() }),
  z.object({
    kind: z.literal('token'),
    cardId: z.string(),
    player: z.enum(['self', 'opponent']),
    slot: z.number().int().optional(),
    position: z.enum(['ATK', 'DEF', 'SET']).optional(),
  }),
  z.object({ kind: z.literal('resolve') }),
  z.object({ kind: z.literal('end') }),
]) as z.ZodType<PlayIntent>;

export const stepRequestSchema = z
  .object({
    after: z.string().nullable().optional(),
    command: z.string().trim().min(1).max(200).optional(),
    intent: intentSchema.optional(),
    /** Bei mehrdeutigem Befehl die gemeinte Karte */
    instanceId: z.string().optional(),
    /** Materialien für Extra-Deck-Beschwörungen, als instanceIds */
    materials: z.array(z.string()).max(6).optional(),
    /** Aktivierung an die offene Chain hängen statt sie vorher aufzulösen */
    chain: z.boolean().optional(),
    slot: z.number().int().min(0).max(6).optional(),
    /** Unterbrechung: Staple-Ziel (instanceId) */
    target: z.string().optional(),
    revision: z.number().int().optional(),
  })
  .refine((b) => b.command || b.intent, { message: 'command oder intent angeben' });

export type StepRequest = z.infer<typeof stepRequestSchema>;

/** Staple-Unterbrechung am Schritt, wie die Staple-Leiste sie anlegt (UX-Plan 6.8) */
async function interruption(
  ctx: ComboContext,
  query: string,
  at: ComboNodeData | null,
  target?: string
) {
  const list = ctx.staples.map((s) => ({
    id: s.staple.name,
    name: s.card.name,
    nameDe: s.card.nameDe,
  }));
  const [match] = matchCards(query, list, [], ctx.nicknames);
  const entry = match && ctx.staples.find((s) => s.staple.name === match.id);
  if (!entry)
    throw new ApiError('NOT_POSSIBLE', `Kein Staple passt zu „${query}“`, {
      staples: ctx.staples.map((s) => s.staple.name),
    });
  await ensureCards(ctx, [entry.card.id]);
  const nodes = ctx.combo.nodes;
  const line = lineThrough(nodes, at?.id ?? null);
  const hits = stressTest(
    line,
    ctx.states,
    ctx.start,
    ctx.cards,
    ctx.staples.map((s) => ({ staple: s.staple, cardId: s.card.id }))
  );
  const hit = hits.find((h) => h.staple === entry.staple.name && h.stepId === (at?.id ?? ''));
  const anchorId = hit?.anchorId ?? at?.id ?? null;
  const existing = existingBranch(nodes, anchorId, entry.card.id);
  if (existing) return { nodes, created: [] as ComboNodeData[], existing };
  const number = lineSteps(nodes, line, () => '').find((s) => s.node.id === at?.id)?.number;
  const label = number ? `${entry.staple.short} auf ${number}` : `${entry.staple.short} am Start`;
  const branch = {
    ...stressBranch(
      { anchorId, target: target ?? hit?.target ?? at?.instanceId ?? undefined },
      entry,
      nodes,
      ctx.states,
      ctx.start,
      label
    ),
    rank: nextRank(nodes, anchorId),
  };
  return { nodes: [...nodes, branch], created: [branch], existing: undefined };
}

/** Absicht aus einem Befehl wie „ns aluber“ oder „act ash 2“ */
function intentFromCommand(ctx: ComboContext, req: StepRequest, state: GameState) {
  const cmd = parseCommand(req.command!);
  if (!cmd)
    throw new ApiError('INVALID', `Unbekannter Befehl „${req.command}“`, {
      verbs: ['ns', 'set', 'ss', 'act', 'gy', 'ban', 'hand', 'deck', 'pos', 'o', 'res', 'end'],
    });
  if (cmd.verb === 'resolve')
    return { intent: { kind: 'resolve' } as PlayIntent, alternatives: [] };
  if (cmd.verb === 'end') return { intent: { kind: 'end' } as PlayIntent, alternatives: [] };
  if (!cmd.query) throw new ApiError('INVALID', 'Befehl ohne Karte, etwa „ns aluber“');
  let matches = commandMatches(cmd, state, ctx.cards, ctx.nicknames);
  if (req.instanceId) matches = matches.filter((m) => m.instanceId === req.instanceId);
  const [best, ...rest] = matches;
  if (!best) throw new ApiError('NOT_POSSIBLE', `Keine eigene Karte passt zu „${cmd.query}“`);
  const alternatives = rest.slice(0, 4).map((m) => ({
    instanceId: m.instanceId,
    name: m.card?.name,
    zone: m.zone,
  }));
  if (!best.action)
    throw new ApiError(
      'NOT_POSSIBLE',
      `${best.card?.name ?? cmd.query} kann „${cmd.verb}“ hier nicht`,
      {
        instanceId: best.instanceId,
        zone: best.zone,
        actions: actionsView(ctx, state, best.instanceId),
      }
    );
  if (best.action.extraSummon) {
    if (!req.materials?.length)
      throw new ApiError('NOT_POSSIBLE', 'Extra-Deck-Beschwörung braucht materials (instanceIds)', {
        needs: 'materials',
        candidates: Object.values(state.cards)
          .filter((c) => c.zone === 'MONSTER' && c.controller === 'self')
          .map((c) => cardView(ctx, c)),
      });
    return {
      intent: {
        kind: 'specialSummon',
        instanceId: best.instanceId,
        slot: req.slot ?? freeEmz(state),
        materials: req.materials,
      } as PlayIntent,
      alternatives,
    };
  }
  const intent = best.action.intent!;
  return {
    intent:
      req.slot !== undefined && 'instanceId' in intent
        ? ({ ...intent, slot: req.slot } as PlayIntent)
        : intent,
    alternatives,
  };
}

export async function playStep(ctx: ComboContext, req: StepRequest) {
  expectRevision(ctx, req.revision);
  const parent = resolveAfter(ctx, req.after);
  const state = stateAt(ctx, parent?.id ?? null);

  // Unterbrechung des Gegners: „o ash“ hängt den Staple als Branch an
  if (req.command && parseCommand(req.command)?.verb === 'staple') {
    const query = parseCommand(req.command)!.query;
    const result = await interruption(ctx, query, parent, req.target);
    if (result.existing)
      return { ctx, created: [], existing: result.existing, alternatives: [], prompts: [] };
    const next = await persist(ctx, result.nodes, req.revision);
    return { ctx: next, created: result.created, alternatives: [], prompts: [] as PromptSpec[] };
  }

  const { intent, alternatives } = req.intent
    ? { intent: req.intent, alternatives: [] }
    : intentFromCommand(ctx, req, state);
  if ('instanceId' in intent && !state.cards[intent.instanceId])
    throw new ApiError(
      'NOT_POSSIBLE',
      `Karte ${intent.instanceId} gibt es an diesem Schritt nicht`
    );
  if (intent.kind === 'resolve' && state.chain.length === 0)
    throw new ApiError('NOT_POSSIBLE', 'Keine offene Chain zum Auflösen');
  if (intent.kind === 'token') await ensureCards(ctx, [intent.cardId]);

  const withChain =
    intent.kind === 'activate' ? { ...intent, chain: req.chain ?? intent.chain } : intent;
  const created = buildStep(withChain, { nodes: ctx.combo.nodes, parent, state, cards: ctx.cards });
  const resolved = intent.kind === 'resolve' && resolveOf(ctx.combo.nodes, parent?.id ?? null);
  if (!created.length && resolved)
    return { ctx, created: [], existing: resolved, alternatives: [], prompts: [] };
  if (!created.length)
    throw new ApiError('NOT_POSSIBLE', 'Aus dieser Absicht entsteht kein Schritt');
  const next = await persist(ctx, [...ctx.combo.nodes, ...created], req.revision);
  const last = created.at(-1)!;
  return { ctx: next, created, alternatives, prompts: promptsFor(last, state, next.cards) };
}

/** Trigger, die der Schritt ausgelöst hat, als fertige Absichten */
export function triggerView(ctx: ComboContext, stepId: string) {
  const step = node(ctx, stepId);
  const before = stateAt(ctx, step.parentId);
  const after = stateAt(ctx, stepId);
  return triggerOffers(
    before,
    after,
    ctx.cards,
    (card, i) => isTriggerEffect(card, i, card.effects[i]),
    (id, i, card) =>
      isOptAvailable(
        after,
        { instanceId: id, effectIndex: i, player: after.cards[id].controller },
        card
      )
  ).map((t) => ({
    card: ctx.cards.get(t.cardId)?.name,
    instanceId: t.instanceId,
    effectIndex: t.effectIndex,
    text: ctx.cards.get(t.cardId)?.effects[t.effectIndex]?.text,
    intent: { kind: 'activate', instanceId: t.instanceId, effectIndex: t.effectIndex },
  }));
}

/** Antwort eines Schritts mit allem, was ein Agent für den nächsten Zug braucht */
export function stepResult(ctx: ComboContext, created: ComboNodeData[], prompts: PromptSpec[]) {
  const last = created.at(-1);
  const state = stateAt(ctx, last?.id ?? null);
  return {
    revision: ctx.combo.revision,
    stepId: last?.id ?? null,
    created: created.map((n) => stepView(ctx, n)),
    prompts: prompts.map((p) => promptView(ctx, p)),
    triggers: last ? triggerView(ctx, last.id) : [],
    state: stateView(ctx, state, last?.id ?? null),
  };
}

// ---------------------------------------------------------------- Antworten, Bearbeiten

export const answerSchema = z.object({
  kind: z.enum(['discard', 'result', 'fusion', 'target']).optional(),
  picks: z.array(z.string()).max(6),
  /** Bei der Fusion: das Fusionsmonster (instanceId im Extra Deck) */
  fusion: z.string().optional(),
  /** Auch Karten außerhalb des erkannten Filters erlauben („Alle Karten“) */
  all: z.boolean().optional(),
  revision: z.number().int().optional(),
});

export async function answerStep(
  ctx: ComboContext,
  stepId: string,
  req: z.infer<typeof answerSchema>
) {
  expectRevision(ctx, req.revision);
  const open = openPrompts(ctx, stepId);
  const prompt = req.kind ? open.find((p) => p.kind === req.kind) : open[0];
  if (!prompt)
    throw new ApiError('NOT_POSSIBLE', 'An diesem Schritt ist keine passende Frage offen');
  const state = stateAt(ctx, stepId);
  const allowed = new Set(
    promptCandidates(prompt, state, ctx.cards, {
      all: req.all,
      fusionId: prompt.kind === 'fusion' ? req.fusion : undefined,
    }).map((c) => c.instanceId)
  );
  if (prompt.kind === 'fusion') {
    const fusions = new Set(promptCandidates(prompt, state, ctx.cards).map((c) => c.instanceId));
    if (!req.fusion || !fusions.has(req.fusion))
      throw new ApiError(
        'INVALID',
        'fusion muss eines der Fusionsmonster aus den Kandidaten sein',
        {
          candidates: [...fusions],
        }
      );
  }
  const wrong = req.picks.filter((p) => !allowed.has(p));
  if (wrong.length)
    throw new ApiError('INVALID', 'Nicht wählbare Karten in picks', {
      wrong,
      allowed: [...allowed],
    });
  const max =
    prompt.kind === 'result' || prompt.kind === 'target'
      ? prompt.spec.count
      : prompt.kind === 'discard'
        ? 1
        : 6;
  if (req.picks.length === 0 || req.picks.length > max)
    throw new ApiError('INVALID', `picks braucht 1 bis ${max} Karten`);
  const nodes = answerPrompt(ctx.combo.nodes, prompt, req.picks, state, req.fusion);
  const next = await persist(ctx, nodes, req.revision);
  const leaf = lineThrough(next.combo.nodes, stepId).at(-1)?.id ?? stepId;
  return {
    revision: next.combo.revision,
    stepId,
    prompts: openPrompts(next, stepId).map((p) => promptView(next, p)),
    // Die Antwort wirkt meist erst beim Auflösen: Board am Ende der Line zeigen
    state: stateView(next, stateAt(next, leaf), leaf),
  };
}

export const patchStepSchema = z.object({
  note: z.string().max(1000).nullable().optional(),
  edgeLabel: z.string().max(100).nullable().optional(),
  /** Line durch diesen Schritt zur Hauptline machen */
  promote: z.boolean().optional(),
  revision: z.number().int().optional(),
});

export async function patchStep(
  ctx: ComboContext,
  stepId: string,
  req: z.infer<typeof patchStepSchema>
) {
  expectRevision(ctx, req.revision);
  node(ctx, stepId);
  let nodes = ctx.combo.nodes;
  const patch: Partial<ComboNodeData> = {};
  if (req.note !== undefined) patch.note = req.note;
  if (req.edgeLabel !== undefined) patch.edgeLabel = req.edgeLabel;
  if (Object.keys(patch).length) nodes = updateNode(nodes, stepId, patch);
  if (req.promote) {
    const leaf = lineThrough(nodes, stepId).at(-1);
    if (leaf) nodes = promoteLine(nodes, leaf.id);
  }
  const next = await persist(ctx, nodes, req.revision);
  return { revision: next.combo.revision, step: stepView(next, node(next, stepId)) };
}

export async function deleteStep(ctx: ComboContext, stepId: string, revision?: number) {
  expectRevision(ctx, revision);
  const step = node(ctx, stepId);
  const next = await persist(ctx, removeSubtree(ctx.combo.nodes, stepId), revision);
  return { revision: next.combo.revision, parentId: step.parentId };
}

// ---------------------------------------------------------------- Auswertung

export function stressView(ctx: ComboContext, stepId: string | null, pairs: boolean) {
  const line = lineThrough(ctx.combo.nodes, stepId);
  const numbers = new Map(
    lineSteps(ctx.combo.nodes, line, () => '').map((s) => [s.node.id, s.number])
  );
  const hits = stressTest(
    line,
    ctx.states,
    ctx.start,
    ctx.cards,
    ctx.staples.map((s) => ({ staple: s.staple, cardId: s.card.id })),
    { pairs }
  );
  const shortOf = (name: string) => ctx.staples.find((s) => s.staple.name === name)?.staple.short;
  return hits.map((h: Hit) => ({
    staple: h.staple,
    short: shortOf(h.staple),
    pattern: h.pattern,
    stepId: h.stepId,
    step: numbers.get(h.stepId),
    ...(h.phrase && { phrase: h.phrase.text }),
    ...(h.count !== undefined && { count: h.count }),
    /** So legt man den Branch an */
    branch: {
      after: h.stepId || 'start',
      command: `o ${shortOf(h.staple)?.toLowerCase() ?? h.staple}`,
      ...(h.target && { target: h.target }),
    },
  }));
}

export function endboardView(ctx: ComboContext, stepId: string | null) {
  const leaf = lineThrough(ctx.combo.nodes, stepId).at(-1) ?? null;
  const state = stateAt(ctx, leaf?.id ?? null);
  const summary = endboardSummary(state, ctx.start, ctx.cards, leaf?.interruptions);
  const entry = (e: (typeof summary.field)[number]) => ({
    ...cardView(ctx, e.placed),
    interruptions: e.count,
  });
  return {
    leafId: leaf?.id ?? null,
    interruptions: summary.interruptions,
    field: summary.field.map(entry),
    hand: summary.hand.map(entry),
    gyEffects: summary.gyEffects,
    normalSummonLeft: summary.normalSummonLeft,
    startHandUsed: summary.startHandUsed,
    lp: summary.lp,
    hoptUsed: usedOptNames(state, ctx.cards, 'en'),
    chainOpen: state.chain.length > 0,
  };
}

/** Übersicht einer Combo: Kopf, Hauptline, alle Line-Enden */
export function comboView(ctx: ComboContext) {
  const { combo } = ctx;
  return {
    id: combo.id,
    title: combo.title,
    deckId: combo.deckId,
    tags: combo.tags,
    status: combo.status,
    revision: combo.revision,
    startHand: Object.values(ctx.start.cards)
      .filter((c) => c.owner === 'self' && c.zone === 'HAND')
      .map((c) => cardView(ctx, c)),
    mainLine: lineView(ctx, null),
    lines: linesOverview(ctx),
    roots: childrenOf(combo.nodes, null).map((n) => n.id),
  };
}

/** Ein Schritt mit Pfad, offenen Fragen und Zustand danach */
export function stepDetail(ctx: ComboContext, stepId: string) {
  const n = node(ctx, stepId);
  return {
    ...stepView(ctx, n),
    path: pathTo(ctx.combo.nodes, stepId).map((p) => p.id),
    children: childrenOf(ctx.combo.nodes, stepId).map((c) => c.id),
    prompts: openPrompts(ctx, stepId).map((p) => promptView(ctx, p)),
    triggers: triggerView(ctx, stepId),
    state: stateView(ctx, stateAt(ctx, stepId), stepId),
  };
}

// ---------------------------------------------------------------- Anlegen

export async function userNicknames(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { settings: true } });
  return nicknameMap(parseSettings(user?.settings).nicknames);
}

/** Karte per Passcode, ID, exaktem Namen oder Spitzname; sonst der erste Teiltreffer */
export async function findCard(ref: string, nicknames: Record<string, string[]>) {
  const q = ref.trim();
  const exact = await prisma.card.findFirst({
    where: {
      OR: [
        { id: q },
        { passcode: q },
        { name: { equals: q, mode: 'insensitive' } },
        { nameDe: { equals: q, mode: 'insensitive' } },
        { name: { in: nicknames[q.toLowerCase()] ?? [] } },
      ],
    },
    select: CARD_SELECT,
  });
  if (exact) return exact;
  const rows = await prisma.card.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { nameDe: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: CARD_SELECT,
    take: 20,
  });
  return matchCards(q, rows, [], nicknames)[0] ?? null;
}

export const createRequestSchema = z.object({
  title: z.string().trim().max(100).optional(),
  deckId: z.string().optional(),
  /** Karten der Starthand aus dem Deck: Name, Spitzname, Kürzel oder Passcode */
  startHand: z.array(z.string().min(1)).max(10).optional(),
  /** Going Second: Karten auf dem Gegnerboard */
  opponent: z
    .array(
      z.object({
        card: z.string().min(1),
        zone: z.enum(['MONSTER', 'SPELL_TRAP', 'FIELD']).optional(),
      })
    )
    .max(11)
    .optional(),
});

export async function createFromRequest(userId: string, req: z.infer<typeof createRequestSchema>) {
  const nicknames = await userNicknames(userId);
  const hand: ComboCard[] = [];
  if (req.startHand?.length) {
    if (!req.deckId) throw new ApiError('INVALID', 'startHand braucht ein deckId');
    const deck = await loadDeckEntries(userId, req.deckId);
    if (!deck) throw new ApiError('NOT_FOUND', 'Deck nicht gefunden');
    const main = new Set(deck.entries.filter((e) => e.section === 'MAIN').map((e) => e.cardId));
    const pool = [
      ...new Map(deck.cards.filter((c) => main.has(c.id)).map((c) => [c.id, c])).values(),
    ];
    for (const ref of req.startHand) {
      const found = pool.find((c) => c.id === ref) ?? matchCards(ref, pool, [], nicknames)[0];
      if (!found)
        throw new ApiError('NOT_POSSIBLE', `„${ref}“ ist nicht im Main Deck`, {
          deck: pool.map((c) => c.name),
        });
      hand.push(found);
    }
  }
  const opponent = [];
  for (const o of req.opponent ?? []) {
    const card = await findCard(o.card, nicknames);
    if (!card) throw new ApiError('NOT_POSSIBLE', `Keine Karte passt zu „${o.card}“`);
    const zone =
      o.zone ??
      (card.type.includes('Monster') ? 'MONSTER' : card.race === 'Field' ? 'FIELD' : 'SPELL_TRAP');
    opponent.push({ cardId: card.id, zone });
  }
  const created = await createComboFor(userId, {
    title: req.title || suggestTitle(hand.map((c) => c.name)) || 'Neue Combo',
    deckId: req.deckId,
    startHand: hand.map((c) => c.id),
    opponent,
  });
  if (isStoreError(created)) throw new ApiError(created.code, created.message);
  return created;
}

export const patchComboSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  deckId: z.string().nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
  status: z.enum(COMBO_STATUSES).optional(),
  revision: z.number().int().optional(),
});

export async function patchCombo(ctx: ComboContext, req: z.infer<typeof patchComboSchema>) {
  expectRevision(ctx, req.revision);
  const { revision, ...patch } = req;
  const next = { ...ctx, combo: { ...ctx.combo, ...patch } };
  return persist(next, ctx.combo.nodes, revision);
}
