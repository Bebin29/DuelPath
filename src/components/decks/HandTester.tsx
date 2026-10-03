'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dumbbell, Shuffle } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { displayName } from '@/lib/combo/cards';
import { coverageOdds } from '@/lib/deck/odds';
import {
  HAND_SIZE,
  drawHand,
  handRoles,
  matchingCombos,
  seededRandom,
  suggestTitle,
  type HandRole,
} from '@/lib/deck/hand-tester';
import type { LibraryEntry } from '@/lib/combo/library';
import type { DeckViewCard } from '@/server/actions/deck-view.actions';
import { createCombo } from '@/server/actions/combo.actions';
import { CardTile } from './CardTile';

const ROLE_TONE: Record<HandRole, string> = {
  starter: 'text-self',
  handtrap: 'text-opponent',
  extender: 'text-text-subtle',
};

/**
 * Hand-Tester (UX-Plan 7.3, UI-Plan 7.5.4): Hand ziehen, passende Combos sehen, die übrigen Karten
 * als Handtrap oder Extender einordnen. Die Abdeckung ist exakt über alle möglichen Hände gerechnet.
 */
export function HandTester({
  deckId,
  pool,
  cards,
  combos,
  handtraps,
}: {
  deckId: string;
  /** Main Deck als einzelne Kopien */
  pool: string[];
  cards: Map<string, DeckViewCard>;
  combos: LibraryEntry[];
  handtraps: Set<string>;
}) {
  const { t, i18n } = useTranslation();
  const cardLanguage = useCardLanguage();
  const router = useRouter();
  const [going, setGoing] = useState<'first' | 'second'>('first');
  // Gleich beim Öffnen eine Beispielhand; fester Startwert, damit Server und Browser gleich ziehen
  const example = (g: 'first' | 'second') =>
    drawHand(pool, HAND_SIZE[g], seededRandom(pool.length * 7 + HAND_SIZE[g]));
  const [hand, setHand] = useState<string[]>(() => example('first'));
  const [draws, setDraws] = useState(0);
  const [busy, setBusy] = useState(false);
  const size = HAND_SIZE[going];

  const starters = useMemo(
    () => combos.map((c) => ({ id: c.id, startHand: c.stats.required, combo: c })),
    [combos]
  );
  const rate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const id of pool) counts.set(id, (counts.get(id) ?? 0) + 1);
    return coverageOdds(
      counts,
      starters.map((s) => s.startHand),
      size
    ).base;
  }, [pool, starters, size]);
  const matched = matchingCombos(hand, starters);
  const roles = handRoles(hand, matched, handtraps);
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent' }).format(rate);

  const draw = () => {
    setHand(drawHand(pool, size));
    setDraws((n) => n + 1);
  };
  const newCombo = async () => {
    setBusy(true);
    const names = hand.map((id) => displayName(cards.get(id), 'en'));
    const result = await createCombo(suggestTitle(names), deckId, hand);
    if (result.data) router.push(`/combos/${result.data.id}`);
    else setBusy(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-10">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button onClick={draw} disabled={pool.length === 0}>
            <Shuffle />
            {t('decks.drawHand')}
          </Button>
          <Segmented<'first' | 'second'>
            label={t('decks.going')}
            value={going}
            onChange={(v) => {
              setGoing(v);
              setHand(example(v));
            }}
            options={[
              { value: 'first', label: t('decks.goingFirst', { n: HAND_SIZE.first }) },
              { value: 'second', label: t('decks.goingSecond', { n: HAND_SIZE.second }) },
            ]}
          />
          {/* Üben (Lücke L2): dieselben Hände, aber die passenden Lines bleiben verborgen */}
          <Button asChild variant="line" title={t('practice.hint')}>
            <Link href={`/decks/${deckId}/practice`}>
              <Dumbbell />
              {t('practice.open')}
            </Link>
          </Button>
        </div>

        {hand.length === 0 ? (
          <p className="text-text-muted">{t('decks.drawHint')}</p>
        ) : (
          <>
            <ul key={draws} className="flex flex-wrap gap-3" aria-label={t('decks.hand')}>
              {hand.map((id, i) => {
                const card = cards.get(id);
                if (!card) return null;
                return (
                  <motion.li
                    key={`${id}-${i}`}
                    initial={{ opacity: 0, y: 18, rotate: -4 }}
                    animate={{ opacity: 1, y: 0, rotate: 0 }}
                    transition={{
                      type: 'spring',
                      bounce: 0.25,
                      visualDuration: 0.4,
                      delay: i * 0.06,
                    }}
                  >
                    <CardTile
                      card={card}
                      footer={
                        <span className={cn('font-mono text-2xs', ROLE_TONE[roles[i]])}>
                          {t(`decks.role.${roles[i]}`)}
                        </span>
                      }
                    />
                  </motion.li>
                );
              })}
            </ul>

            <section className="flex flex-col gap-2">
              <h2 className="font-display text-2xl">{t('decks.matching')}</h2>
              {matched.length === 0 ? (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-text-muted">{t('decks.noMatch')}</p>
                  <Button variant="line" onClick={newCombo} disabled={busy}>
                    {t('decks.newWithHand')}
                  </Button>
                </div>
              ) : (
                <ul className="flex flex-col border-t border-line">
                  {matched.map(({ combo }) => (
                    <li
                      key={combo.id}
                      className="relative flex min-h-11 flex-wrap items-center gap-x-3 border-b border-line py-2 hover:bg-surface-1"
                    >
                      <Link
                        href={`/combos/${combo.id}`}
                        className="min-w-0 flex-1 truncate font-display text-lg after:absolute after:inset-0 hover:underline"
                      >
                        {combo.title}
                      </Link>
                      <span className="order-last w-full truncate font-mono text-xs text-text-muted sm:order-none sm:w-auto">
                        {combo.stats.required
                          .map((id) => displayName(cards.get(id), cardLanguage))
                          .join(' + ')}
                      </span>
                      {combo.stats.endboard != null && (
                        <span className="font-mono text-xs text-text-muted">
                          {t('library.endboardCount', { count: combo.stats.endboard })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      {/* Auf schmalen Bildschirmen steht die Abdeckung oben */}
      <aside className="order-first flex flex-col gap-3 self-start rounded-lg border border-line bg-surface-1 p-5 lg:order-none">
        <span className="font-mono text-2xs text-text-subtle">{t('decks.coverage')}</span>
        <span className="font-display text-[56px] leading-[0.9]">{percent}</span>
        <span
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(rate * 100)}
          aria-label={t('decks.coverage')}
          className="relative h-1.5 overflow-hidden rounded-full bg-line"
        >
          <motion.span
            className="absolute inset-y-0 left-0 bg-ink"
            initial={false}
            animate={{ width: `${rate * 100}%` }}
          />
        </span>
        <p className="text-xs text-text-muted">
          {t('decks.coverageText', {
            percent,
            going: t(going === 'first' ? 'decks.first' : 'decks.second'),
          })}
        </p>
      </aside>
    </div>
  );
}
