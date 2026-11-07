import { useCallback, useState } from 'react';
import { EMPTY_PROJECT, type VideoProject } from './types';

type History = { past: VideoProject[]; present: VideoProject; future: VideoProject[]; lastKey?: string };
const LIMIT = 60;

/**
 * Project state with undo/redo. `update(fn, key)` — consecutive updates with the same `key`
 * (e.g. a slider drag "speed:clipId") coalesce into one undo step.
 */
export function useProject(initial: VideoProject = EMPTY_PROJECT) {
  const [h, setH] = useState<History>({ past: [], present: initial, future: [] });

  const update = useCallback((fn: (p: VideoProject) => VideoProject, key?: string) => {
    setH((s) => {
      const next = fn(s.present);
      if (next === s.present) return s;
      if (key && key === s.lastKey) return { ...s, present: next };
      return { past: [...s.past, s.present].slice(-LIMIT), present: next, future: [], lastKey: key };
    });
  }, []);

  /** Apply to every history entry without creating an undo step (e.g. filling in probed durations). */
  const patchAll = useCallback((fn: (p: VideoProject) => VideoProject) => {
    setH((s) => ({ ...s, past: s.past.map(fn), present: fn(s.present), future: s.future.map(fn) }));
  }, []);

  /** Replace without an undo step (initial load). */
  const reset = useCallback((p: VideoProject) => setH({ past: [], present: p, future: [] }), []);

  const undo = useCallback(
    () =>
      setH((s) =>
        s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s,
      ),
    [],
  );
  const redo = useCallback(
    () => setH((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s)),
    [],
  );

  return { project: h.present, update, patchAll, reset, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}
