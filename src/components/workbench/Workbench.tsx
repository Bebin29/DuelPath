'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { useHistory } from '@/lib/hooks/use-history';
import {
  initialState,
  pathTo,
  statesForTree,
  warningsOf,
  type ComboNodeData,
  type GameState,
  type NodeKind,
  type Player,
  type StartState,
  type Zone,
} from '@/lib/combo/state';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import { START_ID, newNode, removeSubtree, updateNode } from '@/lib/combo/tree';
import { childrenOf, lineSteps, lineThrough, nextRank, rootAlternatives } from '@/lib/combo/lines';
import { reactionNode, type Staple } from '@/lib/combo/reactions';
import { candidateEffects, toSuggestionInput, type Candidate } from '@/lib/combo/suggestions';
import { saveCombo, type LoadedCombo, type StapleCard } from '@/server/actions/combo.actions';
import { NodeEditor, StartStateEditor, type MoveTarget } from '@/components/combo/NodeEditor';
import { SuggestionPanel } from '@/components/combo/SuggestionPanel';
import { BoardView, type BoardMove } from './BoardView';
import { Inspector } from './Inspector';
import { LineList } from './LineList';
import { StepBar } from './StepBar';
import { TreeCanvas } from './TreeCanvas';
import { WorkbenchHeader, type SaveStatus, type WorkbenchMode } from './WorkbenchHeader';
import { nodeCardId, stepLabel } from './step-label';

interface Doc {
  title: string;
  deckId: string | null;
  startState: StartState;
  nodes: ComboNodeData[];
}

const FIELD_ZONES: Zone[] = ['MONSTER', 'SPELL_TRAP', 'FIELD'];

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
    startState: initial.startState,
    nodes: initial.nodes,
  });
  const { title, deckId, startState, nodes } = history.state;
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
      const result = await saveCombo(initial.id, { title, deckId, startState, nodes });
      setStatus(result.error ? 'error' : 'saved');
    }, 800);
    return () => clearTimeout(timer);
  }, [initial.id, title, deckId, startState, nodes, saveAttempt]);

  // Modus und Schritt stehen in der Adresse (UX-Plan 5): Neuladen landet an derselben Stelle
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('view', mode);
    if (selected) url.searchParams.set('step', selected.id);
    else url.searchParams.delete('step');
    window.history.replaceState(null, '', url);
  }, [mode, selected]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setInspectedId(null);
  }, []);

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

  /** Karte auf dem Board in eine Zone gezogen; im Startzustand direkt, sonst als Bewegung des Schritts */
  const handleMove = ({ instanceId, zone: to, player, slot }: BoardMove) => {
    const onField = FIELD_ZONES.includes(to);
    if (!selected) {
      setDoc((d) => ({
        ...d,
        startState: {
          cards: d.startState.cards.map((c) =>
            c.instanceId === instanceId
              ? {
                  ...c,
                  zone: to,
                  slot: onField ? slot : undefined,
                  controller: onField ? player : undefined,
                }
              : c
          ),
        },
      }));
      return;
    }
    if (selected.kind !== 'ACTION' && selected.kind !== 'ACTIVATE') return;
    const card = after.cards[instanceId];
    if (!card) return;
    const key = selected.kind === 'ACTIVATE' ? moveTarget : 'resolveMoves';
    const move = {
      instanceId,
      cardId: card.cardId,
      from: card.zone,
      to,
      ...(onField && slot !== undefined && { slot }),
      ...(onField && player !== card.owner && { controller: player }),
      ...(to === 'MONSTER' && { position: 'ATK' as const }),
    };
    setNodes((prev) => updateNode(prev, selected.id, { [key]: [...(selected[key] ?? []), move] }));
  };

  const goTo = useCallback(
    (pos: number) => {
      if (pos <= 0) select(START_ID);
      else if (steps[pos - 1]) select(steps[pos - 1].node.id);
    },
    [select, steps]
  );

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
  }, [undo, redo, goTo, position, steps, select, ancestors, selected, nodes]);

  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inspect = (id: string | null) => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    if (id) setInspectedId(id);
    else leaveTimer.current = setTimeout(() => setInspectedId(null), 300);
  };
  const inspected = inspectedId ? (after.cards[inspectedId] ?? null) : null;

  const stepPanel = selected ? (
    <>
      <header>
        <p className="font-mono text-2xs text-text-subtle">
          {t('workbench.step', { n: position })}
        </p>
        <h2 className="font-display text-2xl leading-tight">{labelOf(selected)}</h2>
      </header>
      {warningsOf(after, selected.id).length > 0 && (
        <ul className="flex flex-col gap-1 rounded-md border border-warning/40 bg-warning-tint p-2.5 text-xs text-warning">
          {warningsOf(after, selected.id).map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
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
      <details open className="group">
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
      />

      {mode === 'board' ? (
        <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr_320px]">
          <div className="min-h-0 border-r border-line bg-surface-1">
            <LineList
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
          <div className="flex min-h-0 min-w-0 flex-col" onMouseLeave={() => inspect(null)}>
            <div className="min-h-0 flex-1">
              <BoardView
                state={after}
                cards={cards}
                changed={changed}
                inspectedId={inspectedId}
                onInspect={inspect}
                onMove={handleMove}
              />
            </div>
            <StepBar
              position={position}
              total={steps.length}
              chainLength={after.chain.length}
              onPrev={() => goTo(position - 1)}
              onNext={() => goTo(position + 1)}
              onAdd={addChild}
            />
          </div>
          <div className="min-h-0 border-l border-line bg-surface-1">
            <Inspector state={after} cards={cards} inspected={inspected}>
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
