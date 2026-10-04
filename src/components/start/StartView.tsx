'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion, useSpring } from 'motion/react';
import { EASE } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { AmSpieltisch } from '@/components/illustrations/AmSpieltisch';
import { relativeTime } from '@/lib/utils/relative-time';
import type { LibraryCard, LibraryEntry } from '@/lib/combo/library';
import type { StressWord } from '@/lib/combo/start-words';
import type { TableRow } from '@/server/actions/start.actions';
import { DeinTisch } from '@/components/start/DeinTisch';
import { NewComboButton } from '@/components/library/NewComboButton';
import { StartHandStrip } from '@/components/library/StartHandStrip';
import { ComboListItem } from '@/components/library/ComboListItem';

const FEW_COMBOS = 6;
const WORD_SLOT = '\u0001';

/**
 * Start (UI-Plan 7.5.1): links Illustration und Headline als seltene Fläche,
 * rechts weiter bearbeiten und zuletzt bearbeitet. Ohne Combos die ersten Schritte (UX-Plan 11).
 * Mit `stress` beantwortet der Rotstift die Frage der Headline aus dem Stresstest der letzten Line.
 */
export function StartView({
  combos,
  stress = [],
  table = [],
  cards,
  decks,
}: {
  combos: LibraryEntry[];
  stress?: StressWord[];
  table?: TableRow[];
  cards: Record<string, LibraryCard>;
  decks: { id: string; name: string }[];
}) {
  const { t, i18n } = useTranslation();
  const [latest, ...recent] = combos;
  // Das Wechselwort steht im Englischen mitten im Satz: Vorlage am Platzhalter teilen
  const [before, after] = t('start.headline', { word: WORD_SLOT }).split(WORD_SLOT);
  // Ohne Stresstest die allgemeinen Wörter, dann ohne Antwort
  const items: { word: string; step?: number | null }[] = stress.length
    ? stress
    : t('start.words')
        .split('|')
        .map((word) => ({ word }));
  const index = useCycle(items.length, stress.length ? 3400 : 2600);
  const item = items[index] ?? items[0];
  const answer = (step: number | null | undefined) =>
    step === undefined
      ? null
      : step === null
        ? t('start.answer.none')
        : t('start.answer.step', { step });
  const px = useSpring(0, { stiffness: 60, damping: 18 });
  const py = useSpring(0, { stiffness: 60, damping: 18 });
  // Unter einer Minute sagt Intl nur „jetzt“, und „jetzt bearbeitet“ liest sich schief
  const when = (iso: string) => {
    const [date, now] = [new Date(iso), new Date()];
    return now.getTime() - date.getTime() < 60_000
      ? t('start.editedJustNow')
      : t('start.edited', { time: relativeTime(date, now, i18n.language) });
  };
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
    <div className="grid grid-cols-1 items-center gap-10 sm:gap-16 lg:grid-cols-[1.1fr_1fr]">
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
        {/* Auf dem Handy kleiner, damit „Weiterbauen“ im ersten Bildschirm liegt */}
        <motion.div style={{ x: px, y: py }} className="w-full max-w-[220px] sm:max-w-[408px]">
          <AmSpieltisch title={t('start.illustration')} animated className="h-auto w-full" />
        </motion.div>
        <p className="mt-4 text-text-muted">{t('start.pre')}</p>
        <h1 className="mt-1 text-balance text-center font-display text-[40px] leading-[1.05] sm:text-[52px]">
          {/* Screenreader hören einen festen Satz statt alle paar Sekunden einer neuen Überschrift */}
          <span className="sr-only">{t('start.headline', { word: items[0].word })}</span>
          <span aria-hidden>
            {before}
            <WechselWort word={item.word} struck={item.step === null} />
            {after}
          </span>
        </h1>
        {answer(item.step) !== null && (
          <>
            <p className="sr-only">{answer(items[0].step)}</p>
            {/* Die Antwort am Rand, in der Hand des Rotstifts */}
            <p aria-hidden className="mt-3 grid h-8 -rotate-2 font-hand text-2xl text-opponent">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={index}
                  className="col-start-1 row-start-1"
                  initial={{ opacity: 0, clipPath: 'inset(-20% 100% -20% 0)' }}
                  animate={{ opacity: 1, clipPath: 'inset(-20% 0% -20% 0)' }}
                  // Raus sofort, sonst steht die alte Antwort noch unter dem neuen Wort
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.5, delay: 0.8, ease: EASE.ink }}
                >
                  {answer(item.step)}
                </motion.span>
              </AnimatePresence>
            </p>
          </>
        )}
      </section>

      <motion.section
        className="flex flex-col gap-7"
        initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, delay: 0.4, ease: EASE.out }}
      >
        {latest ? (
          <>
            {/* Die ganze Karte führt in die Workbench: der Link spannt sich über sie */}
            <div className="relative flex flex-col gap-4 rounded-lg border border-line bg-surface-1 p-6 transition-colors duration-(--motion-fast) hover:border-line-strong">
              <span className="font-mono text-2xs text-text-subtle">{t('start.resume')}</span>
              <div className="flex flex-col items-start gap-4 sm:flex-row">
                <StartHandStrip cardIds={latest.stats.startHand} cards={cards} size="sm" max={3} />
                <div className="min-w-0">
                  <h2 className="font-display text-3xl leading-none">{latest.title}</h2>
                  <p className="mt-2 text-text-muted" suppressHydrationWarning>
                    {latest.deckName ?? t('start.noDeck')} · {when(latest.updatedAt)}
                  </p>
                  <p className="mt-1 font-mono text-xs text-text-subtle">
                    {t('start.steps', { count: latest.stats.steps })}
                    {latest.stats.endboard !== null &&
                      ` · ${t('start.interruptions', { count: latest.stats.endboard })}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  {/* scale-none: jedes scale, auch 100 %, macht den Link zum Bezugsrahmen des
                      ::after; die Fläche schrumpft beim Drücken und der Klick geht daneben */}
                  <Link
                    href={`/combos/${latest.id}`}
                    className="after:absolute after:inset-0 active:scale-none"
                  >
                    {t('start.continue')}
                  </Link>
                </Button>
                <div className="relative">
                  <NewComboButton decks={decks} variant="line" />
                </div>
              </div>
            </div>

            {recent.length > 0 && (
              <div>
                <h2 className="pb-2 font-display text-2xl">{t('start.recent')}</h2>
                <ul className="border-t border-line">
                  {recent.map((c) => (
                    <ComboListItem key={c.id} combo={c} cards={cards} />
                  ))}
                </ul>
              </div>
            )}

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

      {table.length > 0 && <DeinTisch rows={table} />}
    </div>
  );
}

/** Index, der alle `ms` weiterzählt; bei reduzierter Bewegung bleibt der erste */
function useCycle(length: number, ms: number) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduced || length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % length), ms);
    return () => clearInterval(timer);
  }, [reduced, length, ms]);
  return index;
}

/**
 * Wechselwort der Headline (Szene „Start“): Das Wort schreibt sich von links auf, der Rotstift
 * zieht den Unterstrich neu, oder streicht es durch, wenn der Staple die Line nicht trifft.
 * Die Wörter sind verschieden breit: der Platz gleitet auf das neue Wort, statt den zentrierten
 * Satz springen zu lassen.
 */
function WechselWort({ word, struck }: { word: string; struck: boolean }) {
  const measure = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number>();
  // Der Mess-Span ändert seine Größe mit dem Wort und mit der Schrift am Breakpoint (40 → 52 px)
  useLayoutEffect(() => {
    const el = measure.current;
    if (!el) return;
    setWidth(el.offsetWidth);
    const observer = new ResizeObserver(() => setWidth(el.offsetWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <motion.span
      className={cn(
        'relative inline-grid italic transition-colors duration-(--motion-slow)',
        struck ? 'text-text-muted' : 'text-opponent'
      )}
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
        className={cn(
          'absolute left-0 h-3 w-full overflow-visible',
          struck ? 'top-1/2 -translate-y-1/3' : '-bottom-2'
        )}
        preserveAspectRatio="none"
      >
        <motion.path
          key={word}
          d={
            struck
              ? 'M -4 9 C 30 6 90 8 144 4'
              : 'M 3 8 C 34 3 80 2 137 5 M 14 12 C 50 9 92 9 128 10'
          }
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
