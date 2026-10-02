'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  deckRatios,
  isHardOpt,
  ROLES,
  TIERS,
  type Going,
  type Role,
  type Roles,
  type Tier,
} from '@/lib/deck/roles';
import type { DeckViewCard, DeckViewEntry } from '@/server/actions/deck-view.actions';

/** Gemeinsame Bausteine der Tabs Ratios und Side-Plan (Deckbau-Plan 3.2, 3.6) */

export const TIER_TONE: Record<Tier, string> = {
  brick: 'bg-opponent',
  playable: 'bg-line-strong',
  good: 'bg-self/55',
  great: 'bg-self',
};

/** Kopien je Karte im Main Deck */
export const mainCounts = (entries: DeckViewEntry[]) => {
  const map = new Map<string, number>();
  for (const e of entries)
    if (e.section === 'MAIN') map.set(e.cardId, (map.get(e.cardId) ?? 0) + e.quantity);
  return map;
};

/** Kennzahlen eines Main Decks samt Kopien je Karte */
export function ratioStats(
  counts: Map<string, number>,
  roles: Roles,
  cards: Map<string, DeckViewCard>,
  starthands: string[][],
  going: Going
) {
  const ratios = deckRatios(
    counts,
    (id) => ({ role: roles[id] ?? 'other', hardOpt: isHardOpt(cards.get(id)?.effects ?? []) }),
    starthands,
    going
  );
  return { counts, ...ratios };
}
export type RatioStats = ReturnType<typeof ratioStats>;

/** Prozent und Prozentpunkte in der Sprache der Oberfläche */
export function useOddsFormat() {
  const { i18n } = useTranslation();
  const pct = (v: number) =>
    new Intl.NumberFormat(i18n.language, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(v);
  // Änderungen in Prozentpunkten, immer mit Vorzeichen, damit sie ohne Farbe lesbar sind
  const points = (d: number) =>
    new Intl.NumberFormat(i18n.language, {
      signDisplay: 'exceptZero',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(d * 100);
  /** invert: weniger ist besser; neutral: Richtung sagt nichts über besser oder schlechter */
  const delta = (d: number, invert?: boolean | 'neutral') =>
    Math.abs(d) < 0.0005 ? null : (
      <span
        className={cn(
          'font-mono text-xs tabular-nums',
          invert === 'neutral'
            ? 'text-text-muted'
            : d > 0 !== !!invert
              ? 'text-self'
              : 'text-opponent'
        )}
      >
        {points(d)}
      </span>
    );

  return { pct, points, delta };
}

/** Stufen-Balken und Kennzahlen mit Änderung gegenüber einem Vergleich */
export function OddsSummary({
  now,
  before,
  going,
}: {
  now: RatioStats;
  before: RatioStats;
  going: Going;
}) {
  const { t } = useTranslation();
  const { pct, delta } = useOddsFormat();
  const hasCombos = now.coverage.card.size > 0;
  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="font-mono text-2xs text-text-subtle">{t('decks.ratios.tiers')}</span>
        <div className="flex h-2 overflow-hidden rounded-full bg-line" aria-hidden>
          {TIERS.map((tier) => (
            <span
              key={tier}
              className={TIER_TONE[tier]}
              style={{ width: `${now.roles.tiers[tier] * 100}%` }}
            />
          ))}
        </div>
        <dl className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 gap-y-1 text-sm">
          {TIERS.map((tier) => (
            <div key={tier} className="contents">
              <dt className="flex items-center gap-2">
                <span className={cn('size-2 rounded-full', TIER_TONE[tier])} />
                {t(`decks.ratios.tier.${tier}`)}
              </dt>
              <dd className="text-right font-mono tabular-nums">{pct(now.roles.tiers[tier])}</dd>
              <dd className="w-10 text-right">
                {delta(
                  now.roles.tiers[tier] - before.roles.tiers[tier],
                  // Weniger „spielbar“ kann heißen, dass Hände eine Stufe aufsteigen
                  tier === 'brick' || (tier === 'playable' && 'neutral')
                )}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-text-subtle">{t(`decks.ratios.tierText.${going}`)}</p>
      </div>

      <dl className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-3 gap-y-1.5 border-t border-line pt-4 text-sm">
        {now.roles.metrics.map((m, i) => (
          <div key={m.key} className="contents">
            <dt>{t(`decks.ratios.metric.${m.key}`)}</dt>
            <dd className="font-mono tabular-nums">{pct(m.value)}</dd>
            <dd className="w-10 text-right">
              {delta(
                m.value - (before.roles.metrics[i]?.value ?? m.value),
                m.key === 'brick' || m.key === 'garnet'
              )}
            </dd>
          </div>
        ))}
        {hasCombos && (
          <div className="contents">
            <dt>{t('decks.coverage')}</dt>
            <dd className="font-mono tabular-nums">{pct(now.coverage.base)}</dd>
            <dd className="w-10 text-right">{delta(now.coverage.base - before.coverage.base)}</dd>
          </div>
        )}
      </dl>
    </>
  );
}

/** Rolle einer Karte; ein Vorschlag erscheint gestrichelt, bis er übernommen ist */
export function RoleChip({
  role,
  suggested,
  onSelect,
  className,
}: {
  className?: string;
  role: Role;
  suggested?: Role;
  onSelect: (role: Role) => void;
}) {
  const { t } = useTranslation();
  const shown = suggested ?? role;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('decks.ratios.chooseRole', { role: t(`decks.ratios.role.${shown}`) })}
          className={cn(
            className,
            'h-6 rounded-full border px-2.5 font-mono text-2xs',
            suggested
              ? 'border-dashed border-line-strong text-text-subtle'
              : 'border-line text-text-muted hover:text-ink'
          )}
        >
          {t(`decks.ratios.role.${shown}`)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={role} onValueChange={(v) => onSelect(v as Role)}>
          {ROLES.map((r) => (
            <DropdownMenuRadioItem key={r} value={r}>
              {t(`decks.ratios.role.${r}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
