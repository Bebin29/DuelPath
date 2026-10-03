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
import { displayName, toComboCard, type ComboCard } from '@/lib/combo/cards';
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
import { endboardSummary, fieldCardIds, lineEnds, missingCards } from '@/lib/combo/endboard';
import { usedOptNames } from '@/lib/combo/opt-names';
import type { ComboStatus } from '@/lib/combo/library';
import { getDeckCounts } from '@/server/actions/deck-view.actions';
import { saveCombo, type LoadedCombo, type StapleCard } from '@/server/actions/combo.actions';
import { NodeEditor, type MoveTarget } from '@/components/combo/NodeEditor';
import { StartStatePanel } from './StartStatePanel';
import { SuggestionPanel } from '@/components/combo/SuggestionPanel';
import { ListTree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { OneTimeHint, useHints } from '@/components/ui/one-time-hint';
import { useCardSheet } from '@/components/cards/CardSheet';
import { AnimatePresence, motion } from 'motion/react';
import { EASE } from '@/lib/motion';
import { usePaletteSource, type PaletteItem } from '@/components/command/CommandPalette';
import { commandMatches, matchCards, parseCommand } from '@/lib/combo/command';
import { nicknameMap } from '@/lib/settings';
import { BoardView } from './BoardView';
import { CardMenu, type MenuAnchor } from './CardMenu';
import { cardActions } from '@/lib/combo/card-actions';
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
import { PracticeBar, type PracticeRun } from './PracticeBar';
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

const MODE_TRANSITION = {
  initial: { opacity: 0, scale: 0.985 },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 0.97, filter: 'blur(6px)' },
  transition: { duration: 0.24, ease: EASE.smooth },
} as const;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Combo-Workbench (UX-Plan 6, UI-Plan 7.1 bis 7.3): Board-Modus mit Line-Liste, Board, Schrittleiste
 * und Inspector; Baum-Modus mit Schritt-Detail. Wechsel mit V, Undo mit Strg+Z.
 *
 * Mit `practice` läuft eine Übungshand (Lücke L2): dieselbe Werkbank, aber nichts wird gespeichert,
 * und statt der Kopfzeile steht die Übungsleiste mit Uhr und Auswertungsknopf darüber.
 */
