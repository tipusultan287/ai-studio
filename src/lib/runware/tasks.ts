/**
 * High-level Runware operations used by the app. Every request shape lives here,
 * so if a model needs different params, adjust only this file (see each model's
 * schema at https://runware.ai/docs/models/<id>/schema.json).
 */
import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { useSettings } from '@/store/settings';
import { outputUrl, run, RunOptions, RunwareResult } from './client';
import type { ModelSlot } from './models';

export const model = (slot: ModelSlot) => useSettings.getState().models[slot];

// ─── Media upload ────────────────────────────────────────────────────────────
const mimeFromUri = (uri: string, fallback: string) => {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic',
    mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', m4v: 'video/mp4',
    mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', aac: 'audio/aac', ogg: 'audio/ogg',
  };
  return (ext && map[ext]) || fallback;
};

export async function toDataUri(uri: string, fallbackMime = 'image/jpeg'): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return await new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
  }
  const b64 = await new File(uri).base64();
  return `data:${mimeFromUri(uri, fallbackMime)};base64,${b64}`;
}

/** Upload local media to Runware storage; returns a URL usable in `inputs`. Remote http(s) URLs pass through. */
export async function uploadMedia(uri: string, fallbackMime = 'image/jpeg', opts?: RunOptions): Promise<string> {
  if (/^https?:\/\//.test(uri)) return uri;
  opts?.onProgress?.({ status: 'Uploading media…' });
  const media = await toDataUri(uri, fallbackMime);
  const [r] = await run({ taskType: 'mediaStorage', operation: 'upload', media }, { ...opts, onProgress: undefined });
  if (!r?.mediaURL && !r?.mediaUUID) throw new Error('Upload failed');
  return (r.mediaURL as string) || (r.mediaUUID as string);
}

// ─── Sizes ───────────────────────────────────────────────────────────────────
export type Aspect = '1:1' | '4:5' | '3:4' | '9:16' | '16:9' | '3:2' | '2:3';
export const ASPECTS: { value: Aspect; label: string }[] = [
  { value: '1:1', label: 'Square' },
  { value: '4:5', label: '4:5' },
  { value: '9:16', label: 'Story' },
  { value: '16:9', label: 'Wide' },
  { value: '3:4', label: '3:4' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
];
export function aspectSize(a: Aspect, base = 1024): { width: number; height: number } {
  const [w, h] = a.split(':').map(Number);
  const scale = Math.sqrt((base * base) / (w * h));
  const r64 = (n: number) => Math.max(256, Math.round(n / 64) * 64);
  return { width: r64(w * scale), height: r64(h * scale) };
}
/** Video sizes most video models accept. */
export function videoSize(a: Aspect): { width: number; height: number } {
  if (a === '9:16') return { width: 720, height: 1280 };
  if (a === '1:1') return { width: 960, height: 960 };
  if (a === '4:5' || a === '3:4' || a === '2:3') return { width: 768, height: 1024 };
  return { width: 1280, height: 720 };
}

const urls = (rs: RunwareResult[]) => rs.map(outputUrl).filter(Boolean);

// ─── Image ───────────────────────────────────────────────────────────────────
export type GenerateImageParams = {
  prompt: string;
  negativePrompt?: string;
  aspect?: Aspect;
  count?: number;
  model?: string;
  referenceImageUris?: string[];
  seed?: number;
};
export async function generateImage(p: GenerateImageParams, opts?: RunOptions) {
  const refs = p.referenceImageUris?.length ? await Promise.all(p.referenceImageUris.map((u) => uploadMedia(u, 'image/jpeg', opts))) : undefined;
  const res = await run(
    {
      taskType: 'imageInference',
      model: p.model ?? model('textToImage'),
      positivePrompt: p.prompt,
      ...(p.negativePrompt ? { negativePrompt: p.negativePrompt } : {}),
      ...aspectSize(p.aspect ?? '1:1'),
      numberResults: p.count ?? 1,
      outputFormat: 'JPG',
      ...(p.seed != null ? { seed: p.seed } : {}),
      ...(refs ? { inputs: { referenceImages: refs } } : {}),
    },
    opts,
  );
  return urls(res);
}

/** Instruction edit: "replace the background with Mars", "make his jacket red", "add a cat". */
export async function editImage(p: { uri: string; instruction: string; extraReferenceUris?: string[]; model?: string }, opts?: RunOptions) {
  const img = await uploadMedia(p.uri, 'image/jpeg', opts);
  const extra = p.extraReferenceUris?.length ? await Promise.all(p.extraReferenceUris.map((u) => uploadMedia(u, 'image/jpeg', opts))) : [];
  opts?.onProgress?.({ status: 'Editing with AI…' });
  const res = await run(
    {
      taskType: 'imageInference',
      model: p.model ?? model('imageEdit'),
      positivePrompt: p.instruction,
      outputFormat: 'PNG',
      inputs: { referenceImages: [img, ...extra] },
    },
    opts,
  );
  return urls(res)[0];
}

/** Remove objects under the white area of `maskUri`. */
export async function removeObject(p: { uri: string; maskUri: string; model?: string }, opts?: RunOptions) {
  const [image, mask] = await Promise.all([uploadMedia(p.uri, 'image/jpeg', opts), uploadMedia(p.maskUri, 'image/png', opts)]);
  opts?.onProgress?.({ status: 'Erasing…' });
  const res = await run(
    { taskType: 'imageInference', model: p.model ?? model('objectRemove'), positivePrompt: 'remove the masked object, fill naturally with matching background', inputs: { seedImage: image, maskImage: mask }, outputFormat: 'PNG' },
    opts,
  );
  return urls(res)[0];
}

/** Paint a mask and describe what should appear there. */
export async function inpaint(p: { uri: string; maskUri: string; prompt: string; model?: string }, opts?: RunOptions) {
  const [image, mask] = await Promise.all([uploadMedia(p.uri, 'image/jpeg', opts), uploadMedia(p.maskUri, 'image/png', opts)]);
  opts?.onProgress?.({ status: 'Painting…' });
  const res = await run(
    { taskType: 'imageInference', model: p.model ?? model('inpaint'), positivePrompt: p.prompt, inputs: { seedImage: image, maskImage: mask }, outputFormat: 'PNG' },
    opts,
  );
  return urls(res)[0];
}

export async function removeBackground(p: { uri: string; model?: string }, opts?: RunOptions) {
  const image = await uploadMedia(p.uri, 'image/jpeg', opts);
  opts?.onProgress?.({ status: 'Cutting out subject…' });
  const res = await run({ taskType: 'imageInference', model: p.model ?? model('removeBackground'), inputs: { image }, outputFormat: 'PNG' }, opts);
  return urls(res)[0];
}

/** Replace background: keeps subject, generates a new scene. */
export async function replaceBackground(p: { uri: string; scene: string }, opts?: RunOptions) {
  return editImage(
    {
      uri: p.uri,
      instruction: `Replace the background with: ${p.scene}. Keep the main subject exactly the same (identity, pose, clothing, lighting direction matched to the new scene). Photorealistic.`,
    },
    opts,
  );
}

export async function upscaleImage(p: { uri: string; factor?: 2 | 4; model?: string }, opts?: RunOptions) {
  const image = await uploadMedia(p.uri, 'image/jpeg', opts);
  opts?.onProgress?.({ status: `Upscaling ${p.factor ?? 2}x…` });
  const res = await run(
    { taskType: 'imageInference', model: p.model ?? model('upscale'), inputs: { image }, settings: { upscaleFactor: p.factor ?? 2 }, outputFormat: 'PNG' },
    opts,
  );
  return urls(res)[0];
}

// ─── Video ───────────────────────────────────────────────────────────────────
export type GenerateVideoParams = {
  prompt: string;
  aspect?: Aspect;
  duration?: number;
  model?: string;
  firstFrameUri?: string;
  lastFrameUri?: string;
  negativePrompt?: string;
};
export async function generateVideo(p: GenerateVideoParams, opts?: RunOptions) {
  const frames: string[] = [];
  if (p.firstFrameUri) frames.push(await uploadMedia(p.firstFrameUri, 'image/jpeg', opts));
  if (p.lastFrameUri) frames.push(await uploadMedia(p.lastFrameUri, 'image/jpeg', opts));
  const res = await run(
    {
      taskType: 'videoInference',
      deliveryMethod: 'async',
      model: p.model ?? model('video'),
      positivePrompt: p.prompt,
      ...(p.negativePrompt ? { negativePrompt: p.negativePrompt } : {}),
      duration: p.duration ?? 5,
      // With a frame image the model takes aspect from the image, so size is omitted.
      ...(frames.length ? { inputs: { frameImages: frames } } : videoSize(p.aspect ?? '9:16')),
      outputFormat: 'MP4',
    },
    { initialDelayMs: 8000, ...opts },
  );
  return urls(res)[0];
}

/** Which inputs key a video-edit model expects for the source clip. */
const videoInputKey = (m: string) => (m.startsWith('minimax:') ? 'referenceVideos' : 'video');
const videoInput = (m: string, url: string) => (videoInputKey(m) === 'referenceVideos' ? { referenceVideos: [url] } : { video: url });

/** Edit a video by instruction: change scene/location, add or replace things, restyle. */
export async function editVideo(p: { uri: string; instruction: string; duration?: number; referenceImageUri?: string; model?: string }, opts?: RunOptions) {
  const m = p.model ?? model('videoEdit');
  const video = await uploadMedia(p.uri, 'video/mp4', opts);
  const ref = p.referenceImageUri ? await uploadMedia(p.referenceImageUri, 'image/jpeg', opts) : undefined;
  const res = await run(
    {
      taskType: 'videoInference',
      deliveryMethod: 'async',
      model: m,
      positivePrompt: p.instruction,
      ...(p.duration ? { duration: p.duration } : {}),
      inputs: { ...videoInput(m, video), ...(ref ? { referenceImages: [ref] } : {}) },
      outputFormat: 'MP4',
    },
    { initialDelayMs: 10000, ...opts },
  );
  return urls(res)[0];
}

/** Move the whole video somewhere else ("on Mars", "in Tokyo at night"). */
export const changeVideoScene = (p: { uri: string; scene: string }, opts?: RunOptions) =>
  editVideo(
    {
      uri: p.uri,
      instruction: `Keep the people, their motion, timing and camera movement exactly the same, but change the environment and background to: ${p.scene}. Match lighting and shadows to the new environment so it looks real.`,
    },
    opts,
  );

export async function eraseFromVideo(p: { uri: string; what: string; model?: string }, opts?: RunOptions) {
  const m = p.model ?? model('videoErase');
  const video = await uploadMedia(p.uri, 'video/mp4', opts);
  const res = await run(
    { taskType: 'videoInference', deliveryMethod: 'async', model: m, positivePrompt: `remove ${p.what}`, inputs: { video }, outputFormat: 'MP4' },
    { initialDelayMs: 10000, ...opts },
  );
  return urls(res)[0];
}

export async function removeVideoBackground(p: { uri: string }, opts?: RunOptions) {
  const video = await uploadMedia(p.uri, 'video/mp4', opts);
  const res = await run(
    { taskType: 'videoInference', deliveryMethod: 'async', model: model('videoRemoveBackground'), inputs: { video }, outputFormat: 'WEBM' },
    { initialDelayMs: 10000, ...opts },
  );
  return urls(res)[0];
}

export async function upscaleVideo(p: { uri: string }, opts?: RunOptions) {
  const video = await uploadMedia(p.uri, 'video/mp4', opts);
  const res = await run(
    { taskType: 'videoInference', deliveryMethod: 'async', model: model('videoUpscale'), inputs: { video }, outputFormat: 'MP4' },
    { initialDelayMs: 10000, ...opts },
  );
  return urls(res)[0];
}

// ─── Audio ───────────────────────────────────────────────────────────────────
export async function textToSpeech(p: { text: string; voice?: string; model?: string }, opts?: RunOptions) {
  const res = await run(
    { taskType: 'audioInference', model: p.model ?? model('tts'), speech: { text: p.text, ...(p.voice ? { voice: p.voice } : {}) }, outputFormat: 'MP3' },
    opts,
  );
  return urls(res)[0];
}

export async function generateMusic(p: { prompt: string; lyrics?: string; duration?: number; model?: string }, opts?: RunOptions) {
  const res = await run(
    {
      taskType: 'audioInference',
      deliveryMethod: 'async',
      model: p.model ?? model('music'),
      positivePrompt: p.prompt,
      ...(p.lyrics ? { lyrics: p.lyrics } : {}),
      duration: p.duration ?? 30,
      outputFormat: 'MP3',
    },
    { initialDelayMs: 5000, ...opts },
  );
  return urls(res)[0];
}

export async function generateSoundEffect(p: { prompt: string; duration?: number; model?: string }, opts?: RunOptions) {
  const res = await run(
    { taskType: 'audioInference', deliveryMethod: 'async', model: p.model ?? model('sfx'), positivePrompt: p.prompt, duration: p.duration ?? 5, outputFormat: 'MP3' },
    { initialDelayMs: 4000, ...opts },
  );
  return urls(res)[0];
}
