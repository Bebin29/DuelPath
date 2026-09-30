'use client';

import { useEffect, useRef } from 'react';
import { GitBranch, StickyNote, TriangleAlert } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';
import { CardView } from '@/components/cards/CardView';
import type { LineStep } from '@/lib/combo/lines';
import type { ComboNodeData } from '@/lib/combo/state';
import type { ComboCard } from '@/lib/combo/cards';

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
}: LineListProps) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLOListElement>(null);

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
      <div className="flex items-end px-4 pb-2 pt-3">
        <h2 className="flex-1 truncate font-display text-lg leading-tight">{title}</h2>
      </div>
      <ol ref={listRef} className="min-h-0 flex-1 overflow-y-auto pb-4">
        <li>
          <button
            type="button"
            aria-current={startSelected ? 'step' : undefined}
            onClick={onSelectStart}
            className={cn(
              'flex h-[34px] w-full items-center gap-2.5 px-4 text-left',
              startSelected
                ? 'bg-surface-3 text-ink shadow-[inset_2px_0_0_var(--ink)]'
                : 'text-text-muted hover:bg-surface-3/60'
            )}
          >
            <span className="w-4 font-mono text-sm text-text-subtle">0</span>
            <span>{t('workbench.startHand')}</span>
          </button>
        </li>
        {steps.map((step) => {
          const selected = step.node.id === selectedId;
          const opponent = step.node.player === 'opponent';
          const warnings = warningsOf(step.node.id);
          const img = image(step.node);
          return (
            <li key={step.node.id}>
              <button
                type="button"
                aria-current={selected ? 'step' : undefined}
                onClick={() => onSelect(step.node.id)}
                style={{ paddingLeft: 16 + step.chainDepth * 12 }}
                className={cn(
                  'relative flex h-[34px] w-full items-center gap-2.5 pr-4 text-left',
                  selected
                    ? 'bg-surface-3 text-ink shadow-[inset_2px_0_0_var(--ink)]'
                    : 'text-text-muted hover:bg-surface-3/60',
                  opponent && !selected && 'shadow-[inset_2px_0_0_var(--opponent)]'
                )}
              >
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
              </button>
              {step.branches.map((b) => (
                <button
                  key={b.nodeId}
                  type="button"
                  onClick={() => onSelect(b.nodeId)}
                  className="flex h-[30px] w-full items-center gap-2 pl-11 pr-4 text-left text-[12.5px] text-text-muted hover:bg-surface-3/60"
                >
                  <GitBranch className="size-3.5 text-text-subtle" />
                  <span className="truncate">
                    {b.letter} · {b.label}
                  </span>
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
