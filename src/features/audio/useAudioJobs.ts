import { Alert } from 'react-native';
import { ffmpeg, ffmpegAvailable, FFmpegUnavailableError, fsPath } from '@/lib/ffmpeg';
import { addToLibrary, newMediaPath } from '@/lib/media';
import type { RunOptions } from '@/lib/runware/client';
import { useTask } from '@/lib/useTask';
import type { Asset } from '@/store/library';
import { computePeaks, peaksDuration } from './peaks';
import { buildRenderArgs, outputDuration } from './render';
import type { EditState, ExportFormat } from './types';

function render(state: EditState, format: ExportFormat, opts: RunOptions, append?: { uri: string; sec: number }) {
  const out = newMediaPath(format);
  const args = buildRenderArgs({
    state,
    inPath: fsPath(state.sourceUri),
    outPath: fsPath(out),
    format,
    appendPaths: append ? [fsPath(append.uri)] : undefined,
    appendSec: append?.sec,
  });
  const dur = outputDuration(state, append?.sec ?? 0);
  const job = ffmpeg(args, { totalMs: dur * 1000, onProgress: (p) => opts.onProgress?.({ status: 'Rendering audio…', progress: p }) });
  opts.signal?.addEventListener('abort', job.cancel);
  return job.promise.then(() => ({ uri: out, duration: dur }));
}

/** Measure the real length of a freshly rendered file (falls back to the estimate). */
async function measured(uri: string, estimate: number) {
  const p = await computePeaks(uri, estimate);
  return p.real ? peaksDuration(p) : estimate;
}

export function useAudioJobs() {
  const task = useTask();

  const guard = () => {
    if (ffmpegAvailable()) return true;
    Alert.alert('Needs the full app build', new FFmpegUnavailableError().message);
    return false;
  };

  /** Bake current edits (optionally + an appended clip) into a new WAV source. */
  const bake = async (state: EditState, append?: string) => {
    if (!guard()) return undefined;
    return task.start(async (opts) => {
      let app: { uri: string; sec: number } | undefined;
      if (append) {
        opts.onProgress?.({ status: 'Reading clip…' });
        const p = await computePeaks(append, 0);
        app = { uri: append, sec: p.real ? peaksDuration(p) : 0 };
      }
      const r = await render(state, 'wav', opts, app);
      return { uri: r.uri, duration: await measured(r.uri, r.duration) };
    });
  };

  const exportAudio = async (state: EditState, format: ExportFormat, parentId?: string): Promise<Asset | undefined> => {
    if (!guard()) return undefined;
    return task.start(async (opts) => {
      try {
        const r = await render(state, format, opts);
        opts.onProgress?.({ status: 'Saving to library…', progress: 1 });
        return await addToLibrary({
          uri: r.uri,
          kind: 'audio',
          source: 'edit',
          parentId,
          durationMs: Math.round(r.duration * 1000),
          title: `Audio edit ${new Date().toLocaleDateString()}`,
        });
      } catch (e) {
        if (format === 'mp3' && e instanceof Error && /mp3|lame|encoder/i.test(e.message)) {
          throw new Error('This FFmpeg build has no MP3 encoder. Export as M4A or WAV instead.');
        }
        throw e;
      }
    });
  };

  return { task, bake, exportAudio };
}
