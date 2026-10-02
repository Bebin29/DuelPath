/** Tabs der Deckseite (UI-Plan 7.5.4); die Adresse enthält den Tab */
export type DeckTab = 'list' | 'ratios' | 'combos' | 'hand';
const TABS: DeckTab[] = ['list', 'ratios', 'combos', 'hand'];
export const parseTab = (v: unknown): DeckTab =>
  TABS.includes(v as DeckTab) ? (v as DeckTab) : 'list';
