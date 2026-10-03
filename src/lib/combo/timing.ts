/**
 * Dauer einer Line: Schrittzahl und echte Zeit.
 *
 * Eine Runde hat 40 Minuten plus End of Match. Eine Line, die über sieben Minuten läuft, ist
 * deshalb eine eigene Verlustbedingung und ein Slow-Play-Risiko. Die App misst die Zeit nicht
 * im Baum, sondern nur dort, wo jemand die Line wirklich durchspielt; überall sonst steht die
 * Schrittzahl, weil „31 Schritte statt 23“ beim Vergleich zweier Lines schon genug sagt.
 */

import { lineSteps, lineThrough } from '@/lib/combo/lines';
import type { ComboNodeData } from '@/lib/combo/state';

/** Ab hier gilt die Line als zu langsam für eine 40-Minuten-Runde */
export const SLOW_PLAY_MS = 7 * 60 * 1000;
/** Erste Warnstufe, damit die Uhr vor der Grenze auffällt */
export const SLOW_PLAY_WARN_MS = 5 * 60 * 1000;

export type Pace = 'ok' | 'warn' | 'slow';

/** Wie die gemessene Zeit einzuordnen ist */
export function paceOf(ms: number): Pace {
  if (ms >= SLOW_PLAY_MS) return 'slow';
  if (ms >= SLOW_PLAY_WARN_MS) return 'warn';
  return 'ok';
}

/** „0:07“, „12:03“, ab einer Stunde „1:02:03“ */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export type ClockPhase = 'reset' | 'run' | 'hold';

/**
 * Was die Uhr im Übungsmodus tun soll: an der Starthand zurücksetzen, beim eigenen Durchgehen
 * laufen und stehen bleiben, sobald die App abspielt oder die Line zu Ende ist. Gemessen wird
 * nur, was der Spieler selbst braucht; die Abspielgeschwindigkeit sagt dazu nichts.
 */
export function practiceClock(position: number, total: number, playing: boolean): ClockPhase {
  if (position <= 0) return 'reset';
  return !playing && position < total ? 'run' : 'hold';
}

/** Für die reine Schrittzahl zählen nur die Zeilen, nicht ihre Beschriftung */
const NO_LABEL = () => '';

/** Sichtbare Schritte der Line durch diesen Knoten; RESOLVE und OPPONENT zählen nicht mit */
export function lineStepCount(nodes: ComboNodeData[], nodeId: string | null): number {
  return lineSteps(nodes, lineThrough(nodes, nodeId), NO_LABEL).length;
}
