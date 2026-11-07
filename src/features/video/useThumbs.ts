import * as VideoThumbnails from 'expo-video-thumbnails';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/** Module cache: uri → sorted [timeMs, thumbUri] frames. */
const cache = new Map<string, { t: number; uri: string }[]>();
const pending = new Map<string, Promise<{ t: number; uri: string }[]>>();

async function build(uri: string, durationMs: number) {
  if (Platform.OS === 'web') return [];
  const count = Math.max(2, Math.min(24, Math.ceil(durationMs / 1000)));
  const step = durationMs / count;
  const out: { t: number; uri: string }[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.round(i * step + step / 2);
    try {
      const r = await VideoThumbnails.getThumbnailAsync(uri, { time: t, quality: 0.35 });
      out.push({ t, uri: r.uri });
    } catch {
      // ignore unreadable frame
    }
  }
  return out;
}

/** Filmstrip thumbnails for a video source, generated lazily and cached per uri. */
export function useThumbs(uri: string, durationMs: number) {
  const [loaded, setLoaded] = useState<{ uri: string; frames: { t: number; uri: string }[] } | null>(null);
  useEffect(() => {
    let alive = true;
    if (cache.has(uri)) return;
    let job = pending.get(uri);
    if (!job) {
      job = build(uri, durationMs).then((f) => {
        cache.set(uri, f);
        pending.delete(uri);
        return f;
      });
      pending.set(uri, job);
    }
    void job.then((f) => alive && setLoaded({ uri, frames: f }));
    return () => {
      alive = false;
    };
  }, [uri, durationMs]);
  return cache.get(uri) ?? (loaded?.uri === uri ? loaded.frames : []);
}

export function nearestFrame(frames: { t: number; uri: string }[], t: number): string | undefined {
  let best: { t: number; uri: string } | undefined;
  for (const f of frames) if (!best || Math.abs(f.t - t) < Math.abs(best.t - t)) best = f;
  return best?.uri;
}

/** One-off frame grab (for clip cover). */
export async function grabFrame(uri: string, timeMs = 300): Promise<string | undefined> {
  if (Platform.OS === 'web') return undefined;
  try {
    return (await VideoThumbnails.getThumbnailAsync(uri, { time: timeMs, quality: 0.5 })).uri;
  } catch {
    return undefined;
  }
}
