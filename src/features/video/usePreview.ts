import { useEventListener } from 'expo';
import { useVideoPlayer, type VideoPlayer } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clipStarts, locate, projectLength, type VideoProject } from './types';

/** Player mutations live outside the hook so the React Compiler doesn't treat them as render mutations. */
function setProps(pl: VideoPlayer, props: Partial<Pick<VideoPlayer, 'currentTime' | 'playbackRate' | 'muted' | 'volume'>>) {
  Object.assign(pl, props);
}

/**
 * Drives one expo-video player across the multi-clip timeline: maps timeline time ↔ (clip, source time),
 * swaps sources at clip boundaries, applies per-clip trim (seek), speed (playbackRate) and volume.
 */
export function usePreview(project: VideoProject) {
  // Source stays null here: useVideoPlayer recreates the player when its source arg changes,
  // so clips are loaded imperatively with replaceAsync instead.
  const player = useVideoPlayer(null, (p) => {
    p.timeUpdateEventInterval = 0.05;
    p.preservesPitch = true;
    p.loop = false;
  });
  const [timeMs, setTimeMs] = useState(0);
  const [playing, setPlaying] = useState(false);

  const proj = useRef(project);
  const cur = useRef<{ index: number; uri: string | null }>({ index: 0, uri: null });
  const playingRef = useRef(false);
  const switching = useRef(false);

  useEffect(() => {
    proj.current = project;
  }, [project]);

  const applyClipProps = useCallback((pl: VideoPlayer, index: number) => {
    const p = proj.current;
    const c = p.clips[index];
    if (!c) return;
    setProps(pl, { playbackRate: c.speed, muted: p.muteOriginal, volume: Math.min(1, c.volume) });
  }, []);

  /** Load clip `index` (if needed) and seek to `sourceMs`. */
  const loadAt = useCallback(
    async (index: number, sourceMs: number) => {
      const c = proj.current.clips[index];
      if (!c) return;
      switching.current = true;
      try {
        if (cur.current.uri !== c.uri) {
          await player.replaceAsync(c.uri);
          cur.current = { index, uri: c.uri };
        }
        cur.current.index = index;
        setProps(player, { currentTime: sourceMs / 1000 });
        applyClipProps(player, index);
        if (playingRef.current) player.play();
      } catch {
        // source failed to load — leave the player paused
      } finally {
        switching.current = false;
      }
    },
    [player, applyClipProps],
  );

  const seek = useCallback(
    (t: number) => {
      const p = proj.current;
      const total = projectLength(p);
      const tt = Math.max(0, Math.min(total, t));
      setTimeMs(tt);
      const loc = locate(p, tt);
      if (loc) void loadAt(loc.index, loc.sourceMs);
    },
    [loadAt],
  );

  const pause = useCallback(() => {
    playingRef.current = false;
    setPlaying(false);
    player.pause();
  }, [player]);

  const play = useCallback(() => {
    const p = proj.current;
    if (!p.clips.length) return;
    const total = projectLength(p);
    playingRef.current = true;
    setPlaying(true);
    setTimeMs((t) => {
      const start = t >= total - 50 ? 0 : t;
      const loc = locate(p, start);
      if (loc) void loadAt(loc.index, loc.sourceMs);
      return start;
    });
  }, [loadAt]);

  const toggle = useCallback(() => (playingRef.current ? pause() : play()), [pause, play]);

  const advance = useCallback(() => {
    const p = proj.current;
    const next = cur.current.index + 1;
    if (next >= p.clips.length) {
      pause();
      setTimeMs(projectLength(p));
      return;
    }
    void loadAt(next, p.clips[next].inMs);
  }, [loadAt, pause]);

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    if (switching.current || !playingRef.current) return;
    const p = proj.current;
    const i = cur.current.index;
    const c = p.clips[i];
    if (!c) return;
    const src = currentTime * 1000;
    if (src >= c.outMs - 30) {
      advance();
      return;
    }
    const start = clipStarts(p)[i] ?? 0;
    setTimeMs(start + Math.max(0, src - c.inMs) / c.speed);
  });

  useEventListener(player, 'playToEnd', () => {
    if (playingRef.current) advance();
  });

  // When clips change (trim/speed/volume/etc.) re-apply props and keep the frame in sync while paused.
  useEffect(() => {
    if (!project.clips.length) return;
    applyClipProps(player, Math.min(cur.current.index, project.clips.length - 1));
  }, [project, player, applyClipProps]);

  return { player, timeMs, playing, play, pause, toggle, seek };
}
