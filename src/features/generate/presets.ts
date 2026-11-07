import type { Aspect } from '@/lib/runware';

export type Preset = { value: string; label: string; suffix: string };

export const STYLE_PRESETS: Preset[] = [
  { value: 'photoreal', label: 'Photoreal', suffix: 'photorealistic, natural lighting, shot on a full-frame camera, 85mm lens, ultra detailed' },
  { value: 'cinematic', label: 'Cinematic', suffix: 'cinematic film still, anamorphic lens, dramatic lighting, teal and orange grade, shallow depth of field' },
  { value: 'anime', label: 'Anime', suffix: 'anime style, clean line art, cel shading, vibrant colors, studio quality key visual' },
  { value: '3d', label: '3D render', suffix: '3D render, octane, soft global illumination, subsurface scattering, high detail' },
  { value: 'illustration', label: 'Illustration', suffix: 'editorial illustration, bold shapes, textured brush strokes, limited palette' },
  { value: 'product', label: 'Product shot', suffix: 'studio product photography, seamless backdrop, softbox lighting, crisp reflections, commercial' },
  { value: 'fashion', label: 'Fashion editorial', suffix: 'high-fashion editorial photo, magazine cover styling, dramatic pose, studio strobe' },
  { value: 'watercolor', label: 'Watercolor', suffix: 'watercolor painting, soft washes, paper texture, delicate bleeding edges' },
  { value: 'neon', label: 'Neon cyberpunk', suffix: 'neon cyberpunk, rain-soaked streets, magenta and cyan glow, futuristic city' },
];

export const INSPIRATION = [
  'A lighthouse on a cliff during a violent storm, waves crashing',
  'Portrait of an elderly fisherman with weathered skin, golden hour',
  'A tiny astronaut exploring a giant mushroom forest',
  'Minimalist perfume bottle on wet black stone, water droplets',
  'Cozy Tokyo ramen shop at night, steam and warm lanterns',
  'A fox made of autumn leaves running through mist',
];

const ENHANCERS = [
  'highly detailed',
  'beautiful composition',
  'rich color and texture',
  'professional lighting',
  'sharp focus',
];

/** Local, deterministic prompt expansion: adds subject framing and quality cues the user didn't mention. */
export function enhancePrompt(raw: string): string {
  const p = raw.trim().replace(/[.,\s]+$/, '');
  if (!p) return p;
  const lower = p.toLowerCase();
  const extras: string[] = [];
  if (!/(light|lit|sunset|golden hour|night|glow)/.test(lower)) extras.push('atmospheric lighting');
  if (!/(close-up|wide|shot|angle|portrait|aerial|macro)/.test(lower)) extras.push('thoughtful camera angle');
  if (!/(background|scene|setting|environment)/.test(lower)) extras.push('immersive background');
  for (const e of ENHANCERS) if (!lower.includes(e)) extras.push(e);
  return `${p}, ${extras.slice(0, 6).join(', ')}`;
}

export const withSuffix = (prompt: string, ...suffixes: (string | undefined)[]) =>
  [prompt.trim(), ...suffixes.filter(Boolean)].join(', ');

export const CAMERA_MOTIONS: Preset[] = [
  { value: 'push', label: 'Slow push in', suffix: 'slow cinematic push-in camera move' },
  { value: 'orbit', label: 'Orbit', suffix: 'smooth orbiting camera around the subject' },
  { value: 'handheld', label: 'Handheld', suffix: 'handheld camera, subtle natural shake' },
  { value: 'drone', label: 'Drone fly-over', suffix: 'aerial drone fly-over shot' },
  { value: 'static', label: 'Static', suffix: 'locked-off static camera' },
];

export const VIDEO_DURATIONS = [5, 8, 10] as const;
export const VIDEO_ASPECTS: { value: Aspect; label: string }[] = [
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' },
  { value: '1:1', label: '1:1' },
];

export const VIDEO_INSPIRATION = [
  'A paper boat drifting down a rain-filled gutter, macro',
  'Hot air balloons rising over Cappadocia at sunrise',
  'A barista pouring latte art in slow motion',
  'Neon jellyfish pulsing in a dark ocean',
];

/**
 * Voice ids are model-specific (Fish Audio, Inworld, Dia each have their own catalog).
 * These are plain strings passed through as `speech.voice`; adjust per model in this list.
 */
export const VOICES: { id: string; label: string; hint: string }[] = [
  { id: 'Ashley', label: 'Ashley', hint: 'Warm, friendly' },
  { id: 'Dennis', label: 'Dennis', hint: 'Calm narrator' },
  { id: 'Alex', label: 'Alex', hint: 'Bright, upbeat' },
  { id: 'Olivia', label: 'Olivia', hint: 'Soft, intimate' },
  { id: 'Mark', label: 'Mark', hint: 'Deep, confident' },
  { id: 'Sarah', label: 'Sarah', hint: 'Clear, newsy' },
];

export const GENRES = ['Lo-fi', 'Cinematic', 'Synthwave', 'Hip-hop', 'Acoustic', 'House', 'Orchestral', 'Ambient', 'Rock', 'Jazz'];
export const MOODS = ['Uplifting', 'Chill', 'Epic', 'Dark', 'Dreamy', 'Energetic', 'Melancholic', 'Playful'];
export const MUSIC_DURATIONS = [15, 30, 60, 120] as const;

export const SFX_EXAMPLES = [
  'Thunder rumble',
  'Door creak',
  'Sci-fi whoosh',
  'Footsteps on gravel',
  'Glass shattering',
  'Crowd cheering',
  'Rain on a tin roof',
  'Laser zap',
];
