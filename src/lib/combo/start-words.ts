import type { HitPattern, Staple } from '@/lib/combo/reactions';
import type { ComboNodeData } from '@/lib/combo/state';

/**
 * Wechselwörter der Startseite aus dem Stresstest der letzten Line (Szene „Start“):
 * „Wo stoppt dich Ash? In Schritt 2.“ und, durchgestrichen, ein Staple, der die Line nicht trifft.
 */
export interface StressWord {
  /** Kurzname des Staples, etwa „Ash“ */
  word: string;
  /** Erster getroffener Schritt; null = trifft diese Line nicht */
  step: number | null;
}

/**
 * Treffer nach frühestem Schritt, dazu immer eine Lücke, solange es eine gibt: Die Seite soll
 * nicht nur Probleme zeigen. `staples` in der Reihenfolge der Einstellungen.
 */
export function stressWords(
  staples: string[],
  hits: { word: string; step?: number }[],
  max = 4
): StressWord[] {
  const first = new Map<string, number>();
  for (const h of hits) {
    if (h.step === undefined) continue;
    first.set(h.word, Math.min(h.step, first.get(h.word) ?? Infinity));
  }
  const hit = [...first]
    .sort((a, b) => a[1] - b[1] || staples.indexOf(a[0]) - staples.indexOf(b[0]))
    .map(([word, step]) => ({ word, step }));
  const miss = staples.filter((s) => !first.has(s)).map((word) => ({ word, step: null }));
  return [...hit.slice(0, max - Math.min(1, miss.length)), ...miss].slice(0, max);
}

/** Muster, die den Gegner nur ziehen lassen (Mulcharmy): Druck, aber kein Stopp der Line */
const pressureOnly = (p: HitPattern) => p.startsWith('TURN_START');

/**
 * Taugt der Staple für „Wo stoppt dich …?“? Nur mit einem Muster, das die Line unterbricht.
 * Ohne Muster rechnet der Stresstest ihn nicht, ein „gar nicht“ wäre dann geraten.
 */
export function stopsLine(staple: Pick<Staple, 'hits'>): boolean {
  return staple.hits?.some((p) => !pressureOnly(p)) ?? false;
}

/**
 * Was die Headline aus dem Stresstest der Hauptline sagen darf. Leer, wenn es nichts Belastbares
 * gibt: ohne Schritte, oder wenn die Hauptline schon eine Unterbrechung enthält (dann prüft der
 * Stresstest nicht weiter, alles wäre fälschlich „gar nicht“).
 */
export function headlineWords(
  line: Pick<ComboNodeData, 'kind' | 'player'>[],
  staples: Pick<Staple, 'short' | 'hits'>[],
  hits: { short?: string; pattern: HitPattern; step?: number }[]
): StressWord[] {
  if (!line.length || line.some((n) => n.kind === 'ACTIVATE' && n.player === 'opponent')) {
    return [];
  }
  // Zwei gleiche Karten auf dem Gegnerboard sind zwei Störquellen, aber ein Wort
  const stoppers = [...new Set(staples.filter(stopsLine).map((s) => s.short))];
  return stressWords(
    stoppers,
    hits.flatMap((h) =>
      h.short && stoppers.includes(h.short) && stopsLine({ hits: [h.pattern] })
        ? [{ word: h.short, step: h.step }]
        : []
    )
  );
}
