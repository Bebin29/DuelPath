'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n/hooks';
import {
  initialState,
  pathTo,
  statesForTree,
  warningsOf,
  type ComboNodeData,
  type NodeKind,
  type Player,
  type StartState,
  type Zone,
} from '@/lib/combo/state';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import { START_ID, newNode, removeSubtree, updateNode } from '@/lib/combo/tree';
import { reactionNode, type Staple } from '@/lib/combo/reactions';
import { candidateEffects, toSuggestionInput, type Candidate } from '@/lib/combo/suggestions';
import { saveCombo, type LoadedCombo, type StapleCard } from '@/server/actions/combo.actions';
import { ComboCanvas } from './ComboCanvas';
import { NodeEditor, StartStateEditor, type MoveTarget } from './NodeEditor';
import { StatePanel } from './StatePanel';
import { SuggestionPanel } from './SuggestionPanel';

type SaveStatus = 'saved' | 'saving' | 'error';

const FIELD_ZONES: Zone[] = ['MONSTER', 'SPELL_TRAP', 'FIELD'];

export function ComboEditor({
  initial,
  staples,
  decks,
}: {
  initial: LoadedCombo;
  staples: StapleCard[];
  decks: { id: string; name: string }[];
}) {
  const { t, i18n } = useTranslation();
  const [title, setTitle] = useState(initial.title);
  const [deckId, setDeckId] = useState<string | null>(initial.deckId);
  const [startState, setStartState] = useState<StartState>(initial.startState);
  const [nodes, setNodes] = useState<ComboNodeData[]>(initial.nodes);
  const [cards, setCards] = useState(() => new Map(initial.cards.map((c) => [c.id, c])));
  const [selectedId, setSelectedId] = useState(START_ID);
  const [moveTarget, setMoveTarget] = useState<MoveTarget>('resolveMoves');
  const [status, setStatus] = useState<SaveStatus>('saved');

  const states = useMemo(() => statesForTree(nodes, startState, cards), [nodes, startState, cards]);
  const start = useMemo(() => initialState(startState), [startState]);
  const selected = nodes.find((n) => n.id === selectedId);
  const ancestors = selected ? pathTo(nodes, selected.id).slice(0, -1) : [];
  const parentId = ancestors.at(-1)?.id;
  const before = (parentId && states.get(parentId)) || start;
  const after = (selected && states.get(selected.id)) || start;

  // Vorschläge für den nächsten Schritt: am Gegner-Knoten für den Gegner, sonst für den eigenen Zug
  const actor: Player = selected?.kind === 'OPPONENT' ? 'opponent' : 'self';
  const candidates = useMemo(() => candidateEffects(after, actor, cards), [after, actor, cards]);
  const suggestionInput = useMemo(() => toSuggestionInput(after, candidates), [after, candidates]);

  // Automatisch speichern, kurz nach der letzten Änderung
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
  }, [initial.id, title, deckId, startState, nodes]);

  const registerCard = (card: ComboCard) =>
    setCards((prev) => (prev.has(card.id) ? prev : new Map(prev).set(card.id, card)));

  const addChild = (kind: NodeKind) => {
    const child = newNode(selected ?? null, kind);
    setNodes((prev) => [...prev, child]);
    setSelectedId(child.id);
    setMoveTarget(kind === 'ACTIVATE' ? 'costMoves' : 'resolveMoves');
  };

  /** Reaktion als neuer Aktivierungs-Knoten unter dem gewählten Knoten */
  const addReaction = (card: ComboCard, staple: Staple | null) => {
    if (!selected) return;
    registerCard(card);
    // Unter einem Gegner-Knoten reagiert der Gegner, unter einer gegnerischen Aktivierung die eigene Seite
    const player: Player = selected.kind === 'OPPONENT' ? 'opponent' : 'self';
    const child = {
      ...reactionNode(selected, card, staple, player, after, [...ancestors, selected]),
      edgeLabel: displayName(card, i18n.language),
    };
    setNodes((prev) => [...prev, child]);
    setSelectedId(child.id);
    setMoveTarget('costMoves');
  };

  const addSuggestion = (candidate: Candidate) => {
    const child = {
      ...newNode(selected ?? null, 'ACTIVATE'),
      player: candidate.player,
      instanceId: candidate.instanceId,
      cardId: candidate.cardId,
      effectIndex: candidate.effectIndex,
    };
    setNodes((prev) => [...prev, child]);
    setSelectedId(child.id);
    setMoveTarget('costMoves');
  };

  const handleDrop = (instanceId: string, to: Zone, player: Player) => {
    const onField = FIELD_ZONES.includes(to);
    if (!selected) {
      // Im Startzustand wird die Karte direkt verschoben
      setStartState((prev) => ({
        cards: prev.cards.map((c) =>
          c.instanceId === instanceId
            ? { ...c, zone: to, controller: onField ? player : undefined }
            : c
        ),
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
      ...(onField && player !== card.owner && { controller: player }),
      ...(to === 'MONSTER' && { position: 'ATK' as const }),
    };
    setNodes((prev) => updateNode(prev, selected.id, { [key]: [...(selected[key] ?? []), move] }));
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-2">
      <div className="flex items-center gap-3">
        <Link
          href="/combos"
          className="text-muted-foreground hover:text-foreground"
          title={t('combo.back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="max-w-md text-lg font-semibold"
        />
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={deckId ?? ''}
          onChange={(e) => setDeckId(e.target.value || null)}
          title={t('combo.deck.label')}
        >
          <option value="">{t('combo.deck.none')}</option>
          {decks.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <span
          className={
            status === 'error' ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'
          }
        >
          {t(`combo.${status === 'error' ? 'saveError' : status}`)}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_440px] gap-3">
        <div className="min-h-0 rounded-lg border">
          <ComboCanvas
            nodes={nodes}
            states={states}
            cards={cards}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        <aside className="min-h-0 space-y-4 overflow-y-auto rounded-lg border p-3">
          {selected ? (
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
                setSelectedId(parentId ?? START_ID);
              }}
              onRegisterCard={registerCard}
              staples={staples}
              onReact={addReaction}
            />
          ) : (
            <StartStateEditor
              startState={startState}
              cards={cards}
              onChange={setStartState}
              onAddChild={addChild}
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

          <div className="border-t pt-3">
            <h2 className="mb-2 font-semibold">{t('combo.state.title')}</h2>
            <StatePanel
              state={selected ? after : start}
              cards={cards}
              warnings={selected ? warningsOf(after, selected.id) : []}
              onDrop={handleDrop}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
