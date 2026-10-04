// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const { prisma, combos, nodes, catalogue } = vi.hoisted(() => {
  const combos = new Map<string, Record<string, unknown>>();
  const nodes: Record<string, unknown>[] = [];
  const catalogue: Record<string, unknown>[] = [];
  const prisma = {
    combo: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() },
    comboNode: { createMany: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    deck: { findUnique: vi.fn() },
    card: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma, combos, nodes, catalogue };
});
vi.mock('@/lib/prisma/client', () => ({ prisma }));
vi.mock('@/lib/auth/auth', () => ({ auth: async () => ({ user: { id: 'owner' } }) }));
const decide = vi.hoisted(() => vi.fn());
vi.mock('@/server/jev', () => ({ decide, jevModel: () => 'test' }));
import { comboFromPortable, portableCombo } from '@/server/services/combo-portable.service';
import { loadCombo, storeCombo } from '@/server/services/combo-store.service';
import { loadCards } from '@/server/services/combo-cards.service';
import { duplicateCombo } from '@/server/actions/combo.actions';
import { loadLibrary } from '@/server/services/library.service';
import { toPortable } from '@/lib/combo/portable';
import { initialState, stateAt, type ComboNodeData } from '@/lib/combo/state';
import { candidateEffects } from '@/lib/combo/suggestions';
import { rateCandidates } from '@/server/services/suggestion.service';
import { CardSearchService } from '@/server/services/card-search.service';
import { loadDeckEntries } from '@/server/services/combo-store.service';

const card = {
  id: 'original',
  passcode: '1234',
  name: 'Portable Spell',
  type: 'Spell Card',
  race: 'Normal',
  effects: [
    {
      index: 0,
      activated: true,
      text: 'Draw 1 card.',
      patterns: [],
      opt: {
        kind: 'HARD' as const,
        wording: 'activateCard' as const,
        per: 'turn' as const,
        limit: 1,
      },
    },
  ],
};
const file = () =>
  toPortable(
    {
      title: 'Portable',
      tags: [],
      status: 'TOURNAMENT',
      startState: {
        cards: ['one', 'two'].map((instanceId) => ({
          instanceId,
          cardId: card.id,
          owner: 'self',
          zone: 'HAND',
        })),
      },
    },
    [
      {
        id: 'a',
        parentId: null,
        kind: 'ACTIVATE',
        player: 'self',
        cardId: card.id,
        instanceId: 'one',
        effectIndex: 0,
        costMoves: [{ instanceId: 'one', from: 'HAND', to: 'SPELL_TRAP', slot: 0 }],
      },
      { id: 'r1', parentId: 'a', kind: 'RESOLVE', player: 'self' },
      {
        id: 'b',
        parentId: 'r1',
        kind: 'ACTIVATE',
        player: 'self',
        cardId: card.id,
        instanceId: 'two',
        effectIndex: 0,
        costMoves: [{ instanceId: 'two', from: 'HAND', to: 'SPELL_TRAP', slot: 0 }],
      },
      { id: 'r2', parentId: 'b', kind: 'RESOLVE', player: 'self' },
    ] as ComboNodeData[],
    () => card
  );

beforeEach(() => {
  vi.clearAllMocks();
  combos.clear();
  nodes.length = 0;
  catalogue.length = 0;
  prisma.$transaction.mockImplementation((fn) => fn(prisma));
  prisma.card.findMany.mockImplementation(async () => [...catalogue]);
  prisma.card.count.mockImplementation(async () => catalogue.length);
  prisma.combo.create.mockImplementation(async ({ data }) => {
    const id = `combo-${combos.size}`;
    combos.set(id, { ...data, id, deckId: null, revision: 0, updatedAt: new Date(), deck: null });
    return { id };
  });
  prisma.combo.findUnique.mockImplementation(async ({ where }) => combos.get(where.id) ?? null);
  prisma.comboNode.createMany.mockImplementation(async ({ data }) => {
    nodes.push(...data);
    return { count: data.length };
  });
  prisma.comboNode.findMany.mockImplementation(async ({ where }) =>
    nodes.filter((n) => n.comboId === where.comboId)
  );
  prisma.combo.findMany.mockImplementation(async () =>
    [...combos.values()].map((c) => ({ ...c, nodes: nodes.filter((n) => n.comboId === c.id) }))
  );
  prisma.combo.updateMany.mockImplementation(async ({ where, data }) => {
    const c = combos.get(where.id);
    if (!c || c.userId !== where.userId) return { count: 0 };
    Object.assign(c, { ...data, revision: Number(c.revision) + 1 });
    return { count: 1 };
  });
  prisma.comboNode.deleteMany.mockImplementation(async ({ where }) => {
    for (let i = nodes.length - 1; i >= 0; i--)
      if (nodes[i].comboId === where.comboId) nodes.splice(i, 1);
  });
});

