import {
  onField,
  pathTo,
  type CardData,
  type ComboNodeData,
  type GameState,
  type PlacedCard,
  type Zone,
} from '@/lib/combo/state';
import { isMonster, isSpell, isTrap, resultMoves } from '@/lib/combo/play';
import { resolutionPart, resultSpec } from '@/lib/combo/effect-results';
import { reactionNode, type HitPattern, type Staple } from '@/lib/combo/reactions';

/**
 * Stresstest (UX-Plan 6.8): Welche Staples treffen welchen Schritt einer Line?
 * Zuerst deterministisch aus Kartentext und Zustand; unsichere Fälle bleiben für Jev.
 * Standardtiefe ist eine Unterbrechung: Eine Line, in der der Gegner schon reagiert, wird nicht geprüft.
 */

export interface StapleEntry {
  staple: Staple;
  /** Passcode der Staple-Karte, für gesetzte Karten auf dem Gegnerboard */
  cardId: string;
}

export interface Hit {
  staple: string;
  pattern: HitPattern;
  /** Sichtbarer Schritt, an dem der Chip steht */
  stepId: string;
  /** Knoten, unter dem der Branch entsteht; null = neue Line ab der Starthand */
  anchorId: string | null;
  /** Karte, die der Staple trifft (Ziel von Imperm, Crow, Zerstörung) */
  target?: string;
  /** Satzteil im Kartentext, auf den der Staple reagiert (UI-Plan 7.2.5) */
  phrase?: { cardId: string; effectIndex: number; text: string };
  /** Zahl zur Begründung, etwa Karten, die der Gegner durch Mulcharmy zieht */
  count?: number;
}

/** Suchen, Beschwören oder Senden aus dem Main Deck; „Extra Deck“ zählt nicht (Ash) */
const FROM_DECK = [
  /add [^.;]*?from your (?:Deck|Deck or GY|GY or Deck)\b[^.;]*?to your hand/i,
  /take [^.;]*?from your Deck\b/i,
  /Special Summon [^.;]*?from your (?:hand or |hand, )?Deck\b/i,
  /send [^.;]*?from your (?:hand or )?Deck to the GY/i,
  /using [^.;]*?(?<!Extra )\bDeck\b[^.;]*?as (?:Fusion )?Materials?/i,
];

