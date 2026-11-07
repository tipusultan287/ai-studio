import { useCallback, useReducer } from 'react';
import type { EditState } from './types';

type H = { past: EditState[]; present: EditState | null; draft: EditState | null; future: EditState[] };
type A =
  | { type: 'reset'; s: EditState }
  | { type: 'draft'; s: EditState }
  | { type: 'commit' }
  | { type: 'apply'; s: EditState }
  | { type: 'undo' }
  | { type: 'redo' };

const LIMIT = 60;

function reducer(h: H, a: A): H {
  switch (a.type) {
    case 'reset':
      return { past: [], present: a.s, draft: null, future: [] };
    case 'draft':
      return { ...h, draft: a.s };
    case 'commit':
      if (!h.draft || !h.present || h.draft === h.present) return { ...h, draft: null };
      return { past: [...h.past, h.present].slice(-LIMIT), present: h.draft, draft: null, future: [] };
    case 'apply':
      if (!h.present) return { past: [], present: a.s, draft: null, future: [] };
      return { past: [...h.past, h.present].slice(-LIMIT), present: a.s, draft: null, future: [] };
    case 'undo': {
      if (h.draft) return { ...h, draft: null };
      const prev = h.past[h.past.length - 1];
      if (!prev || !h.present) return h;
      return { past: h.past.slice(0, -1), present: prev, draft: null, future: [h.present, ...h.future] };
    }
    case 'redo': {
      const next = h.future[0];
      if (!next || !h.present) return h;
      return { past: [...h.past, h.present], present: next, draft: null, future: h.future.slice(1) };
    }
  }
}

/** Undo/redo stack with a "draft" for live slider/gesture edits that commit as one step. */
export function useHistory() {
  const [h, dispatch] = useReducer(reducer, { past: [], present: null, draft: null, future: [] });
  const reset = useCallback((s: EditState) => dispatch({ type: 'reset', s }), []);
  const draft = useCallback((s: EditState) => dispatch({ type: 'draft', s }), []);
  const commit = useCallback(() => dispatch({ type: 'commit' }), []);
  const apply = useCallback((s: EditState) => dispatch({ type: 'apply', s }), []);
  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);
  return {
    state: h.draft ?? h.present,
    canUndo: h.past.length > 0 || !!h.draft,
    canRedo: h.future.length > 0,
    dirty: h.past.length > 0,
    reset,
    draft,
    commit,
    apply,
    undo,
    redo,
  };
}
