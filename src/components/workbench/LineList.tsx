'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Columns3, GitBranch, StickyNote, TriangleAlert } from 'lucide-react';
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
  onCompare?: () => void;
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
  onCompare,
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
      <ol ref={listRef} className="min-h-0 flex-1 overflow-y-auto pb-4">
        <li>
          <button
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
            <li key={step.node.id}>
              <div
                role="button"
                tabIndex={0}
                aria-current={selected ? 'step' : undefined}
                onClick={() => onSelect(step.node.id)}
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
                  <TriangleAlert
                    aria-label={t('workbench.warnings', { count: warnings })}
                    className="size-3.5 text-warning"
                  />
                )}
              </div>
              {step.branches.map((b) => (
                <button
                  key={b.nodeId}
                  type="button"
                  onClick={() => onSelect(b.nodeId)}
                  className="flex h-[30px] w-full items-center gap-2 pl-11 pr-4 text-left text-[12.5px] text-text-muted hover:bg-surface-3/60"
                >
                  <GitBranch className="size-3.5 text-text-subtle" />
                  <span className="flex-1 truncate">
                    {b.letter} · {b.label}
                  </span>
                  {endCountOf?.(b.nodeId) != null && (
                    <span
                      className="font-mono text-2xs text-text-subtle"
                      title={t('stress.endboardCount')}
                    >
                      {endCountOf(b.nodeId)}
                    </span>
                  )}
                </button>
              ))}
            </li>
          );
        })}
        {alternatives.length > 0 && (
          <li className="mt-4 border-t border-line pt-2">
            {alternatives.map((alt, i) => (
              <button
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
