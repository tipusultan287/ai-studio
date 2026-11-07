/**
 * Pure FFmpeg argument builder for the video editor export. No React / native imports so it can be
 * unit tested in plain Node: `buildExportArgs(project, { outPath, hasAudio })`.
 *
 * Graph per clip i:
 *   input:  -ss in -t (out-in) -i clip            (fast + accurate input seek, re-encoded)
 *   video:  [i:v] setpts=(PTS-STARTPTS)/speed, look, eq(adjust), scale→pad to canvas, fps, yuv420p [vi]
 *   audio:  [i:a] atempo chain, volume, resample, pad/trim to exact length [ai]
 *           (clip without an audio stream, or "mute original": anullsrc source of the same length)
 * then concat → drawtext overlays (enable='between(t,a,b)') → [vout]
 * music:  [N:a] atrim, volume, afade in/out → amix with the clip audio → [aout]
 *
 * Fonts: drawtext needs a font. If `fontFile` is given it's used; otherwise drawtext relies on the
 * FFmpeg build's fontconfig default font (works on most ffmpeg-kit "full" builds). On iOS the caller
 * passes /System/Library/Fonts/Helvetica.ttc, on Android /system/fonts/Roboto-Regular.ttf.
 */
import { adjustFilter, filterById } from './filters';
import { canvasSize, clipLength, projectLength, type TextOverlay, type VideoProject } from './types';

export type ExportOptions = {
  outPath: string;
  /** Per clip: whether the source has an audio stream. Missing entries are treated as true. */
  hasAudio?: boolean[];
  fontFile?: string;
  videoCodec?: string; // libx264 (default) | h264_videotoolbox | h264_mediacodec | mpeg4
  fps?: number;
};

const SR = 44100;
const sec = (ms: number) => (Math.round(ms) / 1000).toFixed(3);
const stripFile = (uri: string) => (uri.startsWith('file://') ? decodeURI(uri.slice(7)) : uri);

/** atempo accepts 0.5..2 (per instance) — chain for wider ranges. */
export function atempoChain(speed: number): string[] {
  if (Math.abs(speed - 1) < 1e-3) return [];
  const out: string[] = [];
  let s = speed;
  while (s > 2) {
    out.push('atempo=2');
    s /= 2;
  }
  while (s < 0.5) {
    out.push('atempo=0.5');
    s /= 0.5;
  }
  if (Math.abs(s - 1) > 1e-3) out.push(`atempo=${Math.round(s * 10000) / 10000}`);
  return out;
}

/**
 * Escape a string for a single-quoted drawtext `text` value inside filter_complex.
 * We use expansion=none so `%` is literal; quotes and backslashes can't be escaped reliably inside
 * single quotes across FFmpeg's two parsing levels, so they're swapped for look-alikes.
 */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '/').replace(/'/g, '\u2019').replace(/\r?\n/g, ' ').replace(/:/g, '\\:');
}

const escapePath = (p: string) => p.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");

const ffColor = (hex: string, alpha = 1) => {
  const h = /^#?[0-9a-f]{6}$/i.test(hex) ? hex.replace('#', '') : 'FFFFFF';
  return `0x${h.toUpperCase()}${alpha < 1 ? `@${alpha}` : ''}`;
};

export function drawtextFilter(t: TextOverlay, canvasH: number, fontFile?: string): string {
  const size = Math.max(12, Math.round(canvasH * t.size));
  const margin = Math.round(canvasH * 0.08);
  const y = t.position === 'top' ? `${margin}` : t.position === 'center' ? '(h-text_h)/2' : `h-text_h-${margin}`;
  const parts = [
    ...(fontFile ? [`fontfile='${escapePath(fontFile)}'`] : []),
    `text='${escapeText(t.text)}'`,
    'expansion=none',
    `fontsize=${size}`,
    `fontcolor=${ffColor(t.color)}`,
    'x=(w-text_w)/2',
    `y=${y}`,
  ];
  if (t.style === 'bold') parts.push(`borderw=${Math.max(2, Math.round(size / 12))}`, 'bordercolor=0x000000');
  if (t.style === 'box') parts.push('box=1', 'boxcolor=0x000000@0.55', `boxborderw=${Math.round(size * 0.35)}`);
  if (t.style === 'neon') parts.push(`borderw=${Math.max(2, Math.round(size / 14))}`, `bordercolor=${ffColor(t.color, 0.45)}`, 'shadowx=0', 'shadowy=0');
  if (t.style === 'clean') parts.push('shadowcolor=0x000000@0.6', 'shadowx=2', 'shadowy=2');
  parts.push(`enable='between(t,${sec(t.startMs)},${sec(t.endMs)})'`);
  return `drawtext=${parts.join(':')}`;
}

