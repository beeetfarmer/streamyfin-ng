import { useCallback, useState } from "react";

/**
 * Lightweight multi-select state for list/grid screens.
 *
 * Tracks whether selection mode is active and the set of selected ids. Ids are
 * arbitrary strings (item ids, or grouped ids like episode ids for a series).
 */
export function useSelection() {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /** Add or remove many ids at once (used for grouped rows and select-all). */
  const setMany = useCallback((ids: string[], value: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (value) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  /** Leave selection mode and drop the current selection. */
  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelected(new Set());
  }, []);

  return {
    selectionMode,
    setSelectionMode,
    selected,
    count: selected.size,
    isSelected,
    toggle,
    setMany,
    clear,
    exitSelection,
  };
}
