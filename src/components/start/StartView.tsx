'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion, useSpring } from 'motion/react';
import { EASE } from '@/lib/motion';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { AmSpieltisch } from '@/components/illustrations/AmSpieltisch';
import { relativeTime } from '@/lib/utils/relative-time';
import type { LibraryCard, LibraryEntry } from '@/lib/combo/library';
import { NewComboButton } from '@/components/library/NewComboButton';
import { StartHandStrip } from '@/components/library/StartHandStrip';

/**
 * Start (UI-Plan 7.5.1): links Illustration und Headline als seltene Fläche,
 * rechts weiter bearbeiten und zuletzt bearbeitet. Ohne Combos die ersten Schritte (UX-Plan 11).
 */
export function StartView({
  combos,
  cards,
  decks,
}: {
  combos: LibraryEntry[];
  cards: Record<string, LibraryCard>;
  decks: { id: string; name: string }[];
}) {
  const { t, i18n } = useTranslation();
  const [latest, ...recent] = combos;
  const px = useSpring(0, { stiffness: 60, damping: 18 });
  const py = useSpring(0, { stiffness: 60, damping: 18 });
  const when = (iso: string) =>
    t('start.edited', { time: relativeTime(new Date(iso), new Date(), i18n.language) });

  return (
    <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
      <section
        className="flex flex-col items-center"
        onMouseMove={(e) => {
          // Leichte Parallaxe mit dem Mauszeiger (Szene „Start“)
          const r = e.currentTarget.getBoundingClientRect();
          px.set(((e.clientX - r.left) / r.width - 0.5) * 10);
          py.set(((e.clientY - r.top) / r.height - 0.5) * 8);
        }}
        onMouseLeave={() => {
          px.set(0);
          py.set(0);
        }}
      >
        <motion.div style={{ x: px, y: py }} className="w-full max-w-[408px]">
          <AmSpieltisch title={t('start.illustration')} animated className="h-auto w-full" />
        </motion.div>
        <p className="mt-4 text-text-muted">{t('start.pre')}</p>
        <h1 className="mt-1 flex flex-wrap items-end justify-center gap-x-3 font-display text-[52px] leading-[1.05]">
          <span>{t('start.headline')}</span>
          <WechselWort words={t('start.words').split('|')} />
        </h1>
      </section>

      <motion.section
        className="flex flex-col gap-7"
        initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, delay: 0.4, ease: EASE.out }}
      >
        {latest ? (
          <>
            <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface-1 p-6">
              <span className="font-mono text-2xs text-text-subtle">{t('start.resume')}</span>
              <div className="flex items-start gap-4">
                <StartHandStrip cardIds={latest.stats.startHand} cards={cards} size="sm" max={3} />
                <div className="min-w-0">
                  <h2 className="font-display text-3xl leading-none">{latest.title}</h2>
                  <p className="mt-2 text-text-muted" suppressHydrationWarning>
                    {latest.deckName ?? t('start.noDeck')} · {when(latest.updatedAt)}
                  </p>
                  <p className="mt-1 font-mono text-xs text-text-subtle">
                    {t('start.progress', {
                      steps: latest.stats.steps,
                      endboard: latest.stats.endboard ?? '–',
                    })}
                  </p>
                </div>
              </div>
              <div>
                <Button asChild>
                  <Link href={`/combos/${latest.id}`}>{t('start.open')}</Link>
                </Button>
              </div>
            </div>

            <div>
              <div className="flex items-end pb-2">
                <h2 className="flex-1 font-display text-2xl">
                  {recent.length > 0 && t('start.recent')}
                </h2>
                <NewComboButton decks={decks} variant="line" />
              </div>
              <ul>
                {recent.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/combos/${c.id}`}
                      className="flex h-15 items-center gap-5 border-b border-line px-1 transition-colors duration-(--motion-fast) hover:bg-surface-1"
                    >
                      <StartHandStrip cardIds={c.stats.startHand} cards={cards} max={3} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-lg leading-tight">
                          {c.title}
                        </span>
                        <span className="text-xs text-text-muted">
                          {c.deckName ?? t('start.noDeck')} ·{' '}
                          {t('start.lines', { count: c.stats.lines })}
                        </span>
                      </span>
                      <span
                        className="font-display text-xl leading-none"
                        title={t('library.col.endboard')}
                      >
                        {c.stats.endboard ?? ''}
                      </span>
                      <span
                        className="w-24 text-right font-mono text-xs text-text-muted"
                        suppressHydrationWarning
                      >
                        {when(c.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface-1 p-6">
            <div>
              <h2 className="font-display text-3xl leading-none">{t('start.firstSteps')}</h2>
              <p className="mt-2 text-text-muted">{t('start.firstStepsText')}</p>
            </div>
            <ol className="flex flex-col">
              {[
                ['1', t('start.stepImport'), '/decks'],
                ['2', t('start.stepHand'), '/combos'],
                ['3', t('start.stepPlay'), '/combos'],
              ].map(([n, label, href]) => (
                <li key={n}>
                  <Link
                    href={href}
                    className="flex h-11 items-center gap-4 border-b border-line hover:bg-surface-3/40"
                  >
                    <span className="w-4 font-mono text-sm text-text-subtle">{n}</span>
                    <span>{label}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </motion.section>
    </div>
  );
}

/**
 * Wechselwort der Headline (Szene „Start“): Ash, Imperm, Nibiru, Droll. Das Wort schreibt sich
 * von links auf, der Rotstift zieht den Unterstrich neu. Bei reduzierter Bewegung bleibt das erste.
 */
function WechselWort({ words }: { words: string[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduced || words.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % words.length), 2600);
    return () => clearInterval(timer);
  }, [reduced, words.length]);
  const word = words[index] ?? '';
  return (
    <span className="relative inline-grid italic text-opponent">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={word}
          initial={{ clipPath: 'inset(-20% 100% -20% 0)' }}
          animate={{ clipPath: 'inset(-20% 0% -20% 0)' }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.45, ease: EASE.out }}
          className="col-start-1 row-start-1"
        >
          {word}
        </motion.span>
      </AnimatePresence>
      <svg
        aria-hidden
        viewBox="0 0 140 14"
        fill="none"
        className="absolute -bottom-2 left-0 h-3 w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <motion.path
          key={word}
          d="M 3 8 C 34 3 80 2 137 5 M 14 12 C 50 9 92 9 128 10"
          stroke="var(--opponent)"
          strokeWidth={2.2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, delay: 0.35, ease: EASE.ink }}
        />
      </svg>
    </span>
  );
}
