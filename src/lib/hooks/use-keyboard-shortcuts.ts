import { useEffect, useCallback, useRef, useState } from 'react';
import * as React from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: (e: KeyboardEvent) => void;
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  ignoreInputs?: boolean;
}

/**
 * Hook für Keyboard-Shortcuts
 *
 * @param shortcuts - Array von Shortcut-Definitionen
 * @param enabled - Ob Shortcuts aktiviert sind (default: true)
 * @param ignoreInputs - Ob Shortcuts in Input-Feldern ignoriert werden sollen (default: true)
 */
export function useKeyboardShortcuts({
  shortcuts,
  enabled = true,
  ignoreInputs = true,
}: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts);

  // Aktualisiere Ref wenn shortcuts sich ändern
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      // Ignoriere wenn in Input-Feldern getippt wird
      if (ignoreInputs) {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target instanceof HTMLElement && e.target.isContentEditable)
        ) {
          return;
        }
      }

      // Prüfe alle Shortcuts
      for (const shortcut of shortcutsRef.current) {
        const keyMatches = shortcut.key.toLowerCase() === e.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const metaMatches = shortcut.meta ? e.metaKey : !e.metaKey;
        const shiftMatches = shortcut.shift === undefined ? true : shortcut.shift === e.shiftKey;
        const altMatches = shortcut.alt === undefined ? true : shortcut.alt === e.altKey;

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
          e.preventDefault();
          shortcut.handler(e);
          break; // Nur ersten passenden Shortcut ausführen
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, ignoreInputs]);
}

/**
 * Hook für Multi-Select mit Keyboard und Mouse
 */
export function useMultiSelect<T extends { id: string }>(
  items: T[],
  onSelectionChange?: (selectedIds: Set<string>) => void
) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const lastSelectedIndexRef = React.useRef<number>(-1);

  const toggleSelection = useCallback(
    (id: string, index: number, event?: React.MouseEvent | KeyboardEvent) => {
      setSelectedIds((prev) => {
        const newSelection = new Set(prev);

        if (event?.ctrlKey || event?.metaKey) {
          // Ctrl/Cmd+Click: Toggle einzelnes Item
          if (newSelection.has(id)) {
            newSelection.delete(id);
          } else {
            newSelection.add(id);
          }
          lastSelectedIndexRef.current = index;
        } else if (event?.shiftKey && lastSelectedIndexRef.current >= 0) {
          // Shift+Click: Range-Select
          const start = Math.min(lastSelectedIndexRef.current, index);
          const end = Math.max(lastSelectedIndexRef.current, index);
          for (let i = start; i <= end; i++) {
            newSelection.add(items[i].id);
          }
        } else {
          // Normaler Click: Nur dieses Item
          newSelection.clear();
          newSelection.add(id);
          lastSelectedIndexRef.current = index;
        }

        onSelectionChange?.(newSelection);
        return newSelection;
      });
    },
    [items, onSelectionChange]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedIndexRef.current = -1;
    onSelectionChange?.(new Set());
  }, [onSelectionChange]);

  const selectAll = useCallback(() => {
    const allIds = new Set(items.map((item) => item.id));
    setSelectedIds(allIds);
    onSelectionChange?.(allIds);
  }, [items, onSelectionChange]);

  return {
    selectedIds,
    toggleSelection,
    clearSelection,
    selectAll,
    isSelected: (id: string) => selectedIds.has(id),
  };
}
