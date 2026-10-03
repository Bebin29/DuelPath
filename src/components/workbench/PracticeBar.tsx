'use client';

import { useEffect, useState } from 'react';
import { Flag, Redo2, Timer, Undo2, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { formatDuration, type ReachedBoard } from '@/lib/deck/practice';

/** Ein Übungslauf, wie ihn die Werkbank sieht (Lücke L2) */
export interface PracticeRun {
  /** Nummer der Hand im Lauf, 1-basiert */
  number: number;
  total: number;
  deckName: string;
  /** Zeitpunkt, an dem die Hand aufgedeckt wurde; die Uhr läuft seitdem */
  startedAt: number;
  /** Der Nutzer erklärt die Hand für beendet; die Zeit in Millisekunden */
  onFinish: (reached: ReachedBoard, ms: number) => void;
  onQuit: () => void;
}

/**
 * Gelaufene Zeit seit dem Start, jede Sekunde neu. Gerechnet wird aus Zeitstempeln, nicht aus
 * gezählten Ticks: ein verschlafener Timer im Hintergrundtab verliert so keine Zeit. Jede Hand
 * bekommt eine eigene Leiste, deshalb reicht der Stand beim ersten Rendern als Anfang.
 */
export function useElapsed(startedAt: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return Math.max(0, now - startedAt);
}

/**
 * Kopfzeile im Übungsmodus (Lücke L2) statt der Workbench-Kopfzeile: welche Hand, wie lange schon,
 * und der Knopf, der die Hand auswertet. Titel, Deck und Status gibt es hier nicht, der Lauf wird
 * nicht gespeichert.
 */
export function PracticeBar({
  run,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onFinish,
}: {
  run: PracticeRun;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFinish: () => void;
}) {
  const { t } = useTranslation();
  const elapsed = useElapsed(run.startedAt);
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface-1 px-4">
      <Button variant="ghost" size="icon-sm" onClick={run.onQuit} aria-label={t('practice.quit')}>
        <X />
      </Button>
      <h1 className="font-display text-xl leading-none text-ink">{t('practice.title')}</h1>
      <span className="max-w-44 truncate font-mono text-xs text-text-muted">{run.deckName}</span>
      <span className="h-5 w-px bg-line" />
      <p className="font-mono text-xs text-text-muted">
        {t('practice.handOf', { n: run.number, total: run.total })}
      </p>

      <span className="flex-1" />
      <p
        className="flex items-center gap-1.5 font-mono text-sm tabular-nums text-text-muted"
        aria-label={t('practice.elapsed')}
      >
        <Timer className="size-3.5" />
        {formatDuration(elapsed)}
      </p>
      <span className="flex-1" />

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={`${t('workbench.undo')} (Strg+Z)`}
        title={`${t('workbench.undo')} (Strg+Z)`}
      >
        <Undo2 />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label={`${t('workbench.redo')} (Strg+Umschalt+Z)`}
        title={`${t('workbench.redo')} (Strg+Umschalt+Z)`}
      >
        <Redo2 />
      </Button>
      <span className="h-5 w-px bg-line" />
      <Button onClick={onFinish}>
        <Flag />
        {t('practice.finishHand')}
      </Button>
    </header>
  );
}
