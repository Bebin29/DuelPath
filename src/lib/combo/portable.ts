import { z } from 'zod';
import { idSchema, playerSchema, positionSchema, zoneSchema } from '@/lib/validations/combo.schema';
import { COMBO_STATUSES, type ComboStatus } from '@/lib/combo/library';
import { sortByDepth } from '@/lib/combo/cards';
import { newId } from '@/lib/combo/tree';
import type { CardMove, ComboNodeData, Negation, StartState } from '@/lib/combo/state';

/**
 * Portables Combo-Format: eine Combo als JSON-Datei zum Sichern und Weitergeben (UX-Plan 7.2).
 *
 * `/api/v1/combos/:id` taugt dafür nicht, das ist eine Leseansicht für Agenten und lässt genau die
 * Felder weg, die die Kartenbewegungen tragen. Hier geht alles mit, was gespeichert wird.
 *
 * Karten stehen als Passcode mit dem Namen als Rückfallebene, weil `Card.id` ein lokaler cuid() ist
 * und zwischen zwei DuelPath-Installationen nichts bedeutet; YDK macht es genauso.
 * Knoten bekommen beim Export laufende Nummern (n1, n2, ...) und beim Import frische IDs.
 */

export const PORTABLE_FORMAT = 'duelpath.combo';
export const PORTABLE_VERSION = 1;

const cardRefSchema = z.object({
  /** YGOPRODeck-Passcode; null, wenn die Karte lokal keinen hatte */
  passcode: z.string().min(1).max(20).nullable(),
  name: z.string().min(1).max(200),
});
export type CardRef = z.infer<typeof cardRefSchema>;

const moveSchema = z.object({
  instanceId: idSchema,
  /** Nötig, wenn die Karte im Startzustand nicht vorkommt (z. B. aus dem Deck gesucht) */
  card: cardRefSchema.nullish(),
  owner: playerSchema.optional(),
  from: zoneSchema,
  to: zoneSchema,
  slot: z.number().int().min(0).max(6).optional(),
  position: positionSchema.optional(),
  controller: playerSchema.optional(),
  attachTo: idSchema.optional(),
  token: z.boolean().optional(),
});
export type PortableMove = z.infer<typeof moveSchema>;

const negationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ACTIVATION'), nodeId: idSchema }),
  z.object({ type: z.literal('EFFECT'), nodeId: idSchema }),
  z.object({ type: z.literal('SUMMON'), nodeId: idSchema }),
  z.object({ type: z.literal('CARD'), instanceId: idSchema }),
  z.object({ type: z.literal('NAME'), card: cardRefSchema }),
]);
export type PortableNegation = z.infer<typeof negationSchema>;

const nodeSchema = z.object({
  id: idSchema,
  parentId: idSchema.nullable(),
  rank: z.number().int().min(0).max(999).default(0),
  kind: z.enum(['ACTION', 'ACTIVATE', 'OPPONENT', 'RESOLVE', 'END']),
  player: playerSchema,
  /** Aktivierende bzw. handelnde Karte */
  card: cardRefSchema.nullish(),
  instanceId: idSchema.nullish(),
  effectIndex: z.number().int().min(0).max(20).nullish(),
  action: z.enum(['NORMAL_SUMMON', 'SPECIAL_SUMMON', 'SET', 'OTHER']).nullish(),
  costMoves: z.array(moveSchema).max(40).default([]),
  resolveMoves: z.array(moveSchema).max(40).default([]),
  negates: negationSchema.nullish(),
  targets: z.array(idSchema).max(6).nullish(),
  edgeLabel: z.string().max(100).nullish(),
  note: z.string().max(1000).nullish(),
  optOverride: z.boolean().nullish(),
  ignoredHits: z.array(z.string().max(100)).max(40).nullish(),
  interruptions: z.record(idSchema, z.number().int().min(0).max(9)).nullish(),
});
export type PortableNode = z.infer<typeof nodeSchema>;

const startStateSchema = z.object({
  cards: z
    .array(
      z.object({
        instanceId: idSchema,
        card: cardRefSchema,
        owner: playerSchema,
        controller: playerSchema.optional(),
        zone: zoneSchema,
        slot: z.number().int().min(0).max(6).optional(),
        position: positionSchema.optional(),
      })
    )
    .max(200),
});

export const portableComboSchema = z.object({
  format: z.literal(PORTABLE_FORMAT),
  version: z.literal(PORTABLE_VERSION),
  title: z.string().trim().min(1).max(100),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  status: z.enum(COMBO_STATUSES).default('DRAFT'),
  /** Nur zur Information; der Import hängt kein Deck an, Deck-IDs sind lokal */
  deck: z.object({ name: z.string().max(100) }).nullish(),
  startState: startStateSchema,
  nodes: z.array(nodeSchema).max(500),
});
export type PortableCombo = z.infer<typeof portableComboSchema>;

