import { useCallback, useState } from 'react';
import type { EditState, HistoryEntry } from './types';

/** Snapshot-based undo/redo over the non-destructive edit state. */
export function useHistory() {
  const [h, setH] = useState<{ entries: HistoryEntry[]; index: number }>({ entries: [], index: -1 });

  const reset = useCallback((state: EditState, label = 'Original') => setH({ entries: [{ label, state }], index: 0 }), []);

  /** Push a new state. `coalesce` replaces the top entry when it has the same label (slider drags). */
  const push = useCallback((label: string, state: EditState, coalesce = false) => {
    setH((cur) => {
      const base = cur.entries.slice(0, cur.index + 1);
      if (coalesce && base.length > 1 && base[base.length - 1].label === label) base[base.length - 1] = { label, state };
      else base.push({ label, state });
      return { entries: base, index: base.length - 1 };
    });
  }, []);

  const undo = useCallback(() => setH((c) => ({ ...c, index: Math.max(0, c.index - 1) })), []);
  const redo = useCallback(() => setH((c) => ({ ...c, index: Math.min(c.entries.length - 1, c.index + 1) })), []);
  const jump = useCallback((i: number) => setH((c) => ({ ...c, index: Math.max(0, Math.min(c.entries.length - 1, i)) })), []);

  const state = h.index >= 0 ? h.entries[h.index].state : null;
  return {
    state,
    entries: h.entries,
    index: h.index,
    canUndo: h.index > 0,
    canRedo: h.index < h.entries.length - 1,
    reset,
    push,
    undo,
    redo,
    jump,
  };
}
