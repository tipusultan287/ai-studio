/**
 * Pure FFmpeg argument builders for the audio editor. No side effects, so the
 * filter graph can be reasoned about (and unit tested) without a device.
 */
import { totalLength } from './timeline';
import type { EditState, EffectId, ExportFormat } from './types';

export const SR = 44100;
const n = (v: number) => Number(v.toFixed(4)).toString();

/** atempo only accepts 0.5..2 (older builds) so chain stages for other factors. */
export function atempoChain(f: number): string[] {
  const out: string[] = [];
  let r = f;
  while (r > 2) {
    out.push('atempo=2');
    r /= 2;
  }
  while (r < 0.5) {
    out.push('atempo=0.5');
    r /= 0.5;
  }
  if (Math.abs(r - 1) > 1e-4) out.push(`atempo=${n(r)}`);
  return out;
}

export const EFFECT_FILTERS: Record<EffectId, string[]> = {
  none: [],
  bass: ['bass=g=8:f=110:w=0.6'],
  voice: ['highpass=f=90', 'equalizer=f=3000:t=q:w=1.2:g=4', 'equalizer=f=250:t=q:w=1:g=-3', 'acompressor=threshold=0.1:ratio=3:attack=10:release=120'],
  telephone: ['highpass=f=400', 'lowpass=f=3200', 'acompressor=threshold=0.2:ratio=4', 'volume=2dB'],
  radio: ['highpass=f=200', 'lowpass=f=5000', 'equalizer=f=1500:t=q:w=1:g=5', 'acompressor=threshold=0.15:ratio=5:attack=5:release=80'],
  echo: ['aecho=0.8:0.85:280|560:0.4|0.22'],
  reverb: ['aecho=0.8:0.9:40|70|110|160:0.32|0.26|0.2|0.14'],
  denoise: ['afftdn=nr=14:nf=-35', 'highpass=f=60'],
};

/** Length (seconds) of the rendered output. */
export function outputDuration(s: EditState, appendSec = 0) {
  return (totalLength(s.segments) + appendSec) / s.speed;
}

/** Filter chain applied after segments are assembled (string list joined with ','). */
export function postFilters(s: EditState, lengthSec: number): string[] {
  const f: string[] = [];
  if (s.fadeIn > 0) f.push(`afade=t=in:st=0:d=${n(Math.min(s.fadeIn, lengthSec))}`);
  if (s.fadeOut > 0) {
    const d = Math.min(s.fadeOut, lengthSec);
    f.push(`afade=t=out:st=${n(Math.max(0, lengthSec - d))}:d=${n(d)}`);
  }
  f.push(...EFFECT_FILTERS[s.effect]);
  if (s.gainDb !== 0) f.push(`volume=${n(s.gainDb)}dB`);
  if (s.pitch !== 0) {
    const r = Math.pow(2, s.pitch / 12);
    f.push(`asetrate=${Math.round(SR * r)}`, `aresample=${SR}`, ...atempoChain(1 / r));
  }
  f.push(...atempoChain(s.speed));
  if (s.normalize) f.push('loudnorm=I=-16:TP=-1.5:LRA=11', `aresample=${SR}`);
  return f;
}

export function codecArgs(fmt: ExportFormat): string[] {
  if (fmt === 'mp3') return ['-c:a', 'libmp3lame', '-q:a', '2'];
  if (fmt === 'wav') return ['-c:a', 'pcm_s16le'];
  return ['-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart'];
}

const norm = `aresample=${SR},aformat=sample_fmts=fltp:channel_layouts=stereo`;

/**
 * Build the full ffmpeg argument list (without -y / -hide_banner, which the
 * adapter adds). `inPath`, `outPath` and `appendPaths` must be filesystem paths
 * (use fsPath()). `appendSec` = total length of appended clips (for fade-out timing).
 */
export function buildRenderArgs(p: {
  state: EditState;
  inPath: string;
  outPath: string;
  format: ExportFormat;
  appendPaths?: string[];
  appendSec?: number;
}): string[] {
  const { state: s, inPath, outPath, format } = p;
  const appends = p.appendPaths ?? [];
  const segs = s.segments.length ? s.segments : [{ start: 0, end: s.sourceDuration }];
  const parts: string[] = [];
  const k = segs.length;
  parts.push(k > 1 ? `[0:a]${norm},asplit=${k}${segs.map((_, i) => `[s${i}]`).join('')}` : `[0:a]${norm}[s0]`);
  segs.forEach((g, i) => parts.push(`[s${i}]atrim=start=${n(g.start)}:end=${n(g.end)},asetpts=PTS-STARTPTS[t${i}]`));
  appends.forEach((_, j) => parts.push(`[${j + 1}:a]${norm},asetpts=PTS-STARTPTS[a${j}]`));
  const labels = [...segs.map((_, i) => `[t${i}]`), ...appends.map((_, j) => `[a${j}]`)];
  const joined = labels.length > 1 ? `${labels.join('')}concat=n=${labels.length}:v=0:a=1[cat]` : null;
  if (joined) parts.push(joined);
  const src = joined ? '[cat]' : '[t0]';
  const length = totalLength(segs) + (p.appendSec ?? 0);
  const post = postFilters(s, length);
  parts.push(`${src}${post.length ? post.join(',') : 'anull'}[out]`);
  return [
    '-i',
    inPath,
    ...appends.flatMap((a) => ['-i', a]),
    '-filter_complex',
    parts.join(';'),
    '-map',
    '[out]',
    '-vn',
    ...codecArgs(format),
    outPath,
  ];
}

/** Decode to mono 8 kHz signed 16-bit raw PCM for waveform peaks. */
export const peaksDecodeArgs = (inPath: string, outPath: string, rate = 8000) => [
  '-i',
  inPath,
  '-vn',
  '-ac',
  '1',
  '-ar',
  String(rate),
  '-f',
  's16le',
  outPath,
];

/** True when the edit state differs from an untouched source. */
export function isDirty(s: EditState) {
  return (
    s.segments.length !== 1 ||
    s.segments[0].start > 1e-3 ||
    s.segments[0].end < s.sourceDuration - 1e-3 ||
    s.fadeIn > 0 ||
    s.fadeOut > 0 ||
    s.gainDb !== 0 ||
    s.normalize ||
    s.speed !== 1 ||
    s.pitch !== 0 ||
    s.effect !== 'none'
  );
}
