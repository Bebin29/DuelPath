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
} from '@/lib/combo/state';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import { START_ID, newNode, removeSubtree, updateNode } from '@/lib/combo/tree';
import { childrenOf, lineSteps, lineThrough, nextRank, rootAlternatives } from '@/lib/combo/lines';
import { reactionNode, type Staple } from '@/lib/combo/reactions';
import { candidateEffects, toSuggestionInput, type Candidate } from '@/lib/combo/suggestions';
import { dropMeaning, type DropTarget } from '@/lib/combo/play';
import { saveCombo, type LoadedCombo, type StapleCard } from '@/server/actions/combo.actions';
import { NodeEditor, StartStateEditor, type MoveTarget } from '@/components/combo/NodeEditor';
import { SuggestionPanel } from '@/components/combo/SuggestionPanel';
import { BoardView } from './BoardView';
import { CardMenu, type MenuAnchor } from './CardMenu';
import { cardActions } from './card-actions';
import { QuickSelect } from './QuickSelect';
import { usePlay, type Prompt } from './use-play';
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
      if (key === 'O' && selected) {
        addChild('OPPONENT');
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
      <details className="group">
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
          <div
            className="relative flex min-h-0 min-w-0 flex-col"
            onMouseLeave={() => inspect(null)}
          >
            <div className="min-h-0 flex-1">
              <BoardView
                state={after}
                cards={cards}
                changed={changed}
                inspectedId={inspectedId}
                onInspect={inspect}
                onDrop={handleDrop}
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
              onOpponent={() => addChild('OPPONENT')}
              triggers={flow.triggers}
              onTrigger={(offer) =>
                flow.play({
                  kind: 'activate',
                  instanceId: offer.instanceId,
                  effectIndex: offer.effectIndex,
                })
              }
              offer={Boolean(flow.offer)}
              onInsert={() => flow.accept('insert')}
              onReplace={() => flow.accept('replace')}
              onDismissOffer={flow.dismissOffer}
              onAdd={addChild}
            />
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
