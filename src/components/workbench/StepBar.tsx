'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { NodeKind } from '@/lib/combo/state';

const KINDS: NodeKind[] = ['ACTION', 'ACTIVATE', 'OPPONENT', 'RESOLVE', 'END'];

/**
 * Schrittleiste (UI-Plan 7.2.4): Navigation in der Line und die naheliegenden nächsten Aktionen.
 * Bis zu den Gesten am Board (UX-2) werden Schritte hier ausdrücklich hinzugefügt.
 */
export function StepBar({
  position,
  total,
  chainLength,
  onPrev,
  onNext,
  onAdd,
}: {
  position: number;
  total: number;
  chainLength: number;
  onPrev: () => void;
  onNext: () => void;
  onAdd: (kind: NodeKind) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex h-14 shrink-0 items-center gap-4 border-t border-line bg-surface-1 px-4">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPrev}
          disabled={position <= 0}
          aria-label={t('workbench.prev')}
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-12 text-center font-mono text-xs text-text-muted" aria-live="polite">
          {t('workbench.stepCounter', { n: position, total })}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNext}
          disabled={position >= total}
          aria-label={t('workbench.next')}
        >
          <ChevronRight />
        </Button>
      </div>
      <span className="h-5 w-px bg-line" />
      {chainLength > 0 ? (
        <>
          <span className="font-mono text-xs text-chain">
            {t('workbench.chainOpen', { count: chainLength })}
          </span>
          <Button onClick={() => onAdd('RESOLVE')}>
            {t('workbench.resolve')} <Kbd>⏎</Kbd>
          </Button>
        </>
      ) : (
        <span className="text-text-muted">
          {position === 0 ? t('workbench.startHint') : t('workbench.nextHint')}
        </span>
      )}
      <span className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="line">
            <Plus />
            {t('workbench.addStep')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top">
          {KINDS.map((kind) => (
            <DropdownMenuItem key={kind} onSelect={() => onAdd(kind)}>
              {t(`combo.kind.${kind}`)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
