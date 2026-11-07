/**
 * On-device FFmpeg adapter (video/audio export). Uses `ffmpeg-expo` when the
 * native module is present (dev build). In Expo Go / web it reports unavailable
 * so editors can still preview and explain that export needs a dev build.
 * Swap the engine here if you prefer another FFmpeg binding.
 */
import { Platform } from 'react-native';

type Engine = typeof import('ffmpeg-expo');
let engine: Engine | null | undefined;

function load(): Engine | null {
  if (engine !== undefined) return engine;
  if (Platform.OS === 'web') return (engine = null);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('ffmpeg-expo') as Engine;
    m.getVersion(); // throws if native module missing
    engine = m;
  } catch {
    engine = null;
  }
  return engine;
}

export const ffmpegAvailable = () => !!load();

export class FFmpegUnavailableError extends Error {
  constructor() {
    super('Exporting needs the full app build (FFmpeg). Run `npx expo run:ios` or `npx expo run:android`.');
  }
}

/** Strip file:// for FFmpeg paths. */
export const fsPath = (uri: string) => (uri.startsWith('file://') ? decodeURI(uri.slice(7)) : uri);

export type FFJob = { promise: Promise<void>; cancel: () => void };

/**
 * Run ffmpeg with an argument array. `totalMs` lets us turn time progress into 0..1.
 */
export function ffmpeg(args: string[], opts: { totalMs?: number; onProgress?: (p: number) => void } = {}): FFJob {
  const m = load();
  if (!m) return { promise: Promise.reject(new FFmpegUnavailableError()), cancel: () => {} };
  const session = m.run(['-hide_banner', '-y', ...args], {
    logLevel: 'error',
    onProgress: (p) => {
      const total = opts.totalMs ?? (p.totalDuration ? p.totalDuration * 1000 : 0);
      // p.time is in ms per ffmpeg-kit semantics; normalise if seconds
      const t = p.time > 10_000 || !total ? p.time : p.time * 1000;
      if (total) opts.onProgress?.(Math.max(0, Math.min(1, t / total)));
    },
  });
  return {
    promise: session.result.then((r) => {
      if (r.returnCode !== 0) throw new Error(`FFmpeg failed (${r.returnCode}): ${r.output.slice(-400)}`);
    }),
    cancel: () => void session.cancel(),
  };
}

/** Escape text for drawtext. */
export const escapeDrawtext = (s: string) => s.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\u2019").replace(/%/g, '\\%');
