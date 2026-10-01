'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  cardsIn,
  isOptAvailable,
  isTriggerEffect,
  type ComboNodeData,
  type GameState,
  type PlacedCard,
  type Player,
} from '@/lib/combo/state';
import type { ComboCard } from '@/lib/combo/cards';
import { START_ID } from '@/lib/combo/tree';
import {
  buildStep,
  freeEmz,
  fusionMoves,
  insertBefore,
  replaceMain,
  resultMoves,
  triggerOffers,
  withMoves,
  type PlayIntent,
} from '@/lib/combo/play';
import { materialCandidates, resultCandidates, type ResultSpec } from '@/lib/combo/effect-results';
import { promptsFor, withResult } from '@/lib/combo/prompts';
import type { CardAction } from '@/lib/combo/card-actions';

/** Offene Frage der Schrittleiste; `at` ist der Schritt, zu dem sie gehört */
export type Prompt =
  | {
      kind: 'discard';
      at: string;
      player: Player;
      exclude: string;
      /** Kosten beim Aktivieren oder Teil der Wirkung beim Auflösen */
      key: 'costMoves' | 'resolveMoves';
    }
  | { kind: 'result'; at: string; player: Player; spec: ResultSpec; picked: string[]; all: boolean }
  | {
      kind: 'fusion';
      at: string;
      player: Player;
      spec: ResultSpec;
      fusionId: string | null;
      picked: string[];
    }
  | { kind: 'materials'; at: string; instanceId: string; slot?: number; picked: string[] };

/** So lange steht das Angebot „Einfügen / Ersetzen“ nach einem Branch (UX-Plan 6.7) */
export const OFFER_MS = 5000;

interface PlayArgs {
  nodes: ComboNodeData[];
  selected: ComboNodeData | undefined;
  before: GameState;
  state: GameState;
  cards: Map<string, ComboCard>;
  setNodes: (fn: (prev: ComboNodeData[]) => ComboNodeData[]) => void;
  /** Wählt den Schritt, ohne die offenen Fragen zu verwerfen */
  focus: (id: string) => void;
}

/**
 * Spielen am Board (UX-Plan 6.3 bis 6.7): aus der Absicht wird der Schritt, danach fragt die
 * Schrittleiste nach, was der Kartentext offenlässt, und bietet Trigger und Einfügen an.
 */