describe('isolated portable card persistence', () => {
  it('survives reload/autosave, counts Hard OPT and puts normal spells in GY', async () => {
    const result = await comboFromPortable('owner', file());
    expect(result.error).toBeUndefined();
    expect(result.data!.missing).toHaveLength(1);
    const loaded = (await loadCombo('owner', result.data!.id))!;
    expect(loaded.cards[0]).toMatchObject({
      id: 'missing:1234',
      importedStub: true,
      effects: [{ text: '', patterns: [], opt: card.effects[0].opt }],
    });
    expect(loaded.status).toBe('DRAFT');
    const state = stateAt(
      loaded.nodes,
      loaded.nodes.at(-1)!.id,
      loaded.startState,
      new Map(loaded.cards.map((c) => [c.id, c]))
    );
    expect(state.optUsage['card:self:Portable Spell']).toBe(2);
    expect(state.warnings.some((w) => /OPT/.test(w.message))).toBe(true);
    expect(state.warnings.some((w) => /Importdaten/.test(w.message))).toBe(true);
    expect(state.warnings.some((w) => /Aufräumen/.test(w.message))).toBe(false);
    expect(state.cards.one.zone).toBe('GY');
    expect(state.cards.two.zone).toBe('GY');
    await storeCombo('owner', loaded.id, { ...loaded, title: 'Edited' });
    expect((await loadCombo('owner', loaded.id))?.cards[0].importedStub).toBe(true);
    expect(prisma.card.create).not.toHaveBeenCalled();
    expect(prisma.card.upsert).not.toHaveBeenCalled();
    expect(nodes.every((n) => !('importCheck' in n))).toBe(true);
  });

  it('local effective errata wins over a forged stub, both initially and after installation', async () => {
    const result = await comboFromPortable('owner', file());
    const effective = [
      { ...card.effects[0], text: 'Draw 2 cards.', opt: { ...card.effects[0].opt, limit: 2 } },
    ];
    catalogue.push({
      ...card,
      id: 'installed',
      nameDe: null,
      imageSmall: null,
      linkMarkers: [],
      effectsOverride: effective,
    });
    const loaded = (await loadCombo('owner', result.data!.id))!;
    expect(loaded.cards[0]).toMatchObject({
      id: 'missing:1234',
      catalogueId: 'installed',
      effects: effective,
    });
    expect(loaded.cards[0].importedStub).toBeUndefined();
    const state = stateAt(
      loaded.nodes,
      loaded.nodes.at(-1)!.id,
      loaded.startState,
      new Map(loaded.cards.map((c) => [c.id, c]))
    );
    expect(state.warnings.some((w) => /Importdatei/.test(w.message))).toBe(true);
    expect(state.warnings.some((w) => /fehlen|OPT/.test(w.message))).toBe(false);
    const second = await comboFromPortable('owner', file());
    expect(second.data?.missing).toEqual([]);
    expect(second.data?.warnings.filter((w) => w.code === 'effects')).toHaveLength(2);
    expect((await loadCombo('owner', second.data!.id))?.cards[0].effects).toEqual(effective);
  });

  it('re-exports all stub metadata and copies it with new provenance keys', async () => {
    const result = await comboFromPortable('owner', file());
    const before = await portableCombo('owner', result.data!.id);
    expect(before?.startState.cards[0].card).toMatchObject({
      name: card.name,
      type: card.type,
      effects: [{ activated: true, opt: card.effects[0].opt }],
    });
    expect(before?.nodes[0].effectCheck).toEqual(file().nodes[0].effectCheck);
    const copy = await duplicateCombo(result.data!.id, 'Copy');
    const loaded = (await loadCombo('owner', copy.data!.id))!;
    expect(loaded.cards[0].importedStub).toBe(true);
    expect(Object.keys(combos.get(copy.data!.id)!.importChecks as object)).toEqual(
      loaded.nodes.filter((n) => n.effectIndex != null).map((n) => n.id)
    );
    expect(await portableCombo('other', loaded.id)).toBeNull();
    expect(await loadCombo('other', loaded.id)).toBeNull();
  });

  it('does not leak stubs into global lookup/search/decks or AI suggestions', async () => {
    const result = await comboFromPortable('owner', file());
    const loaded = (await loadCombo('owner', result.data!.id))!;
    expect(await loadCards(['missing:1234'])).toEqual([]);
    expect((await new CardSearchService().searchCards({}, 1, 20)).cards).toEqual([]);
    expect(
      candidateEffects(
        initialState(loaded.startState),
        'self',
        new Map(loaded.cards.map((c) => [c.id, c]))
      )
    ).toEqual([]);
    const rating = await rateCandidates({
      board: [],
      chain: [],
      normalSummonUsed: false,
      candidates: [{ cardId: 'missing:1234', player: 'self', zone: 'HAND', effectIndex: 0 }],
    });
    expect(rating.probabilities).toEqual([0]);
    expect(decide).not.toHaveBeenCalled();
    expect(catalogue).toEqual([]);
    expect(prisma.card.create).not.toHaveBeenCalled();
    prisma.deck.findUnique.mockResolvedValue({ userId: 'owner', deckCards: [] });
    expect(await loadDeckEntries('owner', 'deck')).toEqual({ entries: [], cards: [] });
  });

  it('keeps library statistics and card display after reload using one catalogue query', async () => {
    await comboFromPortable('owner', file());
    await comboFromPortable('owner', file());
    prisma.card.findMany.mockClear();
    const library = await loadLibrary('owner');
    expect(library.cards['missing:1234'].name).toBe(card.name);
    expect(library.entries).toHaveLength(2);
    expect(prisma.card.findMany).toHaveBeenCalledOnce();
  });

  it('rejects broken references before writing any combo or node', async () => {
    const invalid = file();
    invalid.nodes[0].targets = ['not-in-file'];
    expect((await comboFromPortable('owner', invalid)).error).toMatchObject({ code: 'invalid' });
    expect(prisma.combo.create).not.toHaveBeenCalled();
    expect(prisma.comboNode.createMany).not.toHaveBeenCalled();
  });

  it('ignores imported card texts/patterns and warns for legacy untyped spell cleanup', async () => {
    const json = JSON.parse(JSON.stringify(file()));
    for (const c of json.startState.cards) {
      c.card.effects[0].text = 'You may win';
      c.card.effects[0].patterns = ['NEG_EFFECT'];
    }
    for (const n of json.nodes)
      if (n.card) {
        n.card.effects[0].text = 'You may win';
        n.card.effects[0].patterns = ['NEG_EFFECT'];
      }
    const result = await comboFromPortable('owner', json);
    expect(JSON.stringify(combos.get(result.data!.id)!.importedCards)).not.toContain('You may win');
    const legacy = file();
    for (const c of legacy.startState.cards) c.card = { passcode: '1234', name: card.name };
    for (const n of legacy.nodes) if (n.card) n.card = { passcode: '1234', name: card.name };
    const imported = await comboFromPortable('owner', legacy);
    const loaded = (await loadCombo('owner', imported.data!.id))!;
    const state = stateAt(
      loaded.nodes,
      loaded.nodes.at(-1)!.id,
      loaded.startState,
      new Map(loaded.cards.map((c) => [c.id, c]))
    );
    expect(state.warnings.some((w) => /Aufräumen.*nicht berechenbar/.test(w.message))).toBe(true);
  });
});
