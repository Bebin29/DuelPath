'use client';

import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { CardView } from '@/components/cards/CardView';
import { displayName, type ComboCard } from '@/lib/combo/cards';

/** Datentyp beim Ziehen eines Staples auf einen Schritt oder eine Karte */
export const STAPLE_MIME = 'application/x-duelpath-staple';

export interface RailStaple {
  name: string;
  card: ComboCard;
  /** Schrittnummern der Line, die der Staple trifft */
  steps: number[];
  /** Liegt schon auf dem Gegnerboard, kommt also nicht von der Hand (Lücke L1) */
  onBoard?: boolean;
  uncomputed?: boolean;
}

/**
 * Staple-Leiste (UI-Plan 7.2.2): Handtraps als Artwork, zum Ziehen auf einen Schritt oder eine Karte.
 * Überfahren zeigt, welche Schritte die Karte trifft, und markiert sie in der Line-Liste.
 */
export function StapleRail({
  staples,
  onHover,
  onPick,
}: {
  staples: RailStaple[];
  onHover: (name: string | null) => void;
  /** Klick oder Enter: Branch am gewählten Schritt */
  onPick: (name: string) => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  return (
    <aside
      aria-label={t('stress.rail')}
      className="flex h-full min-h-0 w-14 flex-col items-center border-r border-line bg-surface-1"
    >
      <ul className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto py-3">
        {staples.map((s) => {
          const name = displayName(s.card, cardLanguage);
          return (
            <li key={s.name}>
              <HoverCard openDelay={250} closeDelay={60}>
                <HoverCardTrigger asChild>
                  <button
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData(STAPLE_MIME, s.name);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => onPick(s.name)}
                    onMouseEnter={() => onHover(s.name)}
                    onMouseLeave={() => onHover(null)}
                    onFocus={() => onHover(s.name)}
                    onBlur={() => onHover(null)}
                    aria-label={`${name}${s.onBoard ? ` (${t('stress.onBoard')})` : ''}: ${
                      s.uncomputed
                        ? t('stress.notCalculated')
                        : s.steps.length
                          ? t('stress.hitsSteps', { steps: s.steps.join(', ') })
                          : t('stress.noHits')
                    }`}
                    className={cn(
                      'relative block cursor-grab rounded-sm outline-none focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-primary active:cursor-grabbing',
                      // Liegt schon beim Gegner: abgesetzt von den Handtraps darüber
                      s.onBoard && 'ring-1 ring-opponent ring-offset-1 ring-offset-surface-1'
                    )}
                  >
                    <CardView image={s.card.imageSmall} label="" size="xs" />
                    {s.steps.length > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-opponent px-0.5 font-mono text-[10.5px] font-semibold leading-none text-on-primary ring-2 ring-surface-1">
                        {s.steps.length}
                      </span>
                    )}
                  </button>
                </HoverCardTrigger>
                <HoverCardContent side="right" align="center" className="w-56 p-2.5">
                  <p className="text-sm font-medium">{name}</p>
                  {s.onBoard && (
                    <p className="font-mono text-2xs text-opponent">{t('stress.onBoard')}</p>
                  )}
                  <p
                    className={cn(
                      'mt-0.5 font-mono text-2xs',
                      s.steps.length ? 'text-opponent' : 'text-text-subtle'
                    )}
                  >
                    {s.uncomputed
                      ? t('stress.notCalculated')
                      : s.steps.length
                        ? t('stress.hitsSteps', { steps: s.steps.join(', ') })
                        : t('stress.noHits')}
                  </p>
                  {s.onBoard && (
                    <p className="mt-1 text-2xs text-text-subtle">{t('stress.boardLimitations')}</p>
                  )}
                  <p className="mt-1.5 text-2xs text-text-subtle">{t('stress.railHint')}</p>
                </HoverCardContent>
              </HoverCard>
            </li>
          );
        })}
      </ul>
      <Link
        href="/settings#staples"
        aria-label={t('stress.chooseStaples')}
        className="mb-2 grid size-8 place-items-center rounded-md text-text-subtle hover:bg-surface-3 hover:text-ink"
      >
        <Settings2 className="size-4" />
      </Link>
    </aside>
  );
}
