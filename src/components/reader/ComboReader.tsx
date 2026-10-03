'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Timer,
} from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage, useSettings } from '@/components/providers/SettingsProvider';
import { useCardSheet } from '@/components/cards/CardSheet';
import { EASE } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SaveIndicator, type SaveStatus } from '@/components/ui/save-indicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { initialState, statesForTree, type ComboNodeData, type GameState } from '@/lib/combo/state';
import { lineSteps, lineThrough } from '@/lib/combo/lines';
import { endboardSummary, lineEnds } from '@/lib/combo/endboard';
import { formatDuration, lineStepCount, paceOf, practiceClock } from '@/lib/combo/timing';
import { useStopwatch } from '@/lib/hooks/use-stopwatch';
import { updateNode } from '@/lib/combo/tree';
import { usedOptNames } from '@/lib/combo/opt-names';
import { displayName } from '@/lib/combo/cards';
import type { ComboStatus } from '@/lib/combo/library';
import { saveCombo, type LoadedCombo, type StapleCard } from '@/server/actions/combo.actions';
import { MetaMenu } from '@/components/workbench/WorkbenchHeader';
import { EndboardSummary } from '@/components/workbench/EndboardSummary';
import { stepLabel } from '@/components/workbench/step-label';
import { useStress } from '@/components/workbench/use-stress';
import { ReadBoard } from './ReadBoard';

/** Karten, die im Schritt ihren Ort gewechselt haben; wie in der Workbench */
function changedCards(before: GameState, after: GameState): Set<string> {
  const changed = new Set<string>();
  for (const [id, card] of Object.entries(after.cards)) {
    const prev = before.cards[id];
    if (
      !prev ||
      prev.zone !== card.zone ||
      prev.slot !== card.slot ||
      prev.position !== card.position
    )
      changed.add(id);
  }
  return changed;
}

/**
 * Lese- und Nachspielansicht unter 1024 px (UI-Sweep-Plan 4.2): Line wählen, Schritt für Schritt
 * durchgehen oder abspielen, am Ende Endboard und Schwachstellen. Bearbeiten lassen sich hier
 * nur Notiz, Status und Tags; Schritte bleiben der Workbench ab 1024 px vorbehalten.
 */