export function buildExportArgs(project: VideoProject, opts: ExportOptions): { args: string[]; totalMs: number } {
  const { clips, texts, music, muteOriginal } = project;
  if (!clips.length) throw new Error('Add at least one clip to export.');
  const { width: W, height: H } = canvasSize(project);
  const fps = opts.fps ?? 30;
  const totalMs = projectLength(project);
  const args: string[] = [];
  const graph: string[] = [];

  clips.forEach((c) => {
    args.push('-ss', sec(c.inMs), '-t', sec(c.outMs - c.inMs), '-i', stripFile(c.uri));
  });
  const musicIndex = clips.length;
  if (music) args.push('-i', stripFile(music.uri));

  clips.forEach((c, i) => {
    const len = sec(clipLength(c));
    const v = [`setpts=(PTS-STARTPTS)/${Math.round(c.speed * 10000) / 10000}`];
    const look = filterById(c.filter).ff;
    if (look) v.push(look);
    const adj = adjustFilter(c.adjust);
    if (adj) v.push(adj);
    v.push(
      `scale=${W}:${H}:force_original_aspect_ratio=decrease`,
      `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=black`,
      'setsar=1',
      `fps=${fps}`,
      'format=yuv420p',
    );
    graph.push(`[${i}:v]${v.join(',')}[v${i}]`);

    const useAudio = !muteOriginal && opts.hasAudio?.[i] !== false && c.volume > 0;
    if (useAudio) {
      const a = ['asetpts=PTS-STARTPTS', ...atempoChain(c.speed)];
      if (Math.abs(c.volume - 1) > 1e-3) a.push(`volume=${Math.round(c.volume * 100) / 100}`);
      a.push(`aformat=sample_rates=${SR}:channel_layouts=stereo`, 'apad', `atrim=duration=${len}`, 'asetpts=PTS-STARTPTS');
      graph.push(`[${i}:a]${a.join(',')}[a${i}]`);
    } else {
      graph.push(`anullsrc=r=${SR}:cl=stereo,atrim=duration=${len},asetpts=PTS-STARTPTS[a${i}]`);
    }
  });

  const pairs = clips.map((_, i) => `[v${i}][a${i}]`).join('');
  graph.push(`${pairs}concat=n=${clips.length}:v=1:a=1[vc][ac]`);

  const validTexts = texts.filter((t) => t.text.trim() && t.endMs > t.startMs);
  if (validTexts.length) {
    graph.push(`[vc]${validTexts.map((t) => drawtextFilter(t, H, opts.fontFile)).join(',')}[vout]`);
  } else {
    graph.push('[vc]null[vout]');
  }

  if (music) {
    const total = totalMs / 1000;
    const m = [`atrim=duration=${sec(totalMs)}`, 'asetpts=PTS-STARTPTS', `aformat=sample_rates=${SR}:channel_layouts=stereo`];
    if (Math.abs(music.volume - 1) > 1e-3) m.push(`volume=${Math.round(music.volume * 100) / 100}`);
    if (music.fadeInMs > 0) m.push(`afade=t=in:st=0:d=${sec(Math.min(music.fadeInMs, totalMs))}`);
    if (music.fadeOutMs > 0) {
      const d = Math.min(music.fadeOutMs, totalMs) / 1000;
      m.push(`afade=t=out:st=${Math.max(0, total - d).toFixed(3)}:d=${d.toFixed(3)}`);
    }
    graph.push(`[${musicIndex}:a]${m.join(',')}[mu]`);
    graph.push('[ac][mu]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]');
  } else {
    graph.push('[ac]anull[aout]');
  }

  const codec = opts.videoCodec ?? 'libx264';
  const vcodec =
    codec === 'libx264'
      ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20']
      : codec === 'mpeg4'
        ? ['-c:v', 'mpeg4', '-q:v', '3']
        : ['-c:v', codec, '-b:v', '10M'];

  args.push(
    '-filter_complex',
    graph.join(';'),
    '-map',
    '[vout]',
    '-map',
    '[aout]',
    ...vcodec,
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-ar',
    String(SR),
    '-movflags',
    '+faststart',
    '-t',
    sec(totalMs),
    stripFile(opts.outPath),
  );
  return { args, totalMs };
}

/** Args that succeed only if the file has an audio stream (used to probe before export). */
export const probeAudioArgs = (uri: string) => ['-i', stripFile(uri), '-map', '0:a:0', '-t', '0.05', '-f', 'null', '-'];
