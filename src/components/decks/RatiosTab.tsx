'use client';

import { useMemo, useState } from 'react';
import { Minus, Plus, Sparkles, TriangleAlert } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { CardView } from '@/components/cards/CardView';
import { displayName } from '@/lib/combo/cards';
import { HAND_SIZE } from '@/lib/deck/hand-tester';
import { deckCounts, missingFromDeck } from '@/lib/deck/deck-check';
import { ROLES, suggestRoles, type Going, type Role, type Roles } from '@/lib/deck/roles';
import type { Section } from '@/lib/deck/deck-rules';
import type { LibraryEntry } from '@/lib/combo/library';
import type { DeckViewCard, DeckViewEntry } from '@/server/actions/deck-view.actions';
import { OddsSummary, RoleChip, mainCounts, ratioStats, useOddsFormat } from './odds-ui';

export interface RatioDoc {
  entries: DeckViewEntry[];
  roles: Roles;
}

/**
 * Ratios (Deckbau-Plan 3.1 bis 3.4): Rollen setzen, exakte Kennzahlen mit Änderung gegenüber
 * einem Vergleichsstand, Abdeckung und Grenznutzen je Karte, Extra Deck nach Nutzung.
 */
export function RatiosTab({
  doc,
  baseline,
  cards,
  combos,
  staples,
  onRoles,
  onChange,
  comparison,
  onOpenCard,
}: {
  doc: RatioDoc;
  baseline: RatioDoc;
  cards: Map<string, DeckViewCard>;
  combos: LibraryEntry[];
  staples: Set<string>;
  onRoles: (patch: Roles) => void;
  onChange: (cardId: string, section: Section, delta: number) => void;
  /** Vergleichsstand und Versionen, unten in der Kennzahlen-Spalte */
  comparison: React.ReactNode;
  onOpenCard: (cardId: string) => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const [going, setGoing] = useState<Going>('first');

  const starthands = useMemo(() => combos.map((c) => c.stats.required), [combos]);
  const now = useMemo(
    () => ratioStats(mainCounts(doc.entries), doc.roles, cards, starthands, going),
    [doc, cards, starthands, going]
  );
  const before = useMemo(
    () => ratioStats(mainCounts(baseline.entries), baseline.roles, cards, starthands, going),
    [baseline, cards, starthands, going]
  );
  const suggested = useMemo(
    () =>
      suggestRoles(
        [...now.counts.keys()].map((id) => ({ id, name: cards.get(id)?.name ?? '' })),
        starthands,
        staples,
        doc.roles
      ),
    [now.counts, cards, starthands, staples, doc.roles]
  );
  const allCounts = useMemo(() => deckCounts(doc.entries), [doc.entries]);

  const { points, delta } = useOddsFormat();
  const hasCombos = now.coverage.card.size > 0;
  const starterOdds = now.roles.metrics.find((m) => m.key === 'starter')?.value ?? 0;
  const mainSize = [...now.counts.values()].reduce((a, b) => a + b, 0);
  const cut = [...now.coverage.card]
    .filter(([, m]) => m.minus !== undefined)
    .map(([id, m]) => ({ id, loss: now.coverage.base - m.minus! }))
    .sort((a, b) => a.loss - b.loss)
    .slice(0, 3);
  const restGain =
    now.coverage.rest.minus !== undefined ? now.coverage.rest.minus - now.coverage.base : 0;

  /** Combos, die mit einer Kopie weniger nicht mehr gehen */
  const breaks = (id: string) => {
    const fewer = new Map(allCounts).set(id, (allCounts.get(id) ?? 0) - 1);
    return combos.filter(
      (c) =>
        missingFromDeck(c.stats, allCounts).length === 0 &&
        missingFromDeck(c.stats, fewer).length > 0
    ).length;
  };

  const roleOf = (id: string): Role => doc.roles[id] ?? 'other';
  const name = (id: string) => displayName(cards.get(id), cardLanguage);
  const byRole = ROLES.map((role) => ({
    role,
    ids: [...now.counts.keys()]
      .filter((id) => roleOf(id) === role && cards.has(id))
      .sort((a, b) => name(a).localeCompare(name(b))),
  })).filter((g) => g.ids.length > 0);
  const extra = doc.entries
    .filter((e) => e.section === 'EXTRA' && cards.has(e.cardId))
    .map((e) => ({
      ...e,
      uses: combos.filter((c) => c.stats.cardIds.includes(e.cardId)).length,
    }))
    .sort((a, b) => a.uses - b.uses || name(a.cardId).localeCompare(name(b.cardId)));

  const suggestedCount = Object.keys(suggested).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
      <div className="flex min-w-0 flex-col gap-6">
        {suggestedCount > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-line-strong px-3 py-2 text-sm">
            <Sparkles className="size-4 text-text-subtle" />
            <span className="flex-1">{t('decks.ratios.suggested', { count: suggestedCount })}</span>
            <Button variant="line" size="sm" onClick={() => onRoles(suggested)}>
              {t('decks.ratios.accept')}
            </Button>
          </div>
        )}

        {byRole.length === 0 && <p className="text-text-muted">{t('decks.empty.MAIN')}</p>}
        {byRole.map(({ role, ids }) => (
          <section key={role} className="flex flex-col">
            <h2 className="flex items-baseline gap-2 border-b border-line pb-1.5">
              <span className="font-display text-2xl">{t(`decks.ratios.role.${role}`)}</span>
              <span className="font-mono text-xs text-text-subtle">
                {ids.reduce((n, id) => n + (now.counts.get(id) ?? 0), 0)}
              </span>
            </h2>
            <ul className="flex flex-col">
              {ids.map((id) => {
                const card = cards.get(id)!;
                const quantity = now.counts.get(id) ?? 0;
                const margin = now.coverage.card.get(id) ?? (hasCombos ? now.coverage.rest : {});
                const broken = breaks(id);
                return (
                  <li
                    key={id}
                    className="flex min-h-10 flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line py-1 text-sm"
                  >
                    <CardView image={card.imageSmall} label="" size="art" />
                    <button
                      type="button"
                      onClick={() => onOpenCard(id)}
                      // Handy: Name in eigener Zeile, Rolle und Zahlen darunter
                      className="min-w-0 flex-1 truncate text-left hover:underline max-sm:basis-[calc(100%-34px)]"
                    >
                      {displayName(card, cardLanguage)}
                    </button>
                    <RoleChip
                      className="max-sm:ml-[34px] max-sm:mr-auto"
                      role={roleOf(id)}
                      suggested={suggested[id]}
                      onSelect={(r) => onRoles({ [id]: r })}
                    />
                    {hasCombos && (
                      <span className="flex gap-2" title={t('decks.ratios.margin')}>
                        {(['minus', 'plus'] as const).map((k) => (
                          <span key={k} className="flex w-16 items-baseline justify-end gap-1">
                            {margin[k] !== undefined && (
                              <>
                                <span className="font-mono text-2xs text-text-subtle">
                                  {k === 'minus' ? '−1' : '+1'}
                                </span>
                                {delta(margin[k]! - now.coverage.base) ?? (
                                  <span className="font-mono text-xs text-text-subtle">0</span>
                                )}
                              </>
                            )}
                          </span>
                        ))}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('decks.less')}
                        onClick={() => onChange(id, 'MAIN', -1)}
                      >
                        <Minus />
                      </Button>
                      <span className="w-4 text-center font-mono text-xs tabular-nums">
                        {quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('decks.more')}
                        disabled={quantity >= 3}
                        onClick={() => onChange(id, 'MAIN', 1)}
                      >
                        <Plus />
                      </Button>
                    </span>
                    {broken > 0 && (
                      <span className="flex w-full items-center gap-1.5 pl-9 text-xs text-warning">
                        <TriangleAlert className="size-3" />
                        {t('decks.ratios.breaks', { count: broken })}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {extra.length > 0 && (
          <section className="flex flex-col">
            <h2 className="flex items-baseline gap-2 border-b border-line pb-1.5">
              <span className="font-display text-2xl">{t('decks.ratios.extraUse')}</span>
            </h2>
            <ul className="flex flex-col">
              {extra.map((e) => (
                <li
                  key={e.cardId}
                  className="flex min-h-10 items-center gap-2.5 border-b border-line text-sm"
                >
                  <span className="w-6 font-mono text-xs text-text-muted">{e.quantity}×</span>
                  <CardView image={cards.get(e.cardId)!.imageSmall} label="" size="art" />
                  <button
                    type="button"
                    onClick={() => onOpenCard(e.cardId)}
                    className="min-w-0 flex-1 truncate text-left hover:underline"
                  >
                    {name(e.cardId)}
                  </button>
                  <span
                    className={cn(
                      'font-mono text-xs',
                      e.uses === 0 ? 'text-warning' : 'text-text-muted'
                    )}
                  >
                    {e.uses === 0
                      ? t('decks.ratios.unused')
                      : t('decks.combosCount', { count: e.uses })}
                  </span>
                </li>
              ))}
            </ul>
            {combos.length > 0 && extra.some((e) => e.uses === 0) && (
              <p className="pt-2 text-xs text-text-subtle">{t('decks.ratios.unusedHint')}</p>
            )}
          </section>
        )}
      </div>

      {/* Auf schmalen Bildschirmen stehen die Kennzahlen oben */}
      <aside className="order-first flex flex-col gap-5 self-start rounded-lg border border-line bg-surface-1 p-5 lg:sticky lg:top-6 lg:order-none">
        <Segmented<Going>
          label={t('decks.going')}
          value={going}
          onChange={setGoing}
          options={[
            { value: 'first', label: t('decks.goingFirst', { n: HAND_SIZE.first }) },
            { value: 'second', label: t('decks.goingSecond', { n: HAND_SIZE.second }) },
          ]}
        />

        <OddsSummary now={now} before={before} going={going} />

        {hasCombos && (
          <div className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
            {cut.length > 0 && (
              <>
                <span className="font-mono text-2xs text-text-subtle">{t('decks.ratios.cut')}</span>
                <ul className="flex flex-col gap-1">
                  {cut.map((c) => (
                    <li key={c.id} className="flex items-baseline gap-2">
                      <span className="min-w-0 flex-1 truncate">{name(c.id)}</span>
                      {delta(-c.loss)}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {mainSize > 40 && restGain > 0 && (
              <p className="text-xs text-text-muted">
                {t('decks.ratios.size', { count: mainSize, points: points(restGain) })}
              </p>
            )}
            {now.coverage.base < starterOdds - 0.15 && (
              <p className="text-xs text-text-muted">{t('decks.ratios.fewCombos')}</p>
            )}
          </div>
        )}
        {!hasCombos && <p className="text-xs text-text-muted">{t('decks.ratios.noCombos')}</p>}

        <div className="border-t border-line pt-4">{comparison}</div>
      </aside>
    </div>
  );
}
