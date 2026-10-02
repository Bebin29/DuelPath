'use client';

import { useMemo, useState } from 'react';
import { Minus, Plus, Sparkles, Trash2, TriangleAlert } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { CardView } from '@/components/cards/CardView';
import { displayName } from '@/lib/combo/cards';
import { newId } from '@/lib/combo/tree';
import { HAND_SIZE } from '@/lib/deck/hand-tester';
import { ROLES, suggestRoles, type Going, type Role, type Roles } from '@/lib/deck/roles';
import { adjustPlan, applySidePlan, type SidePlan } from '@/lib/deck/side-plan';
import type { LibraryEntry } from '@/lib/combo/library';
import type { DeckViewCard, DeckViewEntry } from '@/server/actions/deck-view.actions';
import { OddsSummary, RoleChip, mainCounts, ratioStats } from './odds-ui';

/**
 * Side-Plan (Deckbau-Plan 3.6): je Matchup und Zugfolge Karten rein und raus, daneben die
 * Kennzahlen nach dem Siden gegenüber dem Main Deck ohne Plan.
 */
export function SidePlanTab({
  entries,
  roles,
  plans,
  cards,
  combos,
  staples,
  onPlans,
  onRoles,
  onOpenCard,
}: {
  entries: DeckViewEntry[];
  roles: Roles;
  plans: SidePlan[];
  cards: Map<string, DeckViewCard>;
  combos: LibraryEntry[];
  staples: Set<string>;
  onPlans: (fn: (prev: SidePlan[]) => SidePlan[], group?: string) => void;
  onRoles: (patch: Roles) => void;
  onOpenCard: (cardId: string) => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const [selected, setSelected] = useState<string | null>(plans[0]?.id ?? null);
  const plan = plans.find((p) => p.id === selected) ?? null;

  const starthands = useMemo(() => combos.map((c) => c.stats.required), [combos]);
  const going: Going = plan?.going ?? 'second';
  const before = useMemo(
    () => ratioStats(mainCounts(entries), roles, cards, starthands, going),
    [entries, roles, cards, starthands, going]
  );
  const sided = useMemo(() => (plan ? applySidePlan(entries, plan) : null), [entries, plan]);
  const after = useMemo(
    () => (sided ? ratioStats(sided.main, roles, cards, starthands, going) : null),
    [sided, roles, cards, starthands, going]
  );

  const update = (fn: (p: SidePlan) => SidePlan, group?: string) =>
    plan && onPlans((prev) => prev.map((p) => (p.id === plan.id ? fn(p) : p)), group);
  const add = () => {
    const id = newId();
    onPlans((prev) => [...prev, { id, matchup: '', going: 'second', in: {}, out: {} }]);
    setSelected(id);
  };
  const remove = () => {
    if (!plan) return;
    const rest = plans.filter((p) => p.id !== plan.id);
    onPlans(() => rest);
    setSelected(rest[0]?.id ?? null);
  };

  const name = (id: string) => displayName(cards.get(id), cardLanguage);
  const roleRank = (id: string) => ROLES.indexOf(roles[id] ?? 'other');
  const bySection = (section: 'MAIN' | 'SIDE') =>
    entries
      .filter((e) => e.section === section && cards.has(e.cardId))
      .sort(
        (a, b) =>
          roleRank(a.cardId) - roleRank(b.cardId) || name(a.cardId).localeCompare(name(b.cardId))
      );
  const sideCards = bySection('SIDE');
  const suggested = suggestRoles(
    sideCards.map((e) => ({ id: e.cardId, name: cards.get(e.cardId)?.name ?? '' })),
    [],
    staples,
    roles
  );

  const row = (e: DeckViewEntry, key: 'in' | 'out') => {
    const n = plan?.[key][e.cardId] ?? 0;
    return (
      <li
        key={e.cardId}
        className={cn(
          'flex min-h-10 flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line py-1 text-sm',
          n === 0 && 'text-text-muted'
        )}
      >
        <CardView image={cards.get(e.cardId)!.imageSmall} label="" size="art" />
        <button
          type="button"
          onClick={() => onOpenCard(e.cardId)}
          className="min-w-0 flex-1 truncate text-left hover:underline max-sm:basis-[calc(100%-34px)]"
        >
          {name(e.cardId)}
        </button>
        <RoleChip
          className="max-sm:mr-auto max-sm:ml-[34px]"
          role={(roles[e.cardId] ?? 'other') as Role}
          suggested={key === 'in' ? suggested[e.cardId] : undefined}
          onSelect={(r) => onRoles({ [e.cardId]: r })}
        />
        <span className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t(`decks.side.${key}Less`)}
            disabled={n === 0}
            onClick={() => update((p) => adjustPlan(p, key, e.cardId, -1, e.quantity))}
          >
            <Minus />
          </Button>
          <span className="w-8 text-center font-mono text-xs tabular-nums">
            {n}/{e.quantity}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t(`decks.side.${key}More`)}
            disabled={n >= e.quantity}
            onClick={() => update((p) => adjustPlan(p, key, e.cardId, 1, e.quantity))}
          >
            <Plus />
          </Button>
        </span>
      </li>
    );
  };

  const total = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex flex-wrap items-center gap-2"
        role="tablist"
        aria-label={t('decks.side.plans')}
      >
        {plans.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={p.id === plan?.id}
            onClick={() => setSelected(p.id)}
            className={cn(
              'h-7 rounded-full border px-3 text-sm',
              p.id === plan?.id
                ? 'border-ink text-ink'
                : 'border-line text-text-muted hover:text-ink'
            )}
          >
            {p.matchup || t('decks.side.untitled')}
            <span className="ml-1.5 font-mono text-2xs text-text-subtle">
              {t(p.going === 'first' ? 'decks.first' : 'decks.second')}
            </span>
          </button>
        ))}
        <Button variant="line" size="sm" onClick={add}>
          <Plus />
          {t('decks.side.add')}
        </Button>
      </div>

      {!plan ? (
        <p className="text-text-muted">
          {sideCards.length === 0 ? t('decks.side.noSide') : t('decks.side.empty')}
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
          <div className="flex min-w-0 flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={plan.matchup}
                onChange={(e) =>
                  update((p) => ({ ...p, matchup: e.target.value }), `matchup:${plan.id}`)
                }
                maxLength={60}
                placeholder={t('decks.side.matchupPlaceholder')}
                aria-label={t('decks.side.matchup')}
                className="h-8 min-w-0 flex-1 rounded-md border border-line bg-transparent px-2.5 font-display text-xl outline-none focus-visible:border-line-strong"
              />
              <Segmented<Going>
                label={t('decks.going')}
                value={plan.going}
                onChange={(g) => update((p) => ({ ...p, going: g }))}
                options={[
                  { value: 'first', label: t('decks.goingFirst', { n: HAND_SIZE.first }) },
                  { value: 'second', label: t('decks.goingSecond', { n: HAND_SIZE.second }) },
                ]}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('decks.side.delete')}
                onClick={remove}
              >
                <Trash2 />
              </Button>
            </div>

            {Object.keys(suggested).length > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-line-strong px-3 py-2 text-sm">
                <Sparkles className="size-4 text-text-subtle" />
                <span className="flex-1">
                  {t('decks.ratios.suggested', { count: Object.keys(suggested).length })}
                </span>
                <Button variant="line" size="sm" onClick={() => onRoles(suggested)}>
                  {t('decks.ratios.accept')}
                </Button>
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="flex flex-col">
                <h2 className="flex items-baseline gap-2 border-b border-line pb-1.5">
                  <span className="font-display text-2xl">{t('decks.side.in')}</span>
                  <span className="font-mono text-xs text-text-subtle">{total(plan.in)}</span>
                </h2>
                {sideCards.length === 0 ? (
                  <p className="pt-2 text-sm text-text-subtle">{t('decks.side.noSide')}</p>
                ) : (
                  <ul className="flex flex-col">{sideCards.map((e) => row(e, 'in'))}</ul>
                )}
              </section>
              <section className="flex flex-col">
                <h2 className="flex items-baseline gap-2 border-b border-line pb-1.5">
                  <span className="font-display text-2xl">{t('decks.side.out')}</span>
                  <span className="font-mono text-xs text-text-subtle">{total(plan.out)}</span>
                </h2>
                <ul className="flex flex-col">{bySection('MAIN').map((e) => row(e, 'out'))}</ul>
              </section>
            </div>
          </div>

          <aside className="order-first flex flex-col gap-5 self-start rounded-lg border border-line bg-surface-1 p-5 lg:sticky lg:top-6 lg:order-none">
            <p className="text-xs text-text-subtle">
              {t('decks.side.compare', {
                going: t(plan.going === 'first' ? 'decks.first' : 'decks.second'),
              })}
            </p>
            {sided && sided.issues.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-md border border-warning/40 bg-warning-tint px-3 py-2 text-xs text-warning">
                {sided.issues.map((issue, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <TriangleAlert className="size-3 shrink-0" />
                    {issue.kind === 'unbalanced'
                      ? t('decks.side.unbalanced', { in: issue.in, out: issue.out })
                      : t(`decks.side.${issue.kind}`, { name: name(issue.cardId) })}
                  </li>
                ))}
              </ul>
            )}
            {after && <OddsSummary now={after} before={before} going={plan.going} />}
          </aside>
        </div>
      )}
    </div>
  );
}
