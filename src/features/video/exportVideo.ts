import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { ffmpeg, ffmpegAvailable, FFmpegUnavailableError } from '@/lib/ffmpeg';
import { newMediaPath } from '@/lib/media';
import type { RunOptions } from '@/lib/runware';
import { buildExportArgs, probeAudioArgs } from './render';
import type { VideoProject } from './types';

/**
 * Font assumption for drawtext: system fonts at these paths exist on stock iOS / Android.
 * If the file is missing we omit fontfile and rely on the FFmpeg build's fontconfig default.
 */
function systemFont(): string | undefined {
  const candidates =
    Platform.OS === 'ios'
      ? ['/System/Library/Fonts/Helvetica.ttc', '/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Core/Helvetica.ttc']
      : ['/system/fonts/Roboto-Bold.ttf', '/system/fonts/Roboto-Regular.ttf', '/system/fonts/DroidSans-Bold.ttf'];
  for (const c of candidates) {
    try {
      if (new File(`file://${c}`).exists) return c;
    } catch {
      // not readable from the sandbox
    }
  }
  return undefined;
}

function abortable(job: { promise: Promise<void>; cancel: () => void }, signal?: AbortSignal) {
  if (!signal) return job.promise;
  const onAbort = () => job.cancel();
  signal.addEventListener('abort', onAbort);
  return job.promise.finally(() => signal.removeEventListener('abort', onAbort));
}

async function hasAudio(uri: string): Promise<boolean> {
  try {
    await ffmpeg(probeAudioArgs(uri)).promise;
    return true;
  } catch {
    return false;
  }
}

const CODECS = Platform.OS === 'ios' ? ['libx264', 'h264_videotoolbox', 'mpeg4'] : ['libx264', 'h264_mediacodec', 'mpeg4'];

/** Render the project to a local MP4. Tries libx264, then the platform HW encoder, then mpeg4. */
export async function exportProject(project: VideoProject, opts: RunOptions = {}): Promise<{ uri: string; durationMs: number }> {
  if (!ffmpegAvailable()) throw new FFmpegUnavailableError();
  opts.onProgress?.({ status: 'Preparing clips…' });
  const audio: boolean[] = [];
  if (!project.muteOriginal) {
    const uniq = new Map<string, boolean>();
    for (const c of project.clips) {
      if (!uniq.has(c.uri)) uniq.set(c.uri, await hasAudio(c.uri));
      audio.push(uniq.get(c.uri) ?? true);
    }
  }
  const fontFile = project.texts.length ? systemFont() : undefined;
  let lastErr: unknown;
  for (const videoCodec of CODECS) {
    if (opts.signal?.aborted) throw new Error('Cancelled');
    const outPath = newMediaPath('mp4');
    const { args, totalMs } = buildExportArgs(project, { outPath, hasAudio: audio, fontFile, videoCodec });
    opts.onProgress?.({ status: 'Rendering video…', progress: 0 });
    try {
      await abortable(
        ffmpeg(args, { totalMs, onProgress: (p) => opts.onProgress?.({ status: `Rendering video… ${Math.round(p * 100)}%`, progress: p }) }),
        opts.signal,
      );
      return { uri: outPath, durationMs: Math.round(totalMs) };
    } catch (e) {
      lastErr = e;
      if (opts.signal?.aborted) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      // Only retry when the encoder is the problem.
      if (!/encoder|codec|libx264|Unknown/i.test(msg)) break;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Export failed');
}
