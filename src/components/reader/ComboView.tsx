'use client';

import { useMediaQuery } from '@/lib/hooks/use-media-query';
import { Workbench } from '@/components/workbench/Workbench';
import type { LoadedCombo, StapleCard } from '@/server/actions/combo.actions';
import { ComboReader } from './ComboReader';

/**
 * Combo unter einer URL auf jedem Gerät (UI-Sweep-Plan 4.2): ab 1024 px die Workbench,
 * darunter die Lese- und Nachspielansicht. Bis die Breite bekannt ist, bleibt die Fläche leer.
 */
export function ComboView(props: {
  initial: LoadedCombo;
  staples: StapleCard[];
  decks: { id: string; name: string }[];
  initialView?: string;
  initialStep?: string;
}) {
  const wide = useMediaQuery('(min-width: 1024px)');
  if (wide === null) return null;
  return wide ? (
    <Workbench {...props} />
  ) : (
    <ComboReader initial={props.initial} staples={props.staples} initialStep={props.initialStep} />
  );
}