export function ComboReader({
  initial,
  staples,
  initialStep,
}: {
  initial: LoadedCombo;
  staples: StapleCard[];
  initialStep?: string;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const { settings } = useSettings();
  const cardSheet = useCardSheet();
  const [doc, setDoc] = useState({
    title: initial.title,
    deckId: initial.deckId,
    tags: initial.tags,
    status: initial.status,
    startState: initial.startState,
    nodes: initial.nodes,
  });
  const { nodes, startState } = doc;
  const cards = useMemo(() => new Map(initial.cards.map((c) => [c.id, c])), [initial.cards]);
  const states = useMemo(() => statesForTree(nodes, startState, cards), [nodes, startState, cards]);
  const start = useMemo(() => initialState(startState), [startState]);
  const labelOf = useCallback(
    (n: ComboNodeData) =>
      stepLabel(n, cards, cardLanguage, states.get(n.id), (k) => t(`combo.kind.${k}`)),
    [cards, cardLanguage, states, t]
  );

  // Line: Ende der gewählten Line; ein Schritt aus der Adresse gibt sie beim Öffnen vor
  const ends = useMemo(() => lineEnds(nodes), [nodes]);
  const [leafId, setLeafId] = useState<string | null>(() => {
    const line = lineThrough(initial.nodes, initialStep ?? null);
    return line.at(-1)?.id ?? null;
  });
  const line = useMemo(() => lineThrough(nodes, leafId), [nodes, leafId]);
  const steps = useMemo(() => lineSteps(nodes, line, labelOf), [nodes, line, labelOf]);
  const [position, setPosition] = useState(() => {
    const i = lineSteps(
      initial.nodes,
      lineThrough(initial.nodes, initialStep ?? null),
      () => ''
    ).findIndex((s) => s.node.id === initialStep);
    return i >= 0 ? i + 1 : 0;
  });
  const current = position > 0 ? steps[position - 1] : undefined;
  const node = current?.node;
  const after = (node && states.get(node.id)) || start;
  const before = (node?.parentId && states.get(node.parentId)) || start;
  const changed = useMemo(
    () => (node ? changedCards(before, after) : new Set<string>()),
    [node, before, after]
  );
  const lineName = (branches: ComboNodeData[]) =>
    branches.length
      ? `${t('workbench.branch')} · ${branches.map((b) => b.edgeLabel || labelOf(b)).join(' · ')}`
      : t('workbench.mainLine');
  const currentEnd = ends.find((e) => e.leaf.id === line.at(-1)?.id);

  // Stresstest der Line: Treffer am Schritt und Schwachstellen fürs Endboard
  const stress = useStress({ line, steps, states, start, cards, staples });
  const hitsHere = node ? (stress.byStep.get(node.id) ?? []) : [];
  const isEnd = Boolean(node && position === steps.length && after.chain.length === 0);
  const summary = useMemo(
    () => (isEnd && node ? endboardSummary(after, start, cards, node.interruptions) : null),
    [isEnd, node, after, start, cards]
  );

  // Schritt in der Adresse wie in der Workbench: ein geteilter Link landet an derselben Stelle
  useEffect(() => {
    const url = new URL(window.location.href);
    if (node) url.searchParams.set('step', node.id);
    else url.searchParams.delete('step');
    window.history.replaceState(null, '', url);
  }, [node]);

  const goTo = useCallback(
    (pos: number) => setPosition(Math.max(0, Math.min(steps.length, pos))),
    [steps.length]
  );
  const [playing, setPlaying] = useState(false);
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

  // Übungsmodus: die Uhr läuft, solange jemand die Line selbst durchgeht. Beim Abspielen gibt die
  // App das Tempo vor, am Ende der Line ist die Messung fertig, und die Starthand setzt zurück.
  const clock = useStopwatch();
  const { reset: resetClock, setRunning: setClockRunning } = clock;
  const phase = practiceClock(position, steps.length, playing);
  useEffect(() => {
    if (phase === 'reset') resetClock();
    else setClockRunning(phase === 'run');
  }, [phase, resetClock, setClockRunning]);
  const pace = paceOf(clock.ms);

  // Wischen wechselt Schritte
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => (swipe.current = { x: e.clientX, y: e.clientY });
  const onPointerUp = (e: React.PointerEvent) => {
    const from = swipe.current;
    swipe.current = null;
    if (!from) return;
    const dx = e.clientX - from.x;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(e.clientY - from.y) * 1.5) return;
    setPlaying(false);
    goTo(position + (dx < 0 ? 1 : -1));
  };

  // Automatisch speichern wie in der Workbench, mit Revision gegen stilles Überschreiben
  const [status, setStatus] = useState<SaveStatus>('saved');
  const revision = useRef(initial.revision);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      setStatus('saving');
      const result = await saveCombo(initial.id, doc, revision.current);
      if (result.data) revision.current = result.data.revision;
      setStatus(result.data ? 'saved' : result.error === 'CONFLICT' ? 'conflict' : 'error');
    }, 800);
    return () => clearTimeout(timer);
  }, [initial.id, doc]);
  const patchNode = (id: string, patch: Partial<ComboNodeData>) =>
    setDoc((d) => ({ ...d, nodes: updateNode(d.nodes, id, patch) }));

  const [noteOpen, setNoteOpen] = useState(false);
  const chainNames = after.chain.map((link, i) => ({
    n: i + 1,
    name: link.cardId ? displayName(cards.get(link.cardId), cardLanguage) : '?',
    opponent: link.player === 'opponent',
  }));

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface-1 px-2">
        <Button asChild variant="ghost" size="icon" aria-label={t('reader.back')}>
          <Link href="/combos">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 truncate font-display text-xl leading-none">{doc.title}</h1>
        {/* Gebrauchte Zeit: Klick hält die Uhr an und lässt sie weiterlaufen */}
        <button
          type="button"
          disabled={position === 0}
          onClick={() => setClockRunning(!clock.running)}
          aria-label={t(clock.running ? 'reader.timerPause' : 'reader.timerResume')}
          title={t('reader.timerHint')}
          className={cn(
            'flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-1 font-mono text-sm tabular-nums',
            'disabled:pointer-events-none disabled:opacity-40',
            pace === 'slow'
              ? 'text-opponent'
              : pace === 'warn'
                ? 'text-warning'
                : 'text-text-muted hover:text-ink',
            !clock.running && position > 0 && 'opacity-60'
          )}
        >
          <Timer aria-hidden className="size-3.5" />
          {formatDuration(clock.ms)}
        </button>
        <MetaMenu
          status={doc.status}
          onStatus={(value: ComboStatus) => setDoc((d) => ({ ...d, status: value }))}
          tags={doc.tags}
          onTags={(value) => setDoc((d) => ({ ...d, tags: value }))}
        />
        <SaveIndicator
          status={status}
          onRetry={() => setDoc((d) => ({ ...d }))}
          className="hidden w-20 sm:flex"
        />
      </header>

      <div
        className="min-h-0 flex-1 overflow-y-auto"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-4">
          {/* Line wählen */}
          {ends.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="line" className="justify-between self-start">
                  <span className="truncate">{lineName(currentEnd?.branches ?? [])}</span>
                  <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuRadioGroup
                  value={currentEnd?.leaf.id ?? ''}
                  onValueChange={(id) => {
                    setLeafId(id);
                    setPlaying(false);
                    resetClock();
                    // Am gemeinsamen Anfang bleiben, sonst zur Starthand
                    const next = lineSteps(nodes, lineThrough(nodes, id), () => '');
                    setPosition((p) => (next[p - 1]?.node.id === node?.id ? p : 0));
                  }}
                >
                  {ends.map((e) => (
                    <DropdownMenuRadioItem key={e.leaf.id} value={e.leaf.id}>
                      <span className="min-w-0 flex-1 truncate">{lineName(e.branches)}</span>
                      <span
                        className="ml-2 shrink-0 font-mono text-2xs text-text-subtle"
                        title={t('workbench.stepsHint')}
                      >
                        {t('workbench.stepsInLine', { count: lineStepCount(nodes, e.leaf.id) })}
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <p className="font-mono text-2xs text-text-subtle">{t('workbench.mainLine')}</p>
          )}

          {/* Der aktuelle Schritt */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={node?.id ?? 'start'}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18, ease: EASE.out }}
              aria-live="polite"
              className="flex flex-col gap-1.5"
            >
              <p className="font-mono text-2xs text-text-subtle">
                {t('reader.position', { n: position, total: steps.length })}
              </p>
              <h2
                className={cn(
                  'font-display text-3xl leading-tight',
                  node?.player === 'opponent' && 'text-opponent'
                )}
              >
                {node ? labelOf(node) : t('workbench.startHand')}
              </h2>
              {hitsHere.length > 0 && (
                <p className="text-xs text-opponent">
                  {t('reader.stops', {
                    staples: [...new Set(hitsHere.map((h) => stress.shortOf(h.staple)))].join(
                      ' · '
                    ),
                  })}
                </p>
              )}
              {node &&
                (noteOpen ? (
                  <textarea
                    autoFocus
                    value={node.note ?? ''}
                    onChange={(e) => patchNode(node.id, { note: e.target.value || null })}
                    onBlur={() => setNoteOpen(false)}
                    placeholder={t('reader.notePlaceholder')}
                    aria-label={t('reader.note')}
                    rows={3}
                    className="rounded-md border border-line bg-surface-1 p-2.5 text-base outline-none focus:border-line-strong"
                  />
                ) : node.note ? (
                  <button
                    type="button"
                    onClick={() => setNoteOpen(true)}
                    className="whitespace-pre-line rounded-md text-left text-text-muted hover:text-ink"
                  >
                    {node.note}
                  </button>
                ) : (
                  <Button
                    variant="text"
                    size="sm"
                    className="self-start text-text-muted"
                    onClick={() => setNoteOpen(true)}
                  >
                    {t('reader.noteAdd')}
                  </Button>
                ))}
            </motion.section>
          </AnimatePresence>

          <ReadBoard
            state={after}
            cards={cards}
            changed={changed}
            onCard={(cardId) => void cardSheet.open(cardId)}
          />

          {chainNames.length > 0 && (
            <section aria-label={t('workbench.chain')} className="flex flex-col gap-1">
              <h3 className="font-display text-lg">{t('workbench.chain')}</h3>
              <ol className="flex flex-col gap-1">
                {[...chainNames].reverse().map((l) => (
                  <li
                    key={l.n}
                    className={cn(
                      'flex items-center gap-2 rounded-sm border px-2 py-1.5 text-sm',
                      l.opponent ? 'border-opponent/50 text-opponent' : 'border-line'
                    )}
                  >
                    <span className="font-mono text-2xs text-text-subtle">CL{l.n}</span>
                    {l.name}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {summary && node && (
            <EndboardSummary
              summary={summary}
              cards={cards}
              hopts={usedOptNames(after, cards, cardLanguage).length}
              weaknesses={stress.weaknesses}
              onCount={(instanceId, count) =>
                patchNode(node.id, {
                  interruptions: { ...node.interruptions, [instanceId]: count },
                })
              }
              showTitle={node.kind !== 'END'}
            />
          )}

          {/* Am Ende der Line: was das Durchspielen gekostet hat */}
          {summary && clock.ms > 0 && (
            <p
              className={cn(
                'font-mono text-2xs',
                pace === 'slow' ? 'text-opponent' : 'text-text-subtle'
              )}
            >
              {t('reader.timeTaken', {
                time: formatDuration(clock.ms),
                count: steps.length,
              })}
              {pace === 'slow' && ` · ${t('reader.slowPlay')}`}
            </p>
          )}

          <p className="pb-2 text-xs text-text-subtle">{t('reader.editHint')}</p>
        </div>
      </div>

      {/* Bedienung in der Daumenzone */}
      <nav
        aria-label={t('reader.controls')}
        className="grid shrink-0 grid-cols-3 items-center border-t border-line bg-surface-1 px-2 pb-[env(safe-area-inset-bottom)]"
      >
        <Button
          variant="ghost"
          className="h-14 justify-start"
          disabled={position === 0}
          onClick={() => {
            setPlaying(false);
            goTo(position - 1);
          }}
        >
          <ChevronLeft />
          {t('reader.prev')}
        </Button>
        <Button
          variant="ghost"
          className="h-14"
          onClick={togglePlay}
          aria-label={playing ? t('reader.pause') : t('reader.play')}
        >
          {playing ? <Pause /> : <Play />}
        </Button>
        <Button
          variant="ghost"
          className="h-14 justify-end"
          disabled={position >= steps.length}
          onClick={() => {
            setPlaying(false);
            goTo(position + 1);
          }}
        >
          {t('reader.next')}
          <ChevronRight />
        </Button>
      </nav>
    </div>
  );
}
