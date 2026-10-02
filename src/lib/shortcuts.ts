/**
 * Alle Tastenkürzel (UX-Plan 9) für die Tastaturhilfe (UI-Plan 7.4.6), in Gruppen.
 * Texte stehen unter help.keys.<id>. Tastennamen in KEY_WORDS werden übersetzt (Strg, Ctrl).
 */
export interface Shortcut {
  id: string;
  keys: string[];
}

export const SHORTCUT_GROUPS: { id: string; items: Shortcut[] }[] = [
  {
    id: 'general',
    items: [
      { id: 'palette', keys: ['ctrl', 'K'] },
      { id: 'help', keys: ['?'] },
      { id: 'undo', keys: ['ctrl', 'Z'] },
      { id: 'redo', keys: ['ctrl', 'shift', 'Z'] },
    ],
  },
  {
    id: 'navigation',
    items: [
      { id: 'mode', keys: ['V'] },
      { id: 'steps', keys: ['←', '→'] },
      { id: 'branches', keys: ['↑', '↓'] },
      { id: 'play', keys: ['space'] },
      { id: 'stress', keys: ['T'] },
      { id: 'lines', keys: ['L'] },
    ],
  },
  {
    id: 'playing',
    items: [
      { id: 'quick', keys: ['/'] },
      { id: 'menu', keys: ['M'] },
      { id: 'menuFocused', keys: ['Enter'] },
      { id: 'summon', keys: ['N'] },
      { id: 'set', keys: ['S'] },
      { id: 'activate', keys: ['A'] },
      { id: 'effect', keys: ['1', '…', '9'] },
      { id: 'position', keys: ['P'] },
      { id: 'move', keys: ['G', 'B', 'H', 'D'] },
      { id: 'end', keys: ['E'] },
    ],
  },
  {
    id: 'chain',
    items: [
      { id: 'resolve', keys: ['Enter'] },
      { id: 'chain', keys: ['C'] },
      { id: 'opponent', keys: ['O'] },
      { id: 'cancel', keys: ['Esc'] },
      { id: 'unpick', keys: ['Esc'] },
    ],
  },
  {
    id: 'editing',
    items: [
      { id: 'delete', keys: ['del'] },
      { id: 'edit', keys: ['dblclick'] },
      { id: 'command', keys: ['ctrl', 'K', 'ns aluber'] },
    ],
  },
];

/** Tastennamen, die je nach Sprache anders heißen */
export const KEY_WORDS = ['ctrl', 'shift', 'space', 'del', 'dblclick'];
