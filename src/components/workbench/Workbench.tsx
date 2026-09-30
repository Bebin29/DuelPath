'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage, useSettings } from '@/components/providers/SettingsProvider';
import { useHistory } from '@/lib/hooks/use-history';
import {
  cardsIn,
  initialState,
  pathTo,
  statesForTree,
  warningsOf,
  type ComboNodeData,
  type GameState,
  type NodeKind,
  type Player,
  type StartState,
} from '@/lib/combo/state';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import { START_ID, newNode, removeSubtree, updateNode } from '@/lib/combo/tree';
import {
  childrenOf,
  isMainLine,
  lineSteps,
  lineThrough,
  nextRank,
  promoteLine,
  rootAlternatives,
} from '@/lib/combo/lines';
import { reactionNode, type Staple } from '@/lib/combo/reactions';
import { candidateEffects, toSuggestionInput, type Candidate } from '@/lib/combo/suggestions';
import { dropMeaning, type DropTarget } from '@/lib/combo/play';
import { existingBranch, stressBranch, type Hit } from '@/lib/combo/stress';
import { endboardSummary, lineEnds, missingCards } from '@/lib/combo/endboard';
import { usedOptNames } from '@/lib/combo/opt-names';
import type { ComboStatus } from '@/lib/combo/library';
import { saveCombo, type LoadedCombo, type StapleCard } from '@/server/actions/combo.actions';
import { NodeEditor, StartStateEditor, type MoveTarget } from '@/components/combo/NodeEditor';
import { SuggestionPanel } from '@/components/combo/SuggestionPanel';
import { Button } from '@/components/ui/button';
import { BoardView } from './BoardView';
import { CardMenu, type MenuAnchor } from './CardMenu';
import { cardActions } from './card-actions';
import { QuickSelect } from './QuickSelect';
import { usePlay, type Prompt } from './use-play';
import { useStress } from './use-stress';
import { CompareView, type CompareColumn } from './CompareView';
import { EndboardSummary } from './EndboardSummary';
import { PickList } from './PickList';
import { StapleRail, STAPLE_MIME } from './StapleRail';
import { Inspector } from './Inspector';
import { LineList } from './LineList';
import { StepBar } from './StepBar';
import { TreeCanvas } from './TreeCanvas';
import { WorkbenchHeader, type SaveStatus, type WorkbenchMode } from './WorkbenchHeader';
import { nodeCardId, stepLabel } from './step-label';

interface Doc {
  title: string;
  deckId: string | null;
  tags: string[];
  status: ComboStatus;
  startState: StartState;
  nodes: ComboNodeData[];
}

