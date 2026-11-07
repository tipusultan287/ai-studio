import { File, Paths } from 'expo-file-system';
import { ffmpeg, ffmpegAvailable, fsPath } from '@/lib/ffmpeg';
import { peaksDecodeArgs } from './render';

export type Peaks = { data: number[]; perSec: number; real: boolean };

const RATE = 8000;
const cache = new Map<string, Peaks>();

/** Peaks-per-second resolution, reduced for long files to keep arrays small. */
const resolutionFor = (durationSec: number) => Math.max(4, Math.min(60, Math.floor(120000 / Math.max(1, durationSec))));

/** Downsample signed 16-bit little-endian PCM bytes into normalised 0..1 peaks. */
export function pcmToPeaks(bytes: Uint8Array, perSec: number): number[] {
  const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  const bucket = Math.max(1, Math.floor(RATE / perSec));
  const out: number[] = [];
  let max = 0;
  for (let i = 0; i < samples.length; i += bucket) {
    let peak = 0;
    let sum = 0;
    const end = Math.min(samples.length, i + bucket);
    for (let j = i; j < end; j++) {
      const v = Math.abs(samples[j]);
      if (v > peak) peak = v;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / Math.max(1, end - i));
    const val = peak * 0.6 + rms * 1.4;
    out.push(val);
    if (val > max) max = val;
  }
  const scale = max > 0 ? 1 / max : 0;
  return out.map((v) => Math.min(1, v * scale));
}

/** Deterministic pseudo-waveform (seeded by the uri) used when FFmpeg is unavailable. */
export function pseudoPeaks(seedStr: string, durationSec: number): Peaks {
  const perSec = resolutionFor(durationSec);
  let seed = 2166136261;
  for (let i = 0; i < seedStr.length; i++) seed = Math.imul(seed ^ seedStr.charCodeAt(i), 16777619);
  const rand = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    return ((seed ^= seed >>> 16) >>> 0) / 4294967296;
  };
  const count = Math.max(1, Math.ceil(durationSec * perSec));
  const out: number[] = [];
  let env = 0.5;
  for (let i = 0; i < count; i++) {
    if (i % Math.max(1, Math.floor(perSec / 2)) === 0) env = 0.25 + rand() * 0.75;
    const prev = out[i - 1] ?? 0.4;
    out.push(Math.min(1, Math.max(0.05, prev * 0.45 + (0.2 + rand() * 0.8) * env * 0.55)));
  }
  return { data: out, perSec, real: false };
}

/** Peaks from recorder metering samples (dB) captured at `intervalMs`. */
export function meteringPeaks(db: number[], intervalMs: number): Peaks {
  return { data: db.map((d) => Math.max(0.04, Math.min(1, (d + 55) / 55))), perSec: 1000 / intervalMs, real: true };
}

export function seedPeaks(uri: string, p: Peaks) {
  cache.set(uri, p);
}

/** Real peaks via FFmpeg decode to raw PCM; falls back to pseudo peaks. */
export async function computePeaks(uri: string, durationSec: number): Promise<Peaks> {
  const hit = cache.get(uri);
  if (hit) return hit;
  if (!ffmpegAvailable() || !uri.startsWith('file://')) return pseudoPeaks(uri, durationSec);
  const tmp = new File(Paths.cache, `peaks-${Date.now().toString(36)}.raw`);
  try {
    await ffmpeg(peaksDecodeArgs(fsPath(uri), fsPath(tmp.uri), RATE)).promise;
    const bytes = await tmp.bytes();
    const dur = bytes.byteLength / 2 / RATE;
    const perSec = resolutionFor(dur || durationSec);
    const p: Peaks = { data: pcmToPeaks(bytes, perSec), perSec, real: true };
    cache.set(uri, p);
    return p;
  } catch {
    return pseudoPeaks(uri, durationSec);
  } finally {
    try {
      if (tmp.exists) tmp.delete();
    } catch {}
  }
}

/** Duration (s) derivable from decoded peaks, when real. */
export const peaksDuration = (p: Peaks) => p.data.length / p.perSec;