export function usePlay({ nodes, selected, before, state, cards, setNodes, focus }: PlayArgs) {
  const [queue, setQueue] = useState<Prompt[]>([]);
  const [offer, setOffer] = useState<string | null>(null);
  const [chainMode, setChainMode] = useState(false);
  const here = selected?.id ?? START_ID;
  const prompt = queue[0]?.at === here ? queue[0] : null;

  const play = useCallback(
    (intent: PlayIntent) => {
      const chaining = chainMode && state.chain.length > 0;
      const withChain =
        intent.kind === 'activate' ? { ...intent, chain: intent.chain ?? chaining } : intent;
      const created = buildStep(withChain, { nodes, parent: selected ?? null, state, cards });
      const last = created.at(-1);
      if (!last) return;
      setNodes((prev) => [...prev, ...created]);
      focus(last.id);
      setChainMode(false);
      setOffer((created[0].rank ?? 0) > 0 ? created[0].id : null);

      const next: Prompt[] = promptsFor(last, state, cards).map((p) =>
        p.kind === 'discard'
          ? { kind: 'discard', at: p.stepId, player: p.player, exclude: p.exclude, key: p.key }
          : p.kind === 'fusion'
            ? {
                kind: 'fusion',
                at: p.stepId,
                player: p.player,
                spec: p.spec,
                fusionId: null,
                picked: [],
              }
            : {
                kind: 'result',
                at: p.stepId,
                player: p.player,
                spec: p.spec,
                picked: [],
                all: false,
              }
      );
      setQueue(next);
    },
    [chainMode, state, nodes, selected, cards, setNodes, focus]
  );

  const startMaterials = useCallback(
    (instanceId: string, slot?: number) =>
      setQueue([{ kind: 'materials', at: here, instanceId, slot, picked: [] }]),
    [here]
  );

  const run = useCallback(
    (action: CardAction, instanceId: string) => {
      if (action.extraSummon) startMaterials(instanceId);
      else if (action.intent) play(action.intent);
    },
    [play, startMaterials]
  );

  const candidates = useMemo((): PlacedCard[] => {
    if (!prompt) return [];
    switch (prompt.kind) {
      case 'discard':
        return cardsIn(state, prompt.player, 'HAND').filter((c) => c.instanceId !== prompt.exclude);
      case 'result':
        return resultCandidates(prompt.spec, state, prompt.player, cards, prompt.all);
      case 'fusion':
        return prompt.fusionId
          ? materialCandidates(prompt.spec, state, prompt.player, cards)
          : resultCandidates(prompt.spec, state, prompt.player, cards);
      case 'materials':
        return cardsIn(state, 'self', 'MONSTER');
    }
  }, [prompt, state, cards]);

  const addMoves = useCallback(
    (at: string, key: 'costMoves' | 'resolveMoves', moves: ReturnType<typeof resultMoves>) =>
      setNodes((prev) => prev.map((n) => (n.id === at ? withMoves(n, key, moves) : n))),
    [setNodes]
  );
  const shift = () => setQueue((q) => q.slice(1));
  const patch = (fn: (p: Prompt) => Prompt) =>
    setQueue((q) => (q[0] ? [fn(q[0]), ...q.slice(1)] : q));
  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const confirm = useCallback(
    (picked?: string[]) => {
      if (!prompt) return;
      switch (prompt.kind) {
        case 'result':
          setNodes((prev) =>
            prev.map((n) =>
              n.id === prompt.at
                ? withResult(n, prompt.spec, picked ?? prompt.picked, state, prompt.player)
                : n
            )
          );
          return shift();
        case 'fusion':
          if (!prompt.fusionId) return;
          addMoves(
            prompt.at,
            'resolveMoves',
            fusionMoves(prompt.fusionId, picked ?? prompt.picked, state, prompt.player)
          );
          return shift();
        case 'materials':
          return play({
            kind: 'specialSummon',
            instanceId: prompt.instanceId,
            slot: prompt.slot ?? freeEmz(state),
            materials: picked ?? prompt.picked,
          });
        case 'discard':
          return;
      }
    },
    [prompt, state, addMoves, setNodes, play]
  );

  const pick = useCallback(
    (id: string) => {
      if (!prompt) return;
      switch (prompt.kind) {
        case 'discard':
          addMoves(prompt.at, prompt.key, resultMoves('GY', [id], state, prompt.player));
          return shift();
        case 'result':
          if (prompt.spec.count === 1) return confirm([id]);
          return patch((p) => (p.kind === 'result' ? { ...p, picked: toggle(p.picked, id) } : p));
        case 'fusion':
          return patch((p) =>
            p.kind !== 'fusion'
              ? p
              : p.fusionId
                ? { ...p, picked: toggle(p.picked, id) }
                : { ...p, fusionId: id }
          );
        case 'materials':
          return patch((p) =>
            p.kind === 'materials' ? { ...p, picked: toggle(p.picked, id) } : p
          );
      }
    },
    [prompt, state, addMoves, confirm]
  );

  const showAll = () => patch((p) => (p.kind === 'result' ? { ...p, all: !p.all } : p));
  // Mehrteilige Effekte: „Später“ überspringt nur diesen Teil, die nächste Frage folgt
  const later = shift;

  const accept = useCallback(
    (how: 'insert' | 'replace') => {
      if (!offer) return;
      const id = offer;
      setNodes((prev) => (how === 'insert' ? insertBefore(prev, id) : replaceMain(prev, id)));
      setOffer(null);
    },
    [offer, setNodes]
  );

  // Trigger des gewählten Schritts, solange die Schrittleiste nichts fragt (UX-Plan 6.5)
  const triggers = useMemo(
    () =>
      selected && !prompt
        ? triggerOffers(
            before,
            state,
            cards,
            (card, i) => isTriggerEffect(card, i, card.effects[i]),
            (id, i, card) =>
              isOptAvailable(
                state,
                { instanceId: id, effectIndex: i, player: state.cards[id].controller },
                card
              )
          )
        : [],
    [selected, prompt, before, state, cards]
  );

  return {
    play,
    run,
    startMaterials,
    prompt,
    candidates,
    pick,
    confirm,
    showAll,
    later,
    offer,
    accept,
    dismissOffer: () => setOffer(null),
    chainMode,
    setChainMode,
    triggers,
  };
}