/** Karten, die im Schritt ihren Ort gewechselt haben (UX-Plan 4.7: Was hat sich geändert?) */
function changedCards(before: GameState, after: GameState): Set<string> {
  const changed = new Set<string>();
  for (const [id, card] of Object.entries(after.cards)) {
    const prev = before.cards[id];
    if (
      !prev ||
      prev.zone !== card.zone ||
      prev.slot !== card.slot ||
      prev.position !== card.position
    ) {
      changed.add(id);
    }
  }
  return changed;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Combo-Workbench (UX-Plan 6, UI-Plan 7.1 bis 7.3): Board-Modus mit Line-Liste, Board, Schrittleiste
 * und Inspector; Baum-Modus mit Schritt-Detail. Wechsel mit V, Undo mit Strg+Z.
 */
export function Workbench({
  initial,
  staples,
  decks,
  initialView,
  initialStep,
}: {
  initial: LoadedCombo;
  staples: StapleCard[];
  decks: { id: string; name: string }[];
  initialView?: string;
  initialStep?: string;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const history = useHistory<Doc>({
    title: initial.title,
    deckId: initial.deckId,
    tags: initial.tags,
    status: initial.status,
    startState: initial.startState,
    nodes: initial.nodes,
  });
  const { title, deckId, tags, status: comboStatus, startState, nodes } = history.state;
  const setDoc = history.set;
  const setNodes = useCallback(
    (fn: (prev: ComboNodeData[]) => ComboNodeData[], group?: string) =>
      setDoc((d) => ({ ...d, nodes: fn(d.nodes) }), group),
    [setDoc]
  );

  const [cards, setCards] = useState(() => new Map(initial.cards.map((c) => [c.id, c])));
  const [selectedId, setSelectedId] = useState(() =>
    initialStep && initial.nodes.some((n) => n.id === initialStep) ? initialStep : START_ID
  );
  const [mode, setMode] = useState<WorkbenchMode>(initialView === 'tree' ? 'tree' : 'board');
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  // Kürzel lesen die Karte unter dem Zeiger sofort, auch wenn der Hover noch nicht gerendert ist
  const hovered = useRef<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget>('resolveMoves');
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [saveAttempt, setSaveAttempt] = useState(0);

  const states = useMemo(() => statesForTree(nodes, startState, cards), [nodes, startState, cards]);
  const start = useMemo(() => initialState(startState), [startState]);
  // Nach einem Undo kann der gewählte Schritt fehlen; dann gilt die Starthand
  const selected = nodes.find((n) => n.id === selectedId);
  const ancestors = useMemo(
    () => (selected ? pathTo(nodes, selected.id).slice(0, -1) : []),
    [nodes, selected]
  );
  const parentId = ancestors.at(-1)?.id;
  const before = (parentId && states.get(parentId)) || start;
  const after = (selected && states.get(selected.id)) || start;

  const labelOf = useCallback(
    (n: ComboNodeData) =>
      stepLabel(n, cards, cardLanguage, states.get(n.id), (k) => t(`combo.kind.${k}`)),
    [cards, cardLanguage, states, t]
  );
  const cardOf = useCallback((n: ComboNodeData) => nodeCardId(n, states.get(n.id)), [states]);
  const warningCount = useCallback((id: string) => warningsOf(states.get(id), id).length, [states]);

  const line = useMemo(() => lineThrough(nodes, selected?.id ?? null), [nodes, selected]);
  const steps = useMemo(() => lineSteps(nodes, line, labelOf), [nodes, line, labelOf]);
  const position = useMemo(() => {
    if (!selected) return 0;
    const idx = line.findIndex((n) => n.id === selected.id);
    let pos = 0;
    for (const s of steps) {
      if (line.indexOf(s.node) <= idx) pos = s.number;
    }
    return pos;
  }, [line, selected, steps]);
  const path = useMemo(
    () => new Set([...ancestors.map((a) => a.id), ...(selected ? [selected.id] : [])]),
    [ancestors, selected]
  );
  const lineTitle = useMemo(() => {
    const branchStart = [...ancestors, ...(selected ? [selected] : [])].find(
      (n) => (n.rank ?? 0) > 0
    );
    return branchStart
      ? `${t('workbench.branch')} · ${branchStart.edgeLabel || labelOf(branchStart)}`
      : t('workbench.mainLine');
  }, [ancestors, selected, labelOf, t]);
  const lineWarnings = useMemo(
    () => line.reduce((sum, n) => sum + warningCount(n.id), 0),
    [line, warningCount]
  );
  const changed = useMemo(
    () => (selected ? changedCards(before, after) : new Set<string>()),
    [selected, before, after]
  );

  // Vorschläge für den nächsten Schritt: am Gegner-Knoten für den Gegner, sonst für den eigenen Zug
  const actor: Player = selected?.kind === 'OPPONENT' ? 'opponent' : 'self';
  const candidates = useMemo(() => candidateEffects(after, actor, cards), [after, actor, cards]);
  const suggestionInput = useMemo(() => toSuggestionInput(after, candidates), [after, candidates]);

  // Automatisch speichern, kurz nach der letzten Änderung (kein Speichern-Knopf, UX-Plan 10)
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      setStatus('saving');
      const result = await saveCombo(initial.id, {
        title,
        deckId,
        tags,
        status: comboStatus,
        startState,
        nodes,
      });
      setStatus(result.error ? 'error' : 'saved');
    }, 800);
    return () => clearTimeout(timer);
  }, [initial.id, title, deckId, tags, comboStatus, startState, nodes, saveAttempt]);

  // Modus und Schritt stehen in der Adresse (UX-Plan 5): Neuladen landet an derselben Stelle
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', mode);
    if (selected) url.searchParams.set('step', selected.id);
    else url.searchParams.delete('step');
    window.history.replaceState(null, '', url);
  }, [mode, selected]);

  const focus = useCallback((id: string) => {
    setSelectedId(id);
    setInspectedId(null);
  }, []);
  const flow = usePlay({ nodes, selected, before, state: after, cards, setNodes, focus });
  const { clear: clearPrompts } = flow;
  const select = useCallback(
    (id: string) => {
      clearPrompts();
      focus(id);
    },
    [clearPrompts, focus]
  );
  const [menu, setMenu] = useState<MenuAnchor | null>(null);
  const [quick, setQuick] = useState(false);
  const [staplePicker, setStaplePicker] = useState(false);
  const [stressOn, setStressOn] = useState(false);
  const [stressRun, setStressRun] = useState(0);
  const [railHover, setRailHover] = useState<string | null>(null);
  const [chokeHover, setChokeHover] = useState<Hit | null>(null);
  const [comparing, setComparing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { settings, update: updateSettings } = useSettings();
  const stress = useStress({ line, steps, states, start, cards, staples });
  const toggleStress = () => {
    setStressOn((on) => !on);
    setStressRun((n) => n + 1);
  };

  const registerCard = (card: ComboCard) =>
    setCards((prev) => (prev.has(card.id) ? prev : new Map(prev).set(card.id, card)));

  const addChild = (kind: NodeKind) => {
    const child = {
      ...newNode(selected ?? null, kind),
      rank: nextRank(nodes, selected?.id ?? null),
    };
    setNodes((prev) => [...prev, child]);
    select(child.id);
    setMoveTarget(kind === 'ACTIVATE' ? 'costMoves' : 'resolveMoves');
  };

  const addReaction = (card: ComboCard, staple: Staple | null) => {
    if (!selected) return;
    registerCard(card);
    const player: Player = selected.kind === 'OPPONENT' ? 'opponent' : 'self';
    const child = {
      ...reactionNode(selected, card, staple, player, after, [...ancestors, selected]),
      rank: nextRank(nodes, selected.id),
      edgeLabel: displayName(card, cardLanguage),
    };
    setNodes((prev) => [...prev, child]);
    select(child.id);
    setMoveTarget('costMoves');
  };

  const addSuggestion = (candidate: Candidate) => {
    const child = {
      ...newNode(selected ?? null, 'ACTIVATE'),
      rank: nextRank(nodes, selected?.id ?? null),
      player: candidate.player,
      instanceId: candidate.instanceId,
      cardId: candidate.cardId,
      effectIndex: candidate.effectIndex,
    };
    setNodes((prev) => [...prev, child]);
    select(child.id);
    setMoveTarget('costMoves');
  };

  /**
   * Branch mit einer Unterbrechung des Gegners (UX-Plan 6.8). Liegt am Anker schon derselbe Staple,
   * springt die Workbench dorthin, statt ihn doppelt anzulegen.
   */
  const openStressBranch = (hit: Pick<Hit, 'staple' | 'anchorId' | 'target' | 'stepId'>) => {
    const entry = staples.find((s) => s.staple.name === hit.staple);
    if (!entry) return;
    const existing = existingBranch(nodes, hit.anchorId, entry.card.id);
    if (existing) return select(existing.id);
    registerCard(entry.card);
    const n = stress.numberOf(hit.stepId);
    const label = n
      ? t('stress.branchName', { staple: entry.staple.short, n })
      : t('stress.branchStart', { staple: entry.staple.short });
    const node = {
      ...stressBranch(hit, entry, nodes, states, start, label),
      rank: nextRank(nodes, hit.anchorId),
    };
    setNodes((prev) => [...prev, node]);
    select(node.id);
  };
  /** Staple auf einen Schritt gezogen oder per O gewählt; ein Treffer des Stresstests gibt den Anker vor */
  const dropStaple = (staple: string, nodeId: string | null, target?: string) => {
    const hit = stress.hits.find((h) => h.staple === staple && h.stepId === (nodeId ?? ''));
    const node = nodeId ? nodes.find((n) => n.id === nodeId) : undefined;
    openStressBranch({
      staple,
      stepId: nodeId ?? '',
      anchorId: hit?.anchorId ?? nodeId,
      target: target ?? hit?.target ?? node?.instanceId ?? undefined,
    });
  };
  const dismissHit = (hit: Hit) =>
    setNodes((prev) =>
      prev.map((n) =>
        n.id === hit.stepId ? { ...n, ignoredHits: [...(n.ignoredHits ?? []), hit.staple] } : n
      )
    );

  /** Line durch den Knoten zur Hauptline machen (UX-Plan 6.7) */
  const promote = (nodeId: string) =>
    setNodes((prev) => {
      const leaf = lineThrough(prev, nodeId).at(-1);
      return leaf ? promoteLine(prev, leaf.id) : prev;
    });

  // Antworten auf eine gegnerische Unterbrechung: Called, Crossout, Droplet von der eigenen Hand
  const answers = useMemo(() => {
    const top = after.chain.at(-1);
    if (!selected || top?.player !== 'opponent') return [];
    const hand = new Set(cardsIn(after, 'self', 'HAND').map((c) => c.cardId));
    return staples
      .filter((s) => s.staple.side === 'self' && hand.has(s.card.id))
      .map((s) => ({ staple: s.staple.name, cardId: s.card.id, short: s.staple.short }));
  }, [after, selected, staples]);

  // Endboard am Ende der Line (UX-Plan 6.9) und Vergleich aller Line-Enden
  const isEnd = Boolean(selected && line.at(-1)?.id === selected.id && after.chain.length === 0);
  const summary = useMemo(
    () => (isEnd && selected ? endboardSummary(after, start, cards, selected.interruptions) : null),
    [isEnd, selected, after, start, cards]
  );
  const ends = useMemo(() => lineEnds(nodes), [nodes]);
  const compareColumns = useMemo((): CompareColumn[] => {
    if (!comparing) return [];
    const mainState = states.get(ends[0]?.leaf.id ?? '') ?? start;
    return ends.slice(0, 4).map(({ leaf, branches }) => {
      const state = states.get(leaf.id) ?? start;
      return {
        leafId: leaf.id,
        title: branches.length
          ? branches.map((b) => b.edgeLabel || labelOf(b)).join(' · ')
          : t('workbench.mainLine'),
        summary: endboardSummary(state, start, cards, leaf.interruptions),
        missing: branches.length ? missingCards(mainState, state) : [],
      };
    });
  }, [comparing, ends, states, start, cards, labelOf, t]);
  const endCountOf = useCallback(
    (nodeId: string) => {
      const leaf = lineThrough(nodes, nodeId).at(-1);
      const state = leaf && states.get(leaf.id);
      return state ? endboardSummary(state, start, cards, leaf.interruptions).interruptions : null;
    },
    [nodes, states, start, cards]
  );

  /** Ablegen am Board spielt den Schritt (UX-Plan 6.3); die Starthand legt der Editor fest */
  const handleDrop = (instanceId: string, target: DropTarget, shift: boolean) => {
    const meaning = dropMeaning(after, cards, instanceId, target, shift);
    if (!meaning) return;
    if (meaning.label === 'extraSummon') flow.startMaterials(meaning.instanceId, meaning.slot);
    else flow.play(meaning.intent);
  };
  const describeDrop = (instanceId: string, target: DropTarget, shift: boolean) => {
    const meaning = dropMeaning(after, cards, instanceId, target, shift);
    return meaning ? t(`workbench.drop.${meaning.label}`) : null;
  };

  const { prompt, candidates: promptCards } = flow;
  const pickable = useMemo(() => new Set(promptCards.map((c) => c.instanceId)), [promptCards]);
  const handleCardClick = (instanceId: string, at: { x: number; y: number }) => {
    if (prompt && pickable.has(instanceId)) flow.pick(instanceId);
    else setMenu({ instanceId, ...at });
  };
  const openMenuFor = (instanceId: string) => {
    setQuick(false);
    const placed = after.cards[instanceId];
    // Karten in Stapeln haben kein eigenes Element; dann sitzt das Menü am Stapel
    const el =
      document.querySelector(`[data-instance="${instanceId}"]`) ??
      (placed && document.querySelector(`[data-drop="${placed.owner}:${placed.zone}"]`));
    const rect = el?.getBoundingClientRect();
    setMenu({
      instanceId,
      x: rect ? rect.right + 4 : window.innerWidth / 2,
      y: rect ? rect.top : window.innerHeight / 2,
    });
  };

  const goTo = useCallback(
    (pos: number) => {
      if (pos <= 0) select(START_ID);
      else if (steps[pos - 1]) select(steps[pos - 1].node.id);
    },
    [select, steps]
  );

  // Nachspielen (UX-Plan 6.10): ein Schritt pro Sekunde mal Tempo, am Ende hält es an
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (position >= steps.length) setPlaying(false);
      else goTo(position + 1);
    }, 1000 / settings.autoplaySpeed);
    return () => clearTimeout(timer);
  }, [playing, position, steps.length, goTo, settings.autoplaySpeed]);
  const togglePlay = () => {
    if (playing) return setPlaying(false);
    if (position >= steps.length) goTo(0);
    setPlaying(true);
  };

  // Tastatur (UX-Plan 9): nur, wenn kein Textfeld den Fokus hat
  const { undo, redo } = history;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        if (isTyping(e.target)) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        if (isTyping(e.target)) return;
        e.preventDefault();
        redo();
        return;
      }
      if (mod || e.altKey || isTyping(e.target)) return;
      // Das offene Aktionsmenü führt selbst mit Pfeilen, Enter und Esc
      if (
        menu &&
        ['Enter', 'Escape', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)
      )
        return;
      const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      if (prompt) {
        if (/^[1-9]$/.test(key) && promptCards[Number(key) - 1]) {
          e.preventDefault();
          flow.pick(promptCards[Number(key) - 1].instanceId);
          return;
        }
        if (key === 'Enter') {
          e.preventDefault();
          flow.confirm();
          return;
        }
        if (key === 'Escape') {
          flow.later();
          return;
        }
      }
      const onControl =
        e.target instanceof HTMLElement && e.target.closest('button, a, [role="button"]');
      if (key === 'Escape' && flow.chainMode) {
        flow.setChainMode(false);
        return;
      }
      if (key === ' ' && !onControl) {
        e.preventDefault();
        togglePlay();
        return;
      }
      if (key === '/') {
        e.preventDefault();
        setQuick(true);
        return;
      }
      if (key === 'Enter' && !onControl && after.chain.length > 0) {
        e.preventDefault();
        flow.play({ kind: 'resolve' });
        return;
      }
      if (key === 'C' && after.chain.length > 0) {
        flow.setChainMode((on) => !on);
        return;
      }
      if (key === 'O') {
        e.preventDefault();
        setStaplePicker(true);
        return;
      }
      if (key === 'T') {
        toggleStress();
        return;
      }
      if (key === 'M' && hovered.current) {
        openMenuFor(hovered.current);
        return;
      }
      if (key === 'E') {
        flow.play({ kind: 'end' });
        return;
      }
      // Kürzel wirken auf die Karte im Menü oder unter dem Zeiger (UX-Plan 9)
      const target = menu?.instanceId ?? hovered.current;
      if (target && /^[1-9NSAPGBHD]$/.test(key)) {
        const { effects, other } = cardActions(after, cards, target);
        const action = [...effects, ...other].find((a) => a.key === key);
        if (action) {
          e.preventDefault();
          setMenu(null);
          flow.run(action, target);
          return;
        }
      }
      if (e.key === 'v' || e.key === 'V') {
        setMode((m) => (m === 'board' ? 'tree' : 'board'));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(position + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(position - 1);
      } else if (e.key === 'ArrowDown') {
        const branch = steps[position - 1]?.branches[0];
        if (branch) {
          e.preventDefault();
          select(branch.nodeId);
        }
      } else if (e.key === 'ArrowUp') {
        // Zurück zur übergeordneten Line: zum Schritt, an dem der aktuelle Branch abzweigt
        const chain = [...ancestors, ...(selected ? [selected] : [])];
        const branchStart = [...chain].reverse().find((n) => (n.rank ?? 0) > 0);
        if (branchStart?.parentId) {
          e.preventDefault();
          const parent = nodes.find((n) => n.id === branchStart.parentId);
          const main = parent ? childrenOf(nodes, parent.id)[0] : undefined;
          select(main?.id ?? branchStart.parentId);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inspect = (id: string | null) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    if (id) {
      hovered.current = id;
      setInspectedId(id);
    } else {
      leaveTimer.current = setTimeout(() => {
        hovered.current = null;
        setInspectedId(null);
      }, 300);
    }
  };
  const inspected = inspectedId ? (after.cards[inspectedId] ?? null) : null;
  const hoverChoke = (hit: Hit | null) => {
    setChokeHover(hit);
    if (!hit) return inspect(null);
    const step = nodes.find((n) => n.id === hit.stepId);
    const id = hit.phrase ? step?.instanceId : (hit.target ?? step?.instanceId);
    if (id) inspect(id);
  };

  const hitsHere = (name: string) =>
    Boolean(selected && stress.byStep.get(selected.id)?.some((h) => h.staple === name));

  const stepPanel = selected ? (
    <>
      <header>
        <p className="font-mono text-2xs text-text-subtle">
          {t('workbench.step', { n: position })}
        </p>
        <h2 className="font-display text-2xl leading-tight">{labelOf(selected)}</h2>
      </header>
      {summary && (
        <EndboardSummary
          summary={summary}
          cards={cards}
          hopts={usedOptNames(after, cards, cardLanguage).length}
          weaknesses={stress.weaknesses}
          onCount={(instanceId, count) =>
            setNodes((prev) =>
              updateNode(prev, selected.id, {
                interruptions: { ...selected.interruptions, [instanceId]: count },
              })
            )
          }
          onCompare={ends.length > 1 ? () => setComparing(true) : undefined}
          showTitle={selected.kind !== 'END'}
        />
      )}
      {warningsOf(after, selected.id).length > 0 && (
        <ul className="flex flex-col gap-1 rounded-md border border-warning/40 bg-warning-tint p-2.5 text-xs text-warning">
          {warningsOf(after, selected.id).map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      {!isMainLine(nodes, selected.id) && (
        <Button
          variant="line"
          size="sm"
          className="self-start"
          onClick={() => promote(selected.id)}
        >
          {t('workbench.promoteThis')}
        </Button>
      )}
      {playing ? (
        selected.note && (
          <p className="font-hand text-[22px] leading-snug text-opponent">{selected.note}</p>
        )
      ) : (
        <label className="flex flex-col gap-1.5">
          <span className="font-display text-base">{t('workbench.note')}</span>
          <textarea
            value={selected.note ?? ''}
            onChange={(e) =>
              setNodes(
                (prev) => updateNode(prev, selected.id, { note: e.target.value || null }),
                `note:${selected.id}`
              )
            }
            placeholder={t('workbench.notePlaceholder')}
            rows={2}
            className="resize-y rounded-md border border-line bg-transparent px-2.5 py-2 font-hand text-[15px] leading-snug text-opponent outline-none placeholder:font-sans placeholder:text-sm placeholder:text-text-subtle focus-visible:border-line-strong"
          />
        </label>
      )}
      <details
        className="group"
        open={editOpen}
        onToggle={(e) => setEditOpen(e.currentTarget.open)}
      >
        <summary className="cursor-pointer font-display text-base">
          {t('workbench.editStep')}
        </summary>
        <div className="mt-3 min-w-0 overflow-x-auto">
          <NodeEditor
            node={selected}
            before={before}
            after={after}
            ancestors={ancestors}
            cards={cards}
            moveTarget={moveTarget}
            onMoveTargetChange={setMoveTarget}
            onChange={(patch) => setNodes((prev) => updateNode(prev, selected.id, patch))}
            onAddChild={addChild}
            onDelete={() => {
              setNodes((prev) => removeSubtree(prev, selected.id));
              select(parentId ?? START_ID);
            }}
            onRegisterCard={registerCard}
            staples={staples}
            onReact={addReaction}
          />
        </div>
      </details>
      <SuggestionPanel
        input={suggestionInput}
        candidates={candidates}
        cards={cards}
        onPick={addSuggestion}
      />
    </>
  ) : (
    <>
      <header>
        <p className="font-mono text-2xs text-text-subtle">{t('workbench.step', { n: 0 })}</p>
        <h2 className="font-display text-2xl leading-tight">{t('workbench.startHand')}</h2>
      </header>
      <StartStateEditor
        startState={startState}
        cards={cards}
        onChange={(next) => setDoc((d) => ({ ...d, startState: next }))}
        onAddChild={addChild}
        onRegisterCard={registerCard}
        deckId={deckId}
      />
      <SuggestionPanel
        input={suggestionInput}
        candidates={candidates}
        cards={cards}
        onPick={addSuggestion}
      />
    </>
  );

  return (
    <div className="flex h-dvh flex-col">
      <p className="sr-only" aria-live="polite">
        {selected
          ? t('workbench.announce', {
              n: position,
              label: labelOf(selected),
              chain: after.chain.length
                ? t('workbench.chainOpen', { count: after.chain.length })
                : '',
            })
          : t('workbench.startHand')}
      </p>
      <WorkbenchHeader
        title={title}
        onTitle={(value) => setDoc((d) => ({ ...d, title: value }), 'title')}
        deckId={deckId}
        decks={decks}
        onDeck={(value) => setDoc((d) => ({ ...d, deckId: value }))}
        mode={mode}
        onMode={setMode}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        warnings={lineWarnings}
        onWarnings={() => {
          const first = line.find((n) => warningCount(n.id) > 0);
          if (first) select(first.id);
        }}
        status={status}
        onRetry={() => setSaveAttempt((n) => n + 1)}
        stress={stressOn}
        chokePoints={stress.byStep.size}
        onStress={toggleStress}
        comboStatus={comboStatus}
        onComboStatus={(value) => setDoc((d) => ({ ...d, status: value }))}
        tags={tags}
        onTags={(value) => setDoc((d) => ({ ...d, tags: value }))}
      />

      {mode === 'board' ? (
        <div className="grid min-h-0 flex-1 grid-cols-[264px_56px_1fr_320px]">
          <div className="min-h-0 border-r border-line bg-surface-1">
            <LineList
              chokes={
                stressOn
                  ? {
                      byStep: stress.byStep,
                      run: stressRun,
                      imageOf: (name) =>
                        staples.find((s) => s.staple.name === name)?.card.imageSmall ?? null,
                      describe: (hit) => describeHit(hit, stress.shortOf(hit.staple), t),
                      onPick: openStressBranch,
                      onHover: hoverChoke,
                      onDismiss: dismissHit,
                    }
                  : null
              }
              marked={
                railHover
                  ? new Set(stress.hits.filter((h) => h.staple === railHover).map((h) => h.stepId))
                  : undefined
              }
              onDropStaple={(name, nodeId) => dropStaple(name, nodeId)}
              endCountOf={endCountOf}
              onCompare={ends.length > 1 ? () => setComparing(true) : undefined}
              onOpen={(id) => {
                select(id);
                setEditOpen(true);
              }}
              onPromote={promote}
              warningTextOf={(id) => warningsOf(states.get(id), id).join('\n')}
              title={lineTitle}
              steps={steps}
              selectedId={selectedId}
              startSelected={!selected}
              alternatives={rootAlternatives(nodes)}
              cards={cards}
              labelOf={labelOf}
              cardOf={cardOf}
              warningsOf={warningCount}
              onSelect={select}
              onSelectStart={() => select(START_ID)}
            />
          </div>
          <StapleRail
            staples={stress.rail}
            onHover={setRailHover}
            onPick={(name) => dropStaple(name, selected?.id ?? null)}
          />
          <div
            className="relative flex min-h-0 min-w-0 flex-col"
            onMouseLeave={() => inspect(null)}
          >
            <div
              className="min-h-0 flex-1"
              onDragOver={(e) => {
                if (!e.dataTransfer.types.includes(STAPLE_MIME)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={(e) => {
                const name = e.dataTransfer.getData(STAPLE_MIME);
                if (!name) return;
                e.preventDefault();
                const card = (e.target as HTMLElement).closest<HTMLElement>('[data-instance]');
                dropStaple(name, selected?.id ?? null, card?.dataset.instance);
              }}
            >
              <BoardView
                state={after}
                cards={cards}
                changed={changed}
                inspectedId={inspectedId}
                onInspect={inspect}
                onDrop={playing ? undefined : handleDrop}
                describeDrop={describeDrop}
                onCardClick={handleCardClick}
                picking={
                  prompt
                    ? {
                        pickable,
                        picked: new Set(
                          'picked' in prompt
                            ? [
                                ...prompt.picked,
                                ...(prompt.kind === 'fusion' && prompt.fusionId
                                  ? [prompt.fusionId]
                                  : []),
                              ]
                            : []
                        ),
                      }
                    : null
                }
              />
            </div>
            <StepBar
              position={position}
              total={steps.length}
              onPrev={() => goTo(position - 1)}
              onNext={() => goTo(position + 1)}
              cards={cards}
              onInspect={inspect}
              prompt={
                prompt && {
                  question: questionOf(prompt, after, cards, cardLanguage, t),
                  candidates: promptCards,
                  picked: 'picked' in prompt ? prompt.picked : [],
                  multi:
                    prompt.kind === 'materials' ||
                    (prompt.kind === 'fusion' && Boolean(prompt.fusionId)) ||
                    (prompt.kind === 'result' && prompt.spec.count > 1),
                  all: prompt.kind === 'result' ? prompt.all : undefined,
                }
              }
              onPick={flow.pick}
              onConfirm={() => flow.confirm()}
              onAll={prompt?.kind === 'result' ? flow.showAll : undefined}
              onLater={flow.later}
              chainLength={after.chain.length}
              chainMode={flow.chainMode}
              onResolve={() => flow.play({ kind: 'resolve' })}
              onChain={() => flow.setChainMode((on) => !on)}
              onOpponent={() => setStaplePicker(true)}
              answers={answers}
              onAnswer={(offer) => {
                const entry = staples.find((s) => s.staple.name === offer.staple);
                if (entry) addReaction(entry.card, entry.staple);
              }}
              triggers={flow.triggers}
              onTrigger={(offer) =>
                flow.play({
                  kind: 'activate',
                  instanceId: offer.instanceId,
                  effectIndex: offer.effectIndex,
                })
              }
              offer={flow.offer}
              onInsert={() => flow.accept('insert')}
              onReplace={() => flow.accept('replace')}
              onDismissOffer={flow.dismissOffer}
              onAdd={addChild}
              playing={playing}
              onPlay={togglePlay}
              speed={settings.autoplaySpeed}
              onSpeed={(autoplaySpeed) => updateSettings({ autoplaySpeed })}
              branches={steps[position - 1]?.branches ?? []}
              onBranch={select}
            />
            {staplePicker && (
              <PickList
                items={[...stress.chosen]
                  .sort((a, b) => Number(hitsHere(b.staple.name)) - Number(hitsHere(a.staple.name)))
                  .map((s) => ({
                    id: s.staple.name,
                    label: displayName(s.card, cardLanguage),
                    image: s.card.imageSmall,
                    hint: hitsHere(s.staple.name) ? t('stress.hitsHere') : undefined,
                    strong: hitsHere(s.staple.name),
                    keywords: [s.staple.short, s.card.name, s.card.nameDe ?? ''],
                  }))}
                max={12}
                placeholder={t('stress.pickStaple')}
                hint={t('stress.pickStapleHint')}
                onPick={(name) => {
                  setStaplePicker(false);
                  dropStaple(name, selected?.id ?? null);
                }}
                onClose={() => setStaplePicker(false)}
              />
            )}
            {comparing && (
              <CompareView
                columns={compareColumns}
                cards={cards}
                onOpen={(leafId) => {
                  setComparing(false);
                  select(leafId);
                }}
                onClose={() => setComparing(false)}
              />
            )}
            {quick && (
              <QuickSelect
                state={after}
                cards={cards}
                onPick={openMenuFor}
                onClose={() => setQuick(false)}
              />
            )}
            <CardMenu
              anchor={menu}
              state={after}
              cards={cards}
              onRun={(action) => menu && flow.run(action, menu.instanceId)}
              onClose={() => setMenu(null)}
            />
          </div>
          <div className="min-h-0 border-l border-line bg-surface-1">
            <Inspector
              state={after}
              cards={cards}
              inspected={inspected}
              highlight={chokeHover?.phrase}
            >
              {stepPanel}
            </Inspector>
          </div>
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_320px]">
          <div className="min-h-0">
            <TreeCanvas
              nodes={nodes}
              selectedId={selected ? selected.id : START_ID}
              path={path}
              labelOf={labelOf}
              detailOf={(n) => n.edgeLabel ?? t(`combo.kind.${n.kind}`)}
              imageOf={(n) => {
                const id = cardOf(n);
                return id ? (cards.get(id)?.imageSmall ?? null) : null;
              }}
              warningsOf={warningCount}
              startLabel={t('workbench.startHand')}
              onSelect={select}
              onOpen={(id) => {
                select(id);
                setMode('board');
              }}
            />
          </div>
          <div className="min-h-0 border-l border-line bg-surface-1">
            <Inspector state={after} cards={cards} inspected={null}>
              {stepPanel}
            </Inspector>
          </div>
        </div>
      )}
    </div>
  );
}

/** Frage der Schrittleiste zur offenen Abfrage (UX-Plan 6.4) */
function questionOf(
  prompt: Prompt,
  state: GameState,
  cards: Map<string, ComboCard>,
  language: 'en' | 'de',
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  switch (prompt.kind) {
    case 'discard':
      return t('workbench.prompt.discard');
    case 'result':
      return t(`workbench.prompt.${prompt.spec.verb}`);
    case 'fusion':
      return prompt.fusionId
        ? t('workbench.prompt.fusionMaterials', {
            name: displayName(cards.get(state.cards[prompt.fusionId]?.cardId ?? ''), language),
            picked: prompt.picked.length,
            count: prompt.spec.materials?.count ?? 2,
          })
        : t('workbench.prompt.fusion');
    case 'materials':
      return t('workbench.prompt.materials', {
        name: displayName(cards.get(state.cards[prompt.instanceId]?.cardId ?? ''), language),
        picked: prompt.picked.length,
      });
  }
}

/** Begründung eines Choke Points für Tooltip und Screenreader, etwa „Ash trifft: add … from your Deck“ */
function describeHit(
  hit: Hit,
  short: string | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  const name = short ?? hit.staple;
  const why = hit.phrase?.text ?? t(`stress.pattern.${hit.pattern}`, { count: hit.count ?? 0 });
  return t('stress.hitReason', { staple: name, why });
}