export function Workbench({
  initial,
  staples,
  decks,
  initialView,
  initialStep,
  practice,
}: {
  initial: LoadedCombo;
  staples: StapleCard[];
  decks: { id: string; name: string }[];
  initialView?: string;
  initialStep?: string;
  practice?: PracticeRun;
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
  const revision = useRef(initial.revision);
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
  // Deck-Abgleich (UX-Plan 7.4): eigene Karten eines Schritts, die nicht mehr im Deck sind
  const [deckCounts, setDeckCounts] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    if (!deckId) return;
    let live = true;
    void getDeckCounts(deckId).then((r) => live && setDeckCounts(r.data ?? null));
    return () => {
      live = false;
    };
  }, [deckId]);
  const allWarnings = useCallback(
    (id: string) => {
      const list = warningsOf(states.get(id), id);
      const node = nodes.find((n) => n.id === id);
      if (
        deckId &&
        deckCounts &&
        node?.player === 'self' &&
        node.cardId &&
        !deckCounts[node.cardId] &&
        startState.cards.some((c) => c.cardId === node.cardId && c.owner === 'self')
      )
        list.push(
          t('decks.notInDeck', { name: displayName(cards.get(node.cardId), cardLanguage) })
        );
      return list;
    },
    [states, nodes, deckId, deckCounts, startState, cards, cardLanguage, t]
  );
  const warningCount = useCallback((id: string) => allWarnings(id).length, [allWarnings]);

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

  // Automatisch speichern, kurz nach der letzten Änderung (kein Speichern-Knopf, UX-Plan 10).
  // Eine Übungshand gehört niemandem: sie wird gespielt, ausgewertet und weggeworfen.
  const isPractice = Boolean(practice);
  const firstRender = useRef(true);
  useEffect(() => {
    if (isPractice) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      setStatus('saving');
      // Mit Revision: hat jemand anderes (etwa die API) gespeichert, wird nichts still überschrieben
      const result = await saveCombo(
        initial.id,
        {
          title,
          deckId,
          tags,
          status: comboStatus,
          startState,
          nodes,
        },
        revision.current
      );
      if (result.data) revision.current = result.data.revision;
      setStatus(result.data ? 'saved' : result.error === 'CONFLICT' ? 'conflict' : 'error');
    }, 800);
    return () => clearTimeout(timer);
  }, [initial.id, title, deckId, tags, comboStatus, startState, nodes, saveAttempt, isPractice]);

  // Modus und Schritt stehen in der Adresse (UX-Plan 5): Neuladen landet an derselben Stelle
  useEffect(() => {
    if (isPractice) return;
    const url = new URL(window.location.href);
    url.searchParams.set('view', mode);
    if (selected) url.searchParams.set('step', selected.id);
    else url.searchParams.delete('step');
    window.history.replaceState(null, '', url);
  }, [mode, selected, isPractice]);

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
  // Zuletzt angeklickte oder per „/“ gewählte Karte; Kürzel wirken auf sie, bis Esc
  const [pickedCard, setPickedCard] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashHint = (text: string) => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHint(text);
    hintTimer.current = setTimeout(() => setHint(null), 2600);
  };
  const [quick, setQuick] = useState(false);
  const [staplePicker, setStaplePicker] = useState(false);
  // Spielmarke in eine leere Monsterzone (UX-Plan 16): Ziel und die Token-Karten aus der Datenbank
  const [tokenTarget, setTokenTarget] = useState<DropTarget | null>(null);
  const [tokens, setTokens] = useState<ComboCard[] | null>(null);
  const openTokenPicker = (target: DropTarget) => {
    setTokenTarget(target);
    if (tokens) return;
    void fetch('/api/cards?type=Token&limit=100')
      .then((res) => res.json())
      .then((data: { cards?: Parameters<typeof toComboCard>[0][] }) =>
        setTokens((data.cards ?? []).map(toComboCard))
      )
      .catch(() => setTokens([]));
  };
  const [stressOn, setStressOn] = useState(false);
  const [stressRun, setStressRun] = useState(0);
  const [railHover, setRailHover] = useState<string | null>(null);
  const [chokeHover, setChokeHover] = useState<Hit | null>(null);
  const [comparing, setComparing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const { settings, update: updateSettings } = useSettings();
  const hints = useHints();
  // Unter 1440 px liegt die Line-Liste als Overlay über dem Board (UI-Plan 6.2, Stufe „kompakt“)
  const [linesOpen, setLinesOpen] = useState(false);
  const cardSheet = useCardSheet();
  const [pairsOn, setPairsOn] = useState(false);
  const stress = useStress({
    line,
    steps,
    states,
    start,
    cards,
    staples,
    pairs: stressOn && pairsOn,
  });
  const toggleStress = () => {
    // Die Treffer stehen in der Line-Liste; im kompakten Modus öffnet sie sich mit
    if (!stressOn) setLinesOpen(true);
    setStressOn((on) => !on);
    setStressRun((n) => n + 1);
  };

  /** Korrigierte Effekte aus der Kartenansicht gelten sofort für Zustand, Regeln und Stresstest */
  const updateCardEffects = (id: string, effects: ComboCard['effects']) =>
    setCards((prev) => {
      const card = prev.get(id);
      return card ? new Map(prev).set(id, { ...card, effects }) : prev;
    });

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
    // Wer einen Treffer anklickt, hat den Hinweis zum Stresstest verstanden
    if (stressOn) hints.markSeen('stress');
  };
  /** Staple auf einen Schritt gezogen oder per O gewählt; ein Treffer des Stresstests gibt den Anker vor */
  const dropStaple = (staple: string, nodeId: string | null, target?: string) => {
    hints.markSeen('staple-rail');
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

  /**
   * Übungshand auswerten (Lücke L2): gezählt wird das Ende der Line, auf der der Nutzer steht,
   * nicht der gerade gewählte Schritt. Ein Blick zurück in die Schritte verkleinert das Ergebnis
   * also nicht.
   */
  const finishPractice = () => {
    if (!practice) return;
    const leaf = line.at(-1);
    const state = (leaf && states.get(leaf.id)) || after;
    const summary = endboardSummary(state, start, cards);
    practice.onFinish(
      { interruptions: summary.interruptions, field: fieldCardIds(state) },
      Date.now() - practice.startedAt
    );
  };

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

  // Links der offenen Chain, die ein höherer Link negiert (Ash auf Aluber): Rotstift-Strich
  const negatedLinks = useMemo(() => {
    const set = new Set<string>();
    for (const link of after.chain) {
      const n = nodes.find((x) => x.id === link.nodeId)?.negates;
      if (n?.type === 'EFFECT' || n?.type === 'ACTIVATION') set.add(n.nodeId);
      if (n?.type === 'CARD')
        after.chain.filter((l) => l.instanceId === n.instanceId).forEach((l) => set.add(l.nodeId));
      if (n?.type === 'NAME')
        after.chain.filter((l) => l.cardId === n.cardId).forEach((l) => set.add(l.nodeId));
    }
    return set;
  }, [after.chain, nodes]);

  const { prompt, candidates: promptCards } = flow;
  const pickable = useMemo(() => new Set(promptCards.map((c) => c.instanceId)), [promptCards]);
  const handleCardClick = (instanceId: string, at: { x: number; y: number }) => {
    if (prompt && pickable.has(instanceId)) return flow.pick(instanceId);
    setPickedCard(instanceId);
    setMenu({ instanceId, ...at });
  };
  const openMenuFor = (instanceId: string) => {
    setQuick(false);
    setPickedCard(instanceId);
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
      // In der Line-Liste führen die Pfeiltasten den Fokus im Baum, nicht die Schritte
      if (
        e.key.startsWith('Arrow') &&
        e.target instanceof HTMLElement &&
        e.target.closest('[role="tree"]')
      )
        return;
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
      // Karten sind fokussierbar, zählen für Leertaste und Enter aber nicht als Knopf
      const onControl =
        e.target instanceof HTMLElement &&
        !e.target.closest('[data-instance]') &&
        e.target.closest('button, a, [role="button"]');
      if (key === 'Escape' && flow.chainMode) {
        flow.setChainMode(false);
        return;
      }
      if (key === 'Escape' && pickedCard) {
        setPickedCard(null);
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
      if (key === 'L') {
        setLinesOpen((open) => !open);
        return;
      }
      if (key === 'Escape' && linesOpen) {
        setLinesOpen(false);
        return;
      }
      if (key === 'Delete' && selected && !onControl) {
        // Mit allen Folgeschritten; Strg+Z holt sie zurück (UX-Plan 9)
        e.preventDefault();
        setNodes((prev) => removeSubtree(prev, selected.id));
        select(parentId ?? START_ID);
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
      // Kürzel wirken auf die Karte im Menü, unter dem Zeiger oder die zuletzt gewählte (UX-Plan 9)
      const target =
        menu?.instanceId ??
        hovered.current ??
        (pickedCard && after.cards[pickedCard] ? pickedCard : null);
      if (/^[1-9NSAPGBHD]$/.test(key)) {
        if (!target) {
          flashHint(t('workbench.keys.pickFirst', { key }));
          return;
        }
        const { effects, other } = cardActions(after, cards, target);
        // A aktiviert den ersten Effekt, dessen OPT noch frei ist, sonst die Kartenaktivierung
        const action =
          [...effects, ...other].find((a) => a.key === key) ??
          (key === 'A' ? (effects.find((a) => a.free) ?? effects[0]) : undefined);
        e.preventDefault();
        if (!action) {
          const name = displayName(cards.get(after.cards[target].cardId), cardLanguage);
          flashHint(t('workbench.keys.notPossible', { key, name }));
          return;
        }
        setMenu(null);
        setPickedCard(target);
        flow.run(action, target);
        return;
      }
      // Enter, Kontextmenütaste oder Umschalt+F10 auf einer Karte öffnen ihr Aktionsmenü
      const cardEl =
        e.target instanceof HTMLElement ? e.target.closest<HTMLElement>('[data-instance]') : null;
      if (
        (key === 'ContextMenu' || (key === 'F10' && e.shiftKey) || (key === 'Enter' && cardEl)) &&
        (cardEl?.dataset.instance ?? target)
      ) {
        e.preventDefault();
        openMenuFor((cardEl?.dataset.instance ?? target)!);
        return;
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

  // Befehlszeile in Strg+K (UX-Plan 9): „ns aluber“, „act ash 2“, „o imperm“, „res“
  const userNicknames = useMemo(() => nicknameMap(settings.nicknames), [settings.nicknames]);
  usePaletteSource('workbench', (query): PaletteItem[] => {
    const cmd = parseCommand(query);
    if (!cmd) return [];
    const item = (
      id: string,
      label: string,
      run: () => void,
      extra: Partial<PaletteItem> = {}
    ) => ({
      id: `cmd:${id}`,
      group: 'commands',
      label,
      run,
      ...extra,
    });
    if (cmd.verb === 'resolve')
      return [
        item('resolve', t('workbench.resolve'), () => flow.play({ kind: 'resolve' }), {
          disabled: after.chain.length === 0,
          hint: after.chain.length ? undefined : t('workbench.noChain'),
        }),
      ];
    if (cmd.verb === 'end')
      return [item('end', t('combo.kind.END'), () => flow.play({ kind: 'end' }))];
    if (!cmd.query) return [];
    if (cmd.verb === 'staple') {
      const list = stress.chosen.map((s) => ({
        id: s.staple.name,
        name: s.card.name,
        nameDe: s.card.nameDe,
        image: s.card.imageSmall,
        short: s.staple.short,
      }));
      return matchCards(cmd.query, list, [], userNicknames)
        .slice(0, 4)
        .map((s) =>
          item(
            `staple:${s.id}`,
            t('palette.stapleCommand', { name: s.name }),
            () => dropStaple(s.id, selected?.id ?? null),
            { image: s.image, hint: hitsHere(s.id) ? t('stress.hitsHere') : undefined }
          )
        );
    }
    const usable = commandMatches(cmd, after, cards, userNicknames);
    return usable.slice(0, 4).map((c) => {
      const { action } = c;
      const name = displayName(c.card, cardLanguage);
      const verb = action
        ? t(`workbench.actions.${action.label}`, { n: action.key })
        : t('palette.notPossible');
      return item(
        `${cmd.verb}:${c.instanceId}`,
        `${verb} · ${name}`,
        () => action && flow.run(action, c.instanceId),
        {
          image: c.card?.imageSmall ?? null,
          hint: t(`combo.zones.${c.zone}`),
          disabled: !action,
        }
      );
    });
  });

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
      {allWarnings(selected.id).length > 0 && (
        <ul className="flex flex-col gap-1 rounded-md border border-warning/40 bg-warning-tint p-2.5 text-xs text-warning">
          {allWarnings(selected.id).map((w) => (
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
      {/* In der Übung ist die Hand gezogen und bleibt, wie sie ist; sonst gäbe es nichts zu üben */}
      {practice ? (
        <p className="text-sm text-text-muted">{t('practice.startHint')}</p>
      ) : (
        <StartStatePanel
          startState={startState}
          cards={cards}
          onChange={(next) => setDoc((d) => ({ ...d, startState: next }))}
          onRegisterCard={registerCard}
          deckId={deckId}
        />
      )}
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
      {/* Unter 1024 px reicht der Platz nicht für Board und Inspector (UI-Sweep-Plan 4.1) */}
      <div className="fixed inset-0 z-[60] hidden place-items-center bg-bg p-8 text-center max-[1023px]:grid">
        <p className="max-w-sm font-display text-2xl">{t('workbench.tooNarrow')}</p>
      </div>
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
      {practice ? (
        <PracticeBar
          run={practice}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={history.undo}
          onRedo={history.redo}
          onFinish={finishPractice}
        />
      ) : (
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
          pairs={pairsOn}
          onPairs={() => {
            setPairsOn((on) => !on);
            setStressRun((n) => n + 1);
          }}
          comboStatus={comboStatus}
          onComboStatus={(value) => setDoc((d) => ({ ...d, status: value }))}
          tags={tags}
          onTags={(value) => setDoc((d) => ({ ...d, tags: value }))}
        />
      )}

      {/* Moduswechsel (Szene „Moduswechsel“): das Board tritt mit Unschärfe zurück, der Baum wächst */}
      <AnimatePresence mode="popLayout" initial={false}>
        {mode === 'board' ? (
          <motion.div
            key="board"
            {...MODE_TRANSITION}
            className="relative grid min-h-0 flex-1 grid-cols-[48px_1fr_288px] min-[1440px]:grid-cols-[248px_56px_1fr_320px] min-[1920px]:grid-cols-[280px_56px_1fr_360px]"
          >
            <div
              id="line-list"
              className={cn(
                'min-h-0 border-r border-line bg-surface-1',
                // kompakt: als Overlay links, über L oder den Knopf am Board
                'max-[1439px]:absolute max-[1439px]:inset-y-0 max-[1439px]:left-0 max-[1439px]:z-40 max-[1439px]:w-[280px] max-[1439px]:shadow-[18px_0_40px_rgb(0_0_0/0.45)]',
                !linesOpen && 'max-[1439px]:hidden'
              )}
            >
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
                    ? new Set(
                        stress.hits.filter((h) => h.staple === railHover).map((h) => h.stepId)
                      )
                    : undefined
                }
                onDropStaple={(name, nodeId) => dropStaple(name, nodeId)}
                endCountOf={endCountOf}
                pairCountOf={
                  stressOn && pairsOn
                    ? (nodeId) => stress.pairsIn(lineThrough(nodes, nodeId))
                    : undefined
                }
                onCompare={ends.length > 1 ? () => setComparing(true) : undefined}
                onOpen={(id) => {
                  select(id);
                  setEditOpen(true);
                }}
                onPromote={promote}
                warningTextOf={(id) => allWarnings(id).join('\n')}
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
              <Button
                variant="line"
                size="sm"
                onClick={() => setLinesOpen((open) => !open)}
                aria-expanded={linesOpen}
                aria-controls="line-list"
                className="absolute left-3 top-3 z-20 bg-surface-1 min-[1440px]:hidden"
              >
                <ListTree />
                {t('workbench.lines')}
                <Kbd>L</Kbd>
              </Button>
              {/* Immer nur ein Hinweis, in einer eigenen Zeile über dem Board statt darüber */}
              {stressOn && !hints.seen('stress') ? (
                <div className="flex justify-end px-3 pt-3">
                  <OneTimeHint id="stress" arrow="up" className="max-w-80">
                    {t('hints.stress')}
                  </OneTimeHint>
                </div>
              ) : (
                !hints.seen('staple-rail') && (
                  <div className="flex px-3 pt-3 max-[1439px]:pl-32">
                    <OneTimeHint id="staple-rail" className="max-w-80">
                      {t('hints.stapleRail')}
                    </OneTimeHint>
                  </div>
                )
              )}
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
                  inspectedId={inspectedId ?? pickedCard}
                  onInspect={inspect}
                  onDrop={playing ? undefined : handleDrop}
                  describeDrop={describeDrop}
                  onCardClick={handleCardClick}
                  onEmptyZone={playing ? undefined : (target) => openTokenPicker(target)}
                  negatedLinks={negatedLinks}
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
                      ((prompt.kind === 'result' || prompt.kind === 'target') &&
                        prompt.spec.count > 1),
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
                hint={hint}
                playing={playing}
                onPlay={togglePlay}
                speed={settings.autoplaySpeed}
                onSpeed={(autoplaySpeed) => updateSettings({ autoplaySpeed })}
                branches={steps[position - 1]?.branches ?? []}
                onBranch={select}
              />
              {tokenTarget && (
                <PickList
                  items={(tokens ?? []).map((c) => ({
                    id: c.id,
                    label: displayName(c, cardLanguage),
                    image: c.imageSmall,
                    keywords: [c.name, c.nameDe ?? ''],
                  }))}
                  max={12}
                  placeholder={t('workbench.tokenPick')}
                  hint={t('workbench.tokenHint')}
                  onPick={(cardId) => {
                    const card = tokens?.find((c) => c.id === cardId);
                    if (card) registerCard(card);
                    flow.play({
                      kind: 'token',
                      cardId,
                      player: tokenTarget.player,
                      slot: tokenTarget.slot,
                    });
                    setTokenTarget(null);
                  }}
                  onClose={() => setTokenTarget(null)}
                />
              )}
              {staplePicker && (
                <PickList
                  items={[...stress.chosen]
                    .sort(
                      (a, b) => Number(hitsHere(b.staple.name)) - Number(hitsHere(a.staple.name))
                    )
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
                onOpenCard={(cardId) => cardSheet.open(cardId, updateCardEffects)}
                onClose={() => setMenu(null)}
              />
            </div>
            <div
              className="min-h-0 border-l border-line bg-surface-1"
              onMouseEnter={() => inspectedId && inspect(inspectedId)}
              onMouseLeave={() => inspect(null)}
            >
              <Inspector
                state={after}
                cards={cards}
                inspected={inspected}
                highlight={chokeHover?.phrase}
                onOpenCard={(cardId) => cardSheet.open(cardId, updateCardEffects)}
              >
                {stepPanel}
              </Inspector>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="tree"
            {...MODE_TRANSITION}
            className="relative grid min-h-0 flex-1 grid-cols-[1fr_320px]"
          >
            <OneTimeHint id="tree" className="absolute left-4 top-4">
              {t('hints.tree')}
            </OneTimeHint>
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
          </motion.div>
        )}
      </AnimatePresence>
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
      return t(
        prompt.key === 'costMoves' ? 'workbench.prompt.discard' : 'workbench.prompt.discardEffect'
      );
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
    case 'target':
      return t('workbench.prompt.target', { count: prompt.spec.count });
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