/** Format und Version zuerst lesen, damit eine fremde Version eine klare Meldung bekommt */
const envelopeSchema = z.object({ format: z.string(), version: z.number() });

export interface PortableSource {
  title: string;
  tags: string[];
  status: ComboStatus;
  startState: StartState;
  /** Name des zugeordneten Decks, reine Information */
  deckName?: string | null;
}

export function toPortable(
  combo: PortableSource,
  nodes: ComboNodeData[],
  cardById: (cardId: string) => { name: string; passcode: string | null } | undefined
): PortableCombo {
  const ordered = sortByDepth(nodes);
  const numbers = new Map(ordered.map((n, i) => [n.id, `n${i + 1}`]));
  const nodeId = (id: string) => numbers.get(id) ?? id;
  // Karte lokal unbekannt: wenigstens die ID als Name mitgeben, der Import meldet sie als fehlend
  const ref = (cardId: string): CardRef => {
    const card = cardById(cardId);
    return { passcode: card?.passcode ?? null, name: card?.name ?? cardId };
  };
  const move = ({ cardId, ...rest }: CardMove): PortableMove => ({
    ...rest,
    ...(cardId && { card: ref(cardId) }),
  });
  const negation = (n: Negation): PortableNegation =>
    n.type === 'NAME'
      ? { type: 'NAME', card: ref(n.cardId) }
      : n.type === 'CARD'
        ? n
        : { type: n.type, nodeId: nodeId(n.nodeId) };

  return {
    format: PORTABLE_FORMAT,
    version: PORTABLE_VERSION,
    title: combo.title,
    tags: combo.tags,
    status: combo.status,
    deck: combo.deckName ? { name: combo.deckName } : null,
    startState: {
      cards: combo.startState.cards.map((c) => ({
        instanceId: c.instanceId,
        card: ref(c.cardId),
        owner: c.owner,
        ...(c.controller && { controller: c.controller }),
        zone: c.zone,
        ...(c.slot !== undefined && { slot: c.slot }),
        ...(c.position && { position: c.position }),
      })),
    },
    nodes: ordered.map((n) => ({
      id: nodeId(n.id),
      parentId: n.parentId ? nodeId(n.parentId) : null,
      rank: n.rank ?? 0,
      kind: n.kind,
      player: n.player,
      card: n.cardId ? ref(n.cardId) : null,
      instanceId: n.instanceId ?? null,
      effectIndex: n.effectIndex ?? null,
      action: n.action ?? null,
      costMoves: (n.costMoves ?? []).map(move),
      resolveMoves: (n.resolveMoves ?? []).map(move),
      negates: n.negates ? negation(n.negates) : null,
      targets: n.targets ?? null,
      edgeLabel: n.edgeLabel ?? null,
      note: n.note ?? null,
      optOverride: n.optOverride ?? null,
      ignoredHits: n.ignoredHits ?? null,
      interruptions: n.interruptions ?? null,
    })),
  };
}

/** Warum eine Datei abgelehnt wurde; die Oberfläche übersetzt den Code (combo.file.error.*) */
export type PortableError =
  { code: 'format' } | { code: 'version'; version: number } | { code: 'invalid'; detail: string };

export interface PortableImport {
  title: string;
  tags: string[];
  status: ComboStatus;
  startState: StartState;
  nodes: ComboNodeData[];
}

export type FromPortable =
  | { data: PortableImport; missing: CardRef[]; error?: undefined }
  | { data?: undefined; missing?: undefined; error: PortableError };

/**
 * Liest eine Datei in Combo-Daten. Eine fremde Version wird abgelehnt statt geraten.
 * Karten, die der lokale Bestand nicht kennt, fallen heraus und stehen in `missing`;
 * der Rest der Combo wird importiert, so wie es der YDK-Import beim Deck auch macht.
 *
 * `resolve` sucht die lokale Card.id zu einer Referenz, erst über den Passcode, dann über den Namen.
 */