/** Karten verlassen den Friedhof (Ghost Belle) */
const FROM_GY = [
  /add [^.;]*?from your (?:GY|Graveyard|Deck or GY|GY or Deck)\b[^.;]*?to your hand/i,
  /Special Summon [^.;]*?from (?:your|either player's) (?:hand or )?(?:GY|Graveyard)/i,
  /banish(?:ing)? [^.;]*?from (?:your|either player's|your opponent's) [^.;]*?\b(?:GY|Graveyard)\b/i,
  /(?:shuffle|return) [^.;]*?from your (?:GY|Graveyard) into the (?:Extra )?Deck/i,
  /using [^.;]*?\bGY\b[^.;]*?as (?:Fusion )?Materials?/i,
];
/** Ziel im Friedhof, das die Wirkung zurückholt: „Target 1 … in your GY; add it to your hand“ */
const TARGET_IN_GY =
  /Target [^.;]*?in (?:your|either player's) (?:GY|Graveyard)[^.;]*?;\s*(?:add it|Special Summon it|shuffle it)/i;

const VISIBLE = (n: ComboNodeData) => n.kind !== 'RESOLVE' && n.kind !== 'OPPONENT';

interface Activation {
  instanceId: string;
  cardId: string;
  card: CardData;
  effectIndex: number;
  text: string;
  before?: PlacedCard;
}

function activationOf(node: ComboNodeData, before: GameState, cards: Map<string, CardData>) {
  if (node.kind !== 'ACTIVATE' || node.player !== 'self' || !node.instanceId || !node.cardId)
    return null;
  const card = cards.get(node.cardId);
  if (!card) return null;
  const effectIndex = node.effectIndex ?? 0;
  return {
    instanceId: node.instanceId,
    cardId: node.cardId,
    card,
    effectIndex,
    text: card.effects[effectIndex]?.text ?? '',
    before: before.cards[node.instanceId],
  } satisfies Activation;
}

function phraseIn(text: string, patterns: RegExp[]): string | null {
  const part = resolutionPart(text);
  for (const re of patterns) {
    const m = re.exec(part);
    if (m) return m[0];
  }
  return null;
}

/** Monster, die der Schritt auf die eigene Seite beschworen hat, mit Herkunft */
function summonsOf(before: GameState, after: GameState): { instanceId: string; from: Zone }[] {
  return Object.values(after.cards)
    .filter((c) => c.zone === 'MONSTER' && c.controller === 'self')
    .flatMap((c) => {
      const prev = before.cards[c.instanceId];
      const from = prev?.zone ?? 'DECK';
      return from === 'MONSTER' ? [] : [{ instanceId: c.instanceId, from }];
    });
}

const faceUp = (c: PlacedCard | undefined) => !!c && c.position !== 'SET';

/** Züge des Gegners, bei denen der Staple überhaupt verfügbar ist */
function available(entry: StapleEntry, state: GameState): boolean {
  if (!entry.staple.needsSet) return true;
  return Object.values(state.cards).some(
    (c) =>
      c.cardId === entry.cardId &&
      c.controller === 'opponent' &&
      c.zone === 'SPELL_TRAP' &&
      c.position === 'SET'
  );
}

export function stressTest(
  line: ComboNodeData[],
  states: Map<string, GameState>,
  start: GameState,
  cards: Map<string, CardData>,
  staples: StapleEntry[],
  /**
   * Paare (UX-Plan 6.8, nur auf Knopfdruck): In einer Line mit genau einer Unterbrechung zählen
   * die Treffer danach, etwa „Ash auf 2, dann Imperm auf 5“. Derselbe Staple zählt nicht zweimal.
   */
  options: { pairs?: boolean } = {}
): Hit[] {
  const interruptions = line
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => n.kind === 'ACTIVATE' && n.player === 'opponent');
  if (interruptions.length > (options.pairs ? 1 : 0)) return [];
  if (options.pairs && interruptions.length === 1) {
    const [{ n: first, i: at }] = interruptions;
    const after = new Set(line.slice(at + 1).map((n) => n.id));
    return stressTest(
      line.filter((n) => n.id !== first.id),
      states,
      start,
      cards,
      staples.filter((s) => s.cardId !== first.cardId)
    ).filter(
      (h) =>
        after.has(h.stepId) &&
        h.pattern !== 'TURN_START_DECK_SUMMONS' &&
        h.pattern !== 'TURN_START_HAND_SUMMONS'
    );
  }
  const before = (i: number) => (i === 0 ? start : (states.get(line[i - 1].id) ?? start));
  const after = (i: number) => states.get(line[i].id) ?? before(i);
  const visibleAt = (i: number): string | null => {
    for (let k = i; k >= 0; k--) if (VISIBLE(line[k])) return line[k].id;
    return null;
  };

  const hits: Hit[] = [];
  const seen = new Set<string>();
  const add = (hit: Hit) => {
    const key = `${hit.staple}:${hit.stepId}`;
    const node = line.find((n) => n.id === hit.stepId);
    if (seen.has(key) || node?.ignoredHits?.includes(hit.staple)) return;
    seen.add(key);
    hits.push(hit);
  };

  const summons = line.map((_, i) => summonsOf(before(i), after(i)));
  const firstVisible = line.find(VISIBLE)?.id;

  for (const entry of staples) {
    const { staple } = entry;
    for (const pattern of staple.hits ?? []) {
      // Muster über die ganze Line
      if (pattern === 'TURN_START_DECK_SUMMONS' || pattern === 'TURN_START_HAND_SUMMONS') {
        const zones: Zone[] = pattern === 'TURN_START_DECK_SUMMONS' ? ['DECK', 'EXTRA'] : ['HAND'];
        const count = summons.flat().filter((s) => zones.includes(s.from)).length;
        if (count > 0 && firstVisible)
          add({ staple: staple.name, pattern, stepId: firstVisible, anchorId: null, count });
        continue;
      }
      if (pattern === 'FIFTH_SUMMON') {
        let total = 0;
        for (let i = 0; i < line.length; i++) {
          total += summons[i].length;
          const stepId = visibleAt(i);
          if (total >= 5 && stepId) {
            add({ staple: staple.name, pattern, stepId, anchorId: line[i].id, count: total });
            break;
          }
        }
        continue;
      }
      if (pattern === 'ADD_FROM_DECK') {
        for (let i = 0; i < line.length; i++) {
          const b = before(i);
          const moved = Object.values(after(i).cards).find(
            (c) => c.zone === 'HAND' && c.owner === 'self' && b.cards[c.instanceId]?.zone === 'DECK'
          );
          const stepId = visibleAt(i);
          if (moved && stepId) {
            add({
              staple: staple.name,
              pattern,
              stepId,
              anchorId: line[i].id,
              target: moved.instanceId,
            });
            break;
          }
        }
        continue;
      }
      if (pattern === 'GY_NEEDED_LATER') {
        const done = new Set<string>();
        for (let i = 1; i < line.length; i++) {
          const b = before(i);
          const act = activationOf(line[i], b, cards);
          const fromGy = [
            ...(act?.before?.zone === 'GY' ? [act.instanceId] : []),
            ...(line[i].costMoves ?? []).filter((m) => m.from === 'GY').map((m) => m.instanceId),
            ...(line[i].kind === 'ACTION' ? (line[i].resolveMoves ?? []) : [])
              .filter((m) => m.from === 'GY')
              .map((m) => m.instanceId),
          ].filter((id) => b.cards[id]?.zone === 'GY' && b.cards[id]?.owner === 'self');
          for (const target of fromGy) {
            if (done.has(target)) continue;
            done.add(target);
            const stepId = visibleAt(i - 1);
            if (stepId)
              add({ staple: staple.name, pattern, stepId, anchorId: line[i - 1].id, target });
          }
        }
        continue;
      }

      // Muster am einzelnen Schritt
      for (let i = 0; i < line.length; i++) {
        const node = line[i];
        if (node.player !== 'self' || !VISIBLE(node)) continue;
        const b = before(i);
        if (!available(entry, b)) continue;
        const act = activationOf(node, b, cards);
        const base = { staple: staple.name, pattern, stepId: node.id, anchorId: node.id };
        const phrase = (text: string | null) =>
          act && text ? { cardId: act.cardId, effectIndex: act.effectIndex, text } : undefined;

        switch (pattern) {
          case 'FROM_DECK': {
            const text = act && phraseIn(act.text, FROM_DECK);
            if (act && text) add({ ...base, target: act.instanceId, phrase: phrase(text) });
            break;
          }
          case 'FROM_GY': {
            if (!act) break;
            let text = phraseIn(act.text, FROM_GY) ?? TARGET_IN_GY.exec(act.text)?.[0] ?? null;
            if (!text && act.before?.zone === 'GY')
              text = /Special Summon this card/i.exec(resolutionPart(act.text))?.[0] ?? null;
            if (text) add({ ...base, target: act.instanceId, phrase: phrase(text) });
            break;
          }
          case 'FIELD_MONSTER_EFFECT':
            if (act && isMonster(act.card) && act.before?.zone === 'MONSTER' && faceUp(act.before))
              add({ ...base, target: act.instanceId });
            break;
          case 'FIELD_EFFECT':
            if (act && act.before && onField(act.before.zone) && faceUp(act.before))
              add({ ...base, target: act.instanceId });
            break;
          case 'MONSTER_EFFECT_NO_OPP_MONSTER':
            if (
              act &&
              isMonster(act.card) &&
              !Object.values(b.cards).some(
                (c) => c.zone === 'MONSTER' && c.controller === 'opponent'
              )
            )
              add({ ...base, target: act.instanceId });
            break;
          case 'MONSTER_EFFECT':
            if (act && isMonster(act.card)) add({ ...base, target: act.instanceId });
            break;
          case 'SPELL_TRAP_ACTIVATION':
            if (act && (isSpell(act.card) || isTrap(act.card)))
              add({ ...base, target: act.instanceId });
            break;
          case 'SUMMON':
          case 'SPECIAL_SUMMON': {
            const wanted =
              pattern === 'SUMMON' ? ['NORMAL_SUMMON', 'SPECIAL_SUMMON'] : ['SPECIAL_SUMMON'];
            if (node.kind === 'ACTION' && node.action && wanted.includes(node.action))
              add({ ...base, target: summons[i][0]?.instanceId });
            break;
          }
          case 'SUMMONING_EFFECT': {
            if (!act) break;
            const spec = resultSpec(act.card, act.effectIndex);
            const text =
              spec?.verb === 'summon' || spec?.verb === 'fusion'
                ? (/(?:Fusion |Special )Summon[^.;]*/i.exec(resolutionPart(act.text))?.[0] ?? null)
                : null;
            if (text) add({ ...base, target: act.instanceId, phrase: phrase(text) });
            break;
          }
        }
      }
    }
  }
  return hits;
}

/** Chips pro sichtbarem Schritt */
export function hitsByStep(hits: Hit[]): Map<string, Hit[]> {
  const map = new Map<string, Hit[]>();
  for (const hit of hits) map.set(hit.stepId, [...(map.get(hit.stepId) ?? []), hit]);
  return map;
}

/**
 * Branch für einen Treffer (UX-Plan 6.8): Aktivierung des Staples am Anker mit voreingestellter
 * Negierung; Zerstören und Verbannen landen als Bewegung beim Auflösen.
 */
export function stressBranch(
  hit: Pick<Hit, 'anchorId' | 'target'>,
  entry: { staple: Staple; card: CardData },
  nodes: ComboNodeData[],
  states: Map<string, GameState>,
  start: GameState,
  edgeLabel: string
): ComboNodeData {
  const parent = hit.anchorId ? (nodes.find((n) => n.id === hit.anchorId) ?? null) : null;
  const before = (parent && states.get(parent.id)) || start;
  const ancestors = parent ? pathTo(nodes, parent.id) : [];
  const node = reactionNode(parent, entry.card, entry.staple, 'opponent', before, ancestors);
  const target = hit.target ? before.cards[hit.target] : undefined;
  const removal =
    target && entry.staple.removes === 'destroy' && onField(target.zone)
      ? resultMoves('GY', [target.instanceId], before, target.controller)
      : target && entry.staple.removes === 'banishFromGy' && target.zone === 'GY'
        ? resultMoves('BANISHED', [target.instanceId], before, target.owner)
        : [];
  return {
    ...node,
    edgeLabel,
    resolveMoves: [...(node.resolveMoves ?? []), ...removal],
  };
}

/**
 * Vorhandener Branch desselben Staples am Anker, damit ein zweiter Klick hinspringt statt zu verdoppeln.
 * Ältere Combos hängen Reaktionen unter einen OPPONENT-Knoten; der zählt als durchlässig (UX-Plan 15).
 */
export function existingBranch(
  nodes: ComboNodeData[],
  anchorId: string | null,
  cardId: string
): ComboNodeData | undefined {
  const parents = new Set<string | null>([anchorId]);
  for (const n of nodes) if (n.parentId === anchorId && n.kind === 'OPPONENT') parents.add(n.id);
  return nodes.find(
    (n) =>
      parents.has(n.parentId) &&
      n.kind === 'ACTIVATE' &&
      n.player === 'opponent' &&
      n.cardId === cardId
  );
}
