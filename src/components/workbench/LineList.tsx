'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpToLine, Columns3, GitBranch, StickyNote, TriangleAlert } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';
import { CardView } from '@/components/cards/CardView';
import type { LineStep } from '@/lib/combo/lines';
import type { ComboNodeData } from '@/lib/combo/state';
import type { ComboCard } from '@/lib/combo/cards';
import type { Hit } from '@/lib/combo/stress';
import { Button } from '@/components/ui/button';
import { STAPLE_MIME } from './StapleRail';

/** Choke Points der Line und was sie in der Liste auslösen (UX-Plan 6.8) */
export interface LineChokes {
  byStep: Map<string, Hit[]>;
  /** Neu, wenn der Stresstest startet; die Chips erscheinen dann der Reihe nach */
  run: number;
  imageOf: (staple: string) => string | null;
  describe: (hit: Hit) => string;
  onPick: (hit: Hit) => void;
  onHover: (hit: Hit | null) => void;
  /** Rechtsklick: Treffer an diesem Schritt dauerhaft entfernen */
  onDismiss: (hit: Hit) => void;
}

interface LineListProps {
  title: string;
  steps: LineStep[];
  selectedId: string;
  startSelected: boolean;
  alternatives: ComboNodeData[];
  cards: Map<string, ComboCard>;
  labelOf: (node: ComboNodeData) => string;
  cardOf: (node: ComboNodeData) => string | null;
  warningsOf: (nodeId: string) => number;
  onSelect: (id: string) => void;
  onSelectStart: () => void;
  chokes?: LineChokes | null;
  /** Schritte, die der überfahrene Staple trifft (roter Punkt) */
  marked?: Set<string>;
  /** Staple aus der Leiste auf einen Schritt gezogen; null = Starthand */
  onDropStaple?: (staple: string, nodeId: string | null) => void;
  /** Unterbrechungen am Ende eines Branches */
  endCountOf?: (nodeId: string) => number | null;
  /** Paar-Modus: zweite Unterbrechungen im Branch */
  pairCountOf?: (nodeId: string) => number;
  onCompare?: () => void;
  /** Doppelklick: Schritt im Inspector bearbeiten (UX-Plan 6.6) */
  onOpen?: (id: string) => void;
  /** Branch zur Hauptline machen (UX-Plan 6.7) */
  onPromote?: (nodeId: string) => void;
  /** Gründe der Warnungen für den Tooltip */
  warningTextOf?: (nodeId: string) => string;
}

/**
 * Line-Liste (UI-Plan 7.2.1): die Line so, wie Spieler sie aufschreiben.
 * Chains eingerückt mit violetter Linie, gegnerische Schritte mit roter Kante, Branches unter ihrem Schritt.
 */
