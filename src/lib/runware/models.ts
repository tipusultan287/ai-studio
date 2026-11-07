/**
 * Runware model catalog (AIR ids). Runware adds/renames models often — check
 * https://runware.ai/docs/models and each model's schema.json, then edit here.
 * Users can also override the default per task in Settings → Models.
 */
export type ModelOption = { id: string; name: string; note?: string };
export type ModelSlot =
  | 'textToImage'
  | 'imageEdit'
  | 'objectRemove'
  | 'inpaint'
  | 'removeBackground'
  | 'upscale'
  | 'video'
  | 'videoEdit'
  | 'videoErase'
  | 'videoRemoveBackground'
  | 'videoUpscale'
  | 'tts'
  | 'music'
  | 'sfx';

export const MODEL_CATALOG: Record<ModelSlot, { label: string; options: ModelOption[] }> = {
  textToImage: {
    label: 'Image generation',
    options: [
      { id: 'bfl:5@1', name: 'FLUX.2 Pro', note: 'Photoreal, great prompt following' },
      { id: 'google:nano-banana@2.1', name: 'Nano Banana 2.1', note: 'Fast, versatile' },
      { id: 'bytedance:seedream@5.0-pro', name: 'Seedream 5 Pro', note: 'Up to 4K, vivid' },
      { id: 'ideogram:4.5@0', name: 'Ideogram 4.5', note: 'Best for text in images' },
      { id: 'alibaba:qwen-image@3.0-pro', name: 'Qwen Image 3 Pro' },
      { id: 'krea:krea@2-large', name: 'Krea 2 Large', note: 'Aesthetic' },
    ],
  },
  imageEdit: {
    label: 'AI photo edit',
    options: [
      { id: 'google:nano-banana@2.1', name: 'Nano Banana 2.1', note: 'Instruction edits, keeps identity' },
      { id: 'bfl:4@1', name: 'FLUX.1 Kontext Max' },
      { id: 'alibaba:qwen-image-edit@2511', name: 'Qwen Image Edit' },
      { id: 'bytedance:seedream@5.0-pro', name: 'Seedream 5 Pro' },
      { id: 'google:4@2', name: 'Nano Banana Pro' },
    ],
  },
  objectRemove: {
    label: 'Object removal',
    options: [
      { id: 'bfl:flux@erase', name: 'FLUX Erase' },
      { id: 'ideogram:object-remover@0', name: 'Ideogram Object Remover' },
    ],
  },
  inpaint: {
    label: 'Inpaint (mask + prompt)',
    options: [
      { id: 'bfl:1@2', name: 'FLUX.1 Fill Pro' },
      { id: 'runware:102@1', name: 'FLUX.1 Fill Dev' },
    ],
  },
  removeBackground: {
    label: 'Remove background',
    options: [
      { id: 'bria:2@1', name: 'Bria RMBG 2.0' },
      { id: 'runware:112@5', name: 'BiRefNet General' },
      { id: 'runware:112@10', name: 'BiRefNet Portrait' },
    ],
  },
  upscale: {
    label: 'Upscale',
    options: [
      { id: 'bria:52@1', name: 'Bria Upscale' },
      { id: 'runware:500@1', name: 'Clarity' },
      { id: 'runware:501@1', name: 'CCSR' },
    ],
  },
  video: {
    label: 'Video generation',
    options: [
      { id: 'klingai:kling-video@3-pro', name: 'Kling 3 Pro', note: 'Cinematic motion' },
      { id: 'google:3@3', name: 'Veo 3.1 Fast', note: 'With native audio' },
      { id: 'google:3@2', name: 'Veo 3.1', note: 'Top quality, audio' },
      { id: 'bytedance:seedance@2.0', name: 'Seedance 2.0' },
      { id: 'minimax:h3@0', name: 'MiniMax H3' },
      { id: 'alibaba:wan@3.0', name: 'Wan 3.0' },
    ],
  },
  videoEdit: {
    label: 'AI video edit / scene change',
    options: [
      { id: 'klingai:kling-video@o3-pro', name: 'Kling O3 Pro', note: 'Edit by instruction' },
      { id: 'bytedance:seedance@2.0', name: 'Seedance 2.0' },
      { id: 'alibaba:wan@3.0', name: 'Wan 3.0' },
      { id: 'bfl:flux@video-edit-fast', name: 'FLUX Video Edit Fast' },
      { id: 'minimax:h3@0', name: 'MiniMax H3' },
    ],
  },
  videoErase: { label: 'Video object removal', options: [{ id: 'bria:60@1', name: 'Bria Video Eraser' }] },
  videoRemoveBackground: { label: 'Video background removal', options: [{ id: 'bria:51@1', name: 'Bria Video RMBG' }] },
  videoUpscale: {
    label: 'Video upscale',
    options: [
      { id: 'bytedance:video-enhancement@standard', name: 'Seed Enhance' },
      { id: 'bria:50@1', name: 'Bria Video Upscale' },
    ],
  },
  tts: {
    label: 'Text to speech',
    options: [
      { id: 'fishaudio:s2.1@pro', name: 'Fish Audio S2.1 Pro' },
      { id: 'inworld:tts@2', name: 'Inworld TTS 2' },
      { id: 'runware:dia2@2b', name: 'Dia 2 (dialogue)' },
    ],
  },
  music: {
    label: 'Music',
    options: [
      { id: 'runware:ace-step@v1.5-turbo', name: 'ACE-Step 1.5 Turbo' },
      { id: 'runware:ace-step@v1.5-xl-sft', name: 'ACE-Step 1.5 XL' },
    ],
  },
  sfx: { label: 'Sound effects', options: [{ id: 'bytedance:seed-audio@1.0', name: 'Seed Audio' }] },
};

export const DEFAULT_MODELS: Record<ModelSlot, string> = Object.fromEntries(
  Object.entries(MODEL_CATALOG).map(([k, v]) => [k, v.options[0].id]),
) as Record<ModelSlot, string>;