export function fromPortable(
  json: unknown,
  resolve: (ref: CardRef) => string | null | undefined
): FromPortable {
  const envelope = envelopeSchema.safeParse(json);
  if (!envelope.success || envelope.data.format !== PORTABLE_FORMAT) {
    return { error: { code: 'format' } };
  }
  if (envelope.data.version !== PORTABLE_VERSION) {
    return { error: { code: 'version', version: envelope.data.version } };
  }
  const parsed = portableComboSchema.safeParse(json);
  if (!parsed.success) {
    return {
      error: { code: 'invalid', detail: parsed.error.issues[0]?.message ?? 'Ungültige Datei' },
    };
  }
  const file = parsed.data;

  const invalid = treeProblem(file.nodes);
  if (invalid) return { error: { code: 'invalid', detail: invalid } };

  const missing = new Map<string, CardRef>();
  const cardId = (ref: CardRef): string | null => {
    const id = resolve(ref);
    if (id) return id;
    missing.set(`${ref.passcode ?? ''}|${ref.name}`, ref);
    return null;
  };
  const fresh = new Map(file.nodes.map((n) => [n.id, newId()]));
  const move = ({ card, ...rest }: PortableMove): CardMove => {
    const id = card ? cardId(card) : null;
    return { ...rest, ...(id && { cardId: id }) };
  };
  const negation = (n: PortableNegation): Negation | null => {
    if (n.type === 'NAME') {
      const id = cardId(n.card);
      return id ? { type: 'NAME', cardId: id } : null;
    }
    if (n.type === 'CARD') return n;
    return { type: n.type, nodeId: fresh.get(n.nodeId)! };
  };

  const startState: StartState = {
    cards: file.startState.cards.flatMap((c) => {
      const id = cardId(c.card);
      if (!id) return [];
      return [
        {
          instanceId: c.instanceId,
          cardId: id,
          owner: c.owner,
          ...(c.controller && { controller: c.controller }),
          zone: c.zone,
          ...(c.slot !== undefined && { slot: c.slot }),
          ...(c.position && { position: c.position }),
        },
      ];
    }),
  };
  const nodes: ComboNodeData[] = file.nodes.map((n) => ({
    id: fresh.get(n.id)!,
    parentId: n.parentId ? fresh.get(n.parentId)! : null,
    rank: n.rank,
    kind: n.kind,
    player: n.player,
    cardId: n.card ? cardId(n.card) : null,
    instanceId: n.instanceId ?? null,
    effectIndex: n.effectIndex ?? null,
    action: n.action ?? null,
    costMoves: n.costMoves.map(move),
    resolveMoves: n.resolveMoves.map(move),
    negates: n.negates ? negation(n.negates) : null,
    targets: n.targets ?? null,
    edgeLabel: n.edgeLabel ?? null,
    note: n.note ?? null,
    optOverride: n.optOverride ?? null,
    ignoredHits: n.ignoredHits ?? null,
    interruptions: n.interruptions ?? null,
  }));

  return {
    data: { title: file.title, tags: file.tags, status: file.status, startState, nodes },
    missing: [...missing.values()],
  };
}

/**
 * Alle Kartenreferenzen einer Datei, damit der Aufrufer sie in einer Abfrage nachschlagen kann;
 * `fromPortable` bekommt die Zuordnung dann fertig. Bei kaputter Datei leer, der Import meldet sie.
 */
export function cardRefsOf(json: unknown): CardRef[] {
  const parsed = portableComboSchema.safeParse(json);
  if (!parsed.success) return [];
  const refs = parsed.data.startState.cards.map((c) => c.card);
  for (const n of parsed.data.nodes) {
    if (n.card) refs.push(n.card);
    for (const m of [...n.costMoves, ...n.resolveMoves]) if (m.card) refs.push(m.card);
    if (n.negates?.type === 'NAME') refs.push(n.negates.card);
  }
  return refs;
}

/** Prüft den Baum vor dem Import; fehlende Karten sind kein Grund abzulehnen, ein kaputter Baum schon */
function treeProblem(nodes: PortableNode[]): string | null {
  const ids = new Set(nodes.map((n) => n.id));
  if (ids.size !== nodes.length) return 'Doppelte Knoten-IDs';
  if (nodes.some((n) => n.parentId && !ids.has(n.parentId))) {
    return 'Knoten verweist auf unbekannten Elternknoten';
  }
  const negated = nodes.flatMap((n) =>
    n.negates && 'nodeId' in n.negates ? [n.negates.nodeId] : []
  );
  if (negated.some((id) => !ids.has(id))) return 'Negation verweist auf unbekannten Knoten';

  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const node of nodes) {
    const seen = new Set<string>();
    for (
      let n: PortableNode | undefined = node;
      n;
      n = n.parentId ? byId.get(n.parentId) : undefined
    ) {
      if (seen.has(n.id)) return 'Zyklus im Combo-Baum';
      seen.add(n.id);
    }
  }
  return null;
}
