'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, useSpring } from 'motion/react';
import { EASE } from '@/lib/motion';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { AmSpieltisch } from '@/components/illustrations/AmSpieltisch';
import { relativeTime } from '@/lib/utils/relative-time';
import type { LibraryCard, LibraryEntry } from '@/lib/combo/library';
import { NewComboButton } from '@/components/library/NewComboButton';
import { StartHandStrip } from '@/components/library/StartHandStrip';
import { ComboListItem } from '@/components/library/ComboListItem';

const FEW_COMBOS = 6;
const WORD_SLOT = '\u0001';

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
  // Das Wechselwort steht im Englischen mitten im Satz: Vorlage am Platzhalter teilen
  const [before, after] = t('start.headline', { word: WORD_SLOT }).split(WORD_SLOT);
  const words = t('start.words').split('|');
  const px = useSpring(0, { stiffness: 60, damping: 18 });
  const py = useSpring(0, { stiffness: 60, damping: 18 });
  const when = (iso: string) =>
    t('start.edited', { time: relativeTime(new Date(iso), new Date(), i18n.language) });
  // Bei wenigen Combos endet die Seite nicht leer: was als Nächstes ansteht (UI-Sweep-Plan 5)
  const nextUp =
    combos.length >= FEW_COMBOS
      ? []
      : [
          ...combos
            .filter((c) => c.status === 'DRAFT')
            .slice(0, 2)
            .map((c) => ({
              href: `/combos/${c.id}`,
              label: t('start.next.test', { title: c.title }),
            })),
          ...decks
            .filter((d) => !combos.some((c) => c.deckId === d.id))
            .slice(0, 2)
            .map((d) => ({
              href: `/combos/new?deck=${d.id}`,
              label: t('start.next.firstCombo', { deck: d.name }),
            })),
        ];

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
        <h1 className="mt-1 text-balance text-center font-display text-[52px] leading-[1.05]">
          {/* Screenreader hören einen festen Satz statt alle 2,6 s einer neuen Überschrift */}
          <span className="sr-only">{t('start.headline', { word: words[0] })}</span>
          <span aria-hidden>
            {before}
            <WechselWort words={words} />
            {after}
          </span>
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
              <div className="flex flex-col items-start gap-4 sm:flex-row">
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
              <div className="flex items-end gap-3 pb-2">
                <h2 className="flex-1 font-display text-2xl">
                  {recent.length > 0 && t('start.recent')}
                </h2>
                <NewComboButton decks={decks} variant="line" />
              </div>
              <ul className="border-t border-line">
                {recent.map((c) => (
                  <ComboListItem key={c.id} combo={c} cards={cards} />
                ))}
              </ul>
            </div>

            {nextUp.length > 0 && (
              <section aria-label={t('start.next.title')}>
                <h2 className="pb-2 font-display text-2xl">{t('start.next.title')}</h2>
                <ul className="border-t border-line">
                  {nextUp.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex min-h-11 items-center gap-3 border-b border-line px-1 text-sm transition-colors duration-(--motion-fast) hover:bg-surface-1"
                      >
                        <ArrowRight className="size-4 shrink-0 text-text-subtle" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
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
 * Die Wörter sind verschieden breit: der Platz gleitet auf das neue Wort, statt den zentrierten
 * Satz springen zu lassen.
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
  const measure = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();
  useLayoutEffect(() => setWidth(measure.current?.offsetWidth), [word]);
  return (
    <motion.span
      className="relative inline-grid italic text-opponent"
      animate={width === undefined ? undefined : { width }}
      // erst nach dem Ausblenden des alten Worts, sonst ragt es über den Satz
      transition={{ duration: 0.4, delay: 0.45, ease: EASE.ink }}
    >
      <span ref={measure} className="invisible absolute whitespace-nowrap">
        {word}
      </span>
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
    </motion.span>
  );
}