export function LineList({
  title,
  steps,
  selectedId,
  startSelected,
  alternatives,
  cards,
  labelOf,
  cardOf,
  warningsOf,
  onSelect,
  onSelectStart,
  chokes,
  marked,
  onDropStaple,
  endCountOf,
  pairCountOf,
  onCompare,
  onOpen,
  onPromote,
  warningTextOf,
}: LineListProps) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLOListElement>(null);
  const [dropOn, setDropOn] = useState<string | null>(null);

  // Staples aus der Leiste landen auf einem Schritt; Zeilen heben sich beim Überfahren hervor
  const dropTarget = (key: string, nodeId: string | null) =>
    onDropStaple
      ? {
          onDragOver: (e: React.DragEvent) => {
            if (!e.dataTransfer.types.includes(STAPLE_MIME)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            setDropOn(key);
          },
          onDragLeave: () => setDropOn((k) => (k === key ? null : k)),
          onDrop: (e: React.DragEvent) => {
            const staple = e.dataTransfer.getData(STAPLE_MIME);
            setDropOn(null);
            if (!staple) return;
            e.preventDefault();
            onDropStaple(staple, nodeId);
          },
        }
      : {};

  // Der gewählte Schritt bleibt immer sichtbar
  useEffect(() => {
    listRef.current?.querySelector('[aria-current="step"]')?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  /**
   * Tastatur im Baum (UI-Plan 7.2.1, ARIA tree): ↑ ↓ bewegen den Fokus, → springt in den ersten
   * Branch eines Schritts, ← zurück zum Schritt, Home und End an Anfang und Ende. Enter wählt.
   */
  const treeKeys = (e: React.KeyboardEvent<HTMLOListElement>) => {
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]') ?? [])];
    const current = document.activeElement as HTMLElement | null;
    const i = current ? items.indexOf(current) : -1;
    if (i < 0) return;
    const level = (el: HTMLElement | undefined) => Number(el?.getAttribute('aria-level') ?? 1);
    let next: HTMLElement | undefined;
    if (e.key === 'ArrowDown') next = items[i + 1];
    else if (e.key === 'ArrowUp') next = items[i - 1];
    else if (e.key === 'Home') next = items[0];
    else if (e.key === 'End') next = items.at(-1);
    else if (e.key === 'ArrowRight' && level(items[i + 1]) > level(current!)) next = items[i + 1];
    else if (e.key === 'ArrowLeft' && level(current!) > 1)
      next = items
        .slice(0, i)
        .reverse()
        .find((el) => level(el) === 1);
    else return;
    e.preventDefault();
    e.stopPropagation();
    if (!next) return;
    for (const el of items) el.tabIndex = -1;
    next.tabIndex = 0;
    next.focus();
  };

  const image = (node: ComboNodeData) => {
    const id = cardOf(node);
    return id ? (cards.get(id)?.imageSmall ?? null) : null;
  };

  return (
    <nav aria-label={t('workbench.lines')} className="flex h-full min-h-0 flex-col">
      <div className="flex items-end gap-2 px-4 pb-2 pt-3">
        <h2 className="flex-1 truncate font-display text-lg leading-tight">{title}</h2>
        {onCompare && (
          <Button variant="text" size="sm" onClick={onCompare} className="-mr-2">
            <Columns3 />
            {t('stress.compare')}
          </Button>
        )}
      </div>
      <ol
        ref={listRef}
        role="tree"
        aria-label={title}
        onKeyDown={treeKeys}
        className="min-h-0 flex-1 overflow-y-auto pb-4"
      >
        <li role="none">
          <button
            role="treeitem"
            aria-level={1}
            aria-selected={startSelected}
            tabIndex={startSelected ? 0 : -1}
            type="button"
            aria-current={startSelected ? 'step' : undefined}
            onClick={onSelectStart}
            {...dropTarget('start', null)}
            className={cn(
              'flex h-[34px] w-full items-center gap-2.5 px-4 text-left',
              startSelected
                ? 'bg-surface-3 text-ink shadow-[inset_2px_0_0_var(--ink)]'
                : 'text-text-muted hover:bg-surface-3/60',
              dropOn === 'start' && 'bg-opponent-tint'
            )}
          >
            <span className="w-4 font-mono text-sm text-text-subtle">0</span>
            <span>{t('workbench.startHand')}</span>
          </button>
        </li>
        {steps.map((step, index) => {
          const selected = step.node.id === selectedId;
          const opponent = step.node.player === 'opponent';
          const warnings = warningsOf(step.node.id);
          const img = image(step.node);
          const hits = chokes?.byStep.get(step.node.id) ?? [];
          return (
            <li key={step.node.id} role="none">
              <div
                role="treeitem"
                aria-level={1}
                aria-selected={selected}
                aria-expanded={step.branches.length ? true : undefined}
                tabIndex={selected ? 0 : -1}
                aria-current={selected ? 'step' : undefined}
                onClick={() => onSelect(step.node.id)}
                onDoubleClick={() => onOpen?.(step.node.id)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(step.node.id);
                }}
                {...dropTarget(step.node.id, step.node.id)}
                style={{ paddingLeft: 16 + step.chainDepth * 12 }}
                className={cn(
                  'relative flex h-[34px] w-full cursor-pointer items-center gap-2.5 pr-4 text-left outline-none focus-visible:bg-surface-3/60',
                  selected
                    ? 'bg-surface-3 text-ink shadow-[inset_2px_0_0_var(--ink)]'
                    : 'text-text-muted hover:bg-surface-3/60',
                  opponent && !selected && 'shadow-[inset_2px_0_0_var(--opponent)]',
                  dropOn === step.node.id && 'bg-opponent-tint'
                )}
              >
                {marked?.has(step.node.id) && (
                  <span
                    aria-hidden
                    className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-opponent"
                  />
                )}
                {step.chainDepth > 0 && (
                  <span
                    aria-hidden
                    className="absolute bottom-1.5 top-1.5 w-[1.5px] rounded-[1px] bg-chain"
                    style={{ left: 8 + step.chainDepth * 12 }}
                  />
                )}
                <span
                  className={cn(
                    'w-4 font-mono text-sm',
                    selected ? 'text-ink' : 'text-text-subtle'
                  )}
                >
                  {step.number}
                </span>
                {img ? <CardView image={img} label="" size="art" /> : <span className="size-6" />}
                <span
                  className={cn(
                    'flex-1 truncate',
                    selected && 'font-medium',
                    opponent && 'text-opponent'
                  )}
                >
                  {labelOf(step.node)}
                </span>
                {chokes && hits.length > 0 && (
                  <span className="flex shrink-0 items-center gap-0.5">
                    {hits.slice(0, 3).map((hit, i) => (
                      <motion.button
                        key={`${chokes.run}:${hit.staple}`}
                        type="button"
                        initial={{ opacity: 0, scale: 0.4, y: 6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{
                          type: 'spring',
                          bounce: 0.45,
                          visualDuration: 0.3,
                          delay: index * 0.06 + i * 0.05,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          chokes.onPick(hit);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          chokes.onDismiss(hit);
                        }}
                        onMouseEnter={() => chokes.onHover(hit)}
                        onMouseLeave={() => chokes.onHover(null)}
                        aria-label={chokes.describe(hit)}
                        title={chokes.describe(hit)}
                        className="rounded-[3px] ring-1 ring-opponent ring-offset-1 ring-offset-surface-1 hover:ring-2"
                      >
                        <CardView image={chokes.imageOf(hit.staple)} label="" size="dot" />
                      </motion.button>
                    ))}
                    {hits.length > 3 && (
                      <span
                        className="pl-0.5 font-mono text-[10px] text-opponent"
                        title={hits
                          .slice(3)
                          .map((h) => chokes.describe(h))
                          .join('\n')}
                      >
                        +{hits.length - 3}
                      </span>
                    )}
                  </span>
                )}
                {step.node.note && (
                  <StickyNote
                    aria-label={t('workbench.note')}
                    className="size-3.5 text-text-subtle"
                  />
                )}
                {warnings > 0 && (
                  <span title={warningTextOf?.(step.node.id)} className="flex">
                    <TriangleAlert
                      aria-label={t('workbench.warnings', { count: warnings })}
                      className="size-3.5 text-warning"
                    />
                  </span>
                )}
              </div>
              {selected && step.node.note && (
                <p className="pb-1.5 pl-[58px] pr-4 font-hand text-[14px] leading-snug text-opponent">
                  {step.node.note}
                </p>
              )}
              {step.branches.map((b) => (
                <div
                  key={b.nodeId}
                  role="none"
                  className="group/branch flex items-center hover:bg-surface-3/60"
                >
                  <button
                    role="treeitem"
                    aria-level={2}
                    aria-selected={false}
                    tabIndex={-1}
                    type="button"
                    onClick={() => onSelect(b.nodeId)}
                    className="flex h-[30px] min-w-0 flex-1 items-center gap-2 pl-11 text-left text-[12.5px] text-text-muted"
                  >
                    <GitBranch className="size-3.5 shrink-0 text-text-subtle" />
                    <span className="flex-1 truncate">
                      {b.letter} · {b.label}
                    </span>
                    {pairCountOf && pairCountOf(b.nodeId) > 0 && (
                      <span
                        className="font-mono text-2xs text-opponent"
                        title={t('stress.pairsInBranch', { count: pairCountOf(b.nodeId) })}
                      >
                        ! {pairCountOf(b.nodeId)}
                      </span>
                    )}
                    {endCountOf?.(b.nodeId) != null && (
                      <span
                        className="font-mono text-2xs text-text-subtle"
                        title={t('stress.endboardCount')}
                      >
                        {endCountOf(b.nodeId)}
                      </span>
                    )}
                  </button>
                  {onPromote && (
                    <button
                      type="button"
                      onClick={() => onPromote(b.nodeId)}
                      aria-label={t('workbench.promote', { label: b.label })}
                      title={t('workbench.promote', { label: b.label })}
                      className="mr-2 grid size-6 place-items-center rounded-sm text-text-subtle opacity-0 hover:text-ink focus-visible:opacity-100 group-hover/branch:opacity-100"
                    >
                      <ArrowUpToLine className="size-3.5" />
                    </button>
                  )}
                  {!onPromote && <span className="w-4" />}
                </div>
              ))}
            </li>
          );
        })}
        {alternatives.length > 0 && (
          <li role="none" className="mt-4 border-t border-line pt-2">
            {alternatives.map((alt, i) => (
              <button
                role="treeitem"
                aria-level={1}
                aria-selected={false}
                tabIndex={-1}
                key={alt.id}
                type="button"
                onClick={() => onSelect(alt.id)}
                className="flex h-[34px] w-full items-center gap-2.5 px-4 text-left hover:bg-surface-3/60"
              >
                <span className="flex-1 truncate font-display text-base text-text-muted">
                  {t('workbench.alternativeFrom')} {i + 1}: {labelOf(alt)}
                </span>
              </button>
            ))}
          </li>
        )}
      </ol>
    </nav>
  );
}
