'use client';

import { useMemo } from 'react';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { ComboCard } from '@/lib/combo/cards';
import type { LineStep } from '@/lib/combo/lines';
import type { ComboNodeData, GameState } from '@/lib/combo/state';
import { hitsByStep, stressTest, type Hit } from '@/lib/combo/stress';
import type { StapleCard } from '@/server/actions/combo.actions';
import type { RailStaple } from './StapleRail';

/**
 * Stresstest der aktuellen Line (UX-Plan 6.8): Staple-Auswahl aus den Einstellungen,
 * Treffer pro Schritt und die Schrittnummern für Leiste und Branch-Namen.
 */
export function useStress({
  line,
  steps,
  states,
  start,
  cards,
  staples,
  pairs = false,
}: {
  line: ComboNodeData[];
  steps: LineStep[];
  states: Map<string, GameState>;
  start: GameState;
  cards: Map<string, ComboCard>;
  staples: StapleCard[];
  /** Paare prüfen: in einem Branch mit Unterbrechung zählen die Treffer danach */
  pairs?: boolean;
}) {
  const { settings } = useSettings();

  // Gegnerische Staples in der Reihenfolge der Einstellungen; ohne Auswahl die Standardliste
  const chosen = useMemo(() => {
    const opponent = staples.filter((s) => s.staple.side === 'opponent');
    if (!settings.staples) return opponent;
    return settings.staples.flatMap((name) => opponent.filter((s) => s.staple.name === name));
  }, [staples, settings.staples]);

  const entries = useMemo(
    () => chosen.map((s) => ({ staple: s.staple, cardId: s.card.id })),
    [chosen]
  );
  const hits = useMemo(
    () => stressTest(line, states, start, cards, entries, { pairs }),
    [line, states, start, cards, entries, pairs]
  );
  const byStep = useMemo(() => hitsByStep(hits), [hits]);

  const numberOf = useMemo(() => {
    const numbers = new Map(steps.map((s) => [s.node.id, s.number]));
    return (nodeId: string | null) => (nodeId ? numbers.get(nodeId) : undefined);
  }, [steps]);

  const rail = useMemo(
    (): RailStaple[] =>
      chosen.map((s) => ({
        name: s.staple.name,
        card: s.card,
        steps: [
          ...new Set(
            hits
              .filter((h) => h.staple === s.staple.name)
              .map((h) => numberOf(h.stepId))
              .filter((n): n is number => n !== undefined)
          ),
        ].sort((a, b) => a - b),
      })),
    [chosen, hits, numberOf]
  );

  const shortOf = (name: string) => staples.find((s) => s.staple.name === name)?.staple.short;

  /** Schwachstellen für das Endboard: pro Schritt die Kurznamen der treffenden Staples */
  const weaknesses = useMemo(
    () =>
      steps.flatMap((s) => {
        const list = byStep.get(s.node.id) ?? [];
        return list.length
          ? [{ step: s.number, staples: list.map((h: Hit) => shortOf(h.staple) ?? h.staple) }]
          : [];
      }),
    // shortOf liest nur staples
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [steps, byStep, staples]
  );

  /** Zweite Unterbrechungen in einer anderen Line, für die Zahl an den Branch-Zeilen */
  const pairsIn = (otherLine: ComboNodeData[]) =>
    otherLine.filter((n) => n.kind === 'ACTIVATE' && n.player === 'opponent').length === 1
      ? stressTest(otherLine, states, start, cards, entries, { pairs: true }).length
      : 0;

  return { chosen, hits, byStep, rail, numberOf, weaknesses, shortOf, pairsIn };
}
