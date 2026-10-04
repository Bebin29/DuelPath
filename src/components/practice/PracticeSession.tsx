'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { Workbench } from '@/components/workbench/Workbench';
import { drawFromDeck, startStateFromDeck } from '@/lib/combo/deck';
import type { StartState } from '@/lib/combo/state';
import { HAND_SIZE } from '@/lib/deck/hand-tester';
import {
  PRACTICE_HANDS,
  bestTarget,
  practiceHands,
  scoreHand,
  type PracticeAttempt,
  type PracticeHand,
  type PracticeSetup,
  type ReachedBoard,
} from '@/lib/deck/practice';
import type { LoadedCombo, StapleCard } from '@/server/actions/combo.actions';
import { PracticeResult } from './PracticeResult';
import { PracticeSummary } from './PracticeSummary';

type Phase =
  | { kind: 'intro' }
  | { kind: 'playing'; index: number; startedAt: number }
  | { kind: 'result'; attempt: PracticeAttempt }
  | { kind: 'summary' };

/**
 * Ein Übungslauf (Lücke L2): zehn Hände hintereinander. Jede Hand wird an der Werkbank gespielt,
 * danach gegen die gespeicherte Line gemessen. Der Lauf lebt nur in dieser Seite; gespeichert wird
 * nichts, damit Üben die Bibliothek nicht zumüllt.
 */
export function PracticeSession({
  setup,
  staples,
  decks,
}: {
  setup: PracticeSetup;
  staples: StapleCard[];
  decks: { id: string; name: string }[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [hands, setHands] = useState<PracticeHand[]>([]);
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  // Keine Hand passte auf eine gespeicherte Line; dann gibt es nichts zu vergleichen
  const [empty, setEmpty] = useState(false);
  // Gezogen wird erst auf Knopfdruck: im ersten Rendern würde der Server andere Hände ziehen
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });

  const cards = useMemo(() => new Map(setup.cards.map((c) => [c.id, c])), [setup.cards]);
  // Das ganze Deck im Startzustand, einmal für alle Hände
  const deckState = useMemo(
    () => startStateFromDeck({ cards: [] }, setup.entries),
    [setup.entries]
  );
  const startStateFor = (hand: string[]): StartState =>
    hand.reduce((state, cardId) => drawFromDeck(state, cardId), deckState);

  const quit = () => router.push(`/decks/${setup.deckId}?tab=hand`);
  const begin = () => {
    const drawn = practiceHands(
      setup.pool,
      setup.targets,
      PRACTICE_HANDS,
      HAND_SIZE.first,
      Math.random,
      cards
    );
    setHands(drawn);
    setAttempts([]);
    setEmpty(drawn.length === 0);
    setPhase(
      drawn.length ? { kind: 'playing', index: 0, startedAt: Date.now() } : { kind: 'intro' }
    );
  };

  const finish = (index: number, reached: ReachedBoard, ms: number) => {
    const hand = hands[index];
    const target = bestTarget(hand.targets);
    if (!target) return;
    const attempt: PracticeAttempt = {
      number: index + 1,
      hand,
      target,
      reached,
      score: scoreHand(reached, target),
      ms,
    };
    setAttempts((prev) => [...prev, attempt]);
    setPhase({ kind: 'result', attempt });
  };

  const next = (number: number) =>
    setPhase(
      number < hands.length
        ? { kind: 'playing', index: number, startedAt: Date.now() }
        : { kind: 'summary' }
    );

  if (phase.kind === 'intro') {
    const impossible = setup.targets.length === 0;
    return (
      <section className="mx-auto flex h-dvh w-full max-w-2xl flex-col justify-center gap-5 p-8">
        <h1 className="font-display text-4xl">{t('practice.title')}</h1>
        <p className="font-mono text-xs text-text-muted">{setup.deckName}</p>
        <p className="text-text-muted">{t('practice.intro', { count: PRACTICE_HANDS })}</p>
        {impossible || empty ? (
          <p className="rounded-md border border-warning/40 bg-warning-tint p-3 text-sm text-warning">
            {!impossible
              ? t('practice.noHands')
              : setup.comboCount
                ? t('practice.noPracticable', { count: setup.comboCount })
                : t('practice.noTargets')}
          </p>
        ) : (
          <p className="text-xs text-text-subtle">
            {t('practice.targetCount', { count: setup.targets.length })}
          </p>
        )}
        <div className="flex items-center gap-3">
          <Button onClick={begin} disabled={impossible}>
            <Play />
            {t('practice.start')}
          </Button>
          <Button asChild variant="line">
            {/* Ohne übbare Line führt der Weg zu den Combos, dort lässt sie sich anpassen */}
            {impossible && setup.comboCount ? (
              <Link href={`/decks/${setup.deckId}?tab=combos`}>{t('practice.toCombos')}</Link>
            ) : (
              <Link href={`/decks/${setup.deckId}?tab=hand`}>{t('practice.backToDeck')}</Link>
            )}
          </Button>
        </div>
      </section>
    );
  }

  if (phase.kind === 'result')
    return (
      <PracticeResult
        attempt={phase.attempt}
        cards={cards}
        last={phase.attempt.number >= hands.length}
        onNext={() => next(phase.attempt.number)}
        onQuit={quit}
      />
    );

  if (phase.kind === 'summary')
    return (
      <PracticeSummary
        deckId={setup.deckId}
        deckName={setup.deckName}
        attempts={attempts}
        cards={cards}
        onAgain={begin}
      />
    );

  const { index, startedAt } = phase;
  const doc: LoadedCombo = {
    id: `practice-${index}`,
    title: t('practice.title'),
    deckId: setup.deckId,
    tags: [],
    status: 'DRAFT',
    revision: 0,
    startState: startStateFor(hands[index].hand),
    nodes: [],
    cards: setup.cards,
  };

  return (
    // Jede Hand bekommt eine eigene Werkbank: Verlauf, Auswahl und Board starten sauber
    <Workbench
      key={index}
      initial={doc}
      staples={staples}
      decks={decks}
      practice={{
        number: index + 1,
        total: hands.length,
        deckName: setup.deckName,
        startedAt,
        onFinish: (reached, ms) => finish(index, reached, ms),
        onQuit: quit,
      }}
    />
  );
}
