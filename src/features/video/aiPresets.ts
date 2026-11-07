import { Eraser, Globe2, ImagePlay, Palette, Scissors, Sparkles, Wand2, type LucideIcon } from 'lucide-react-native';

export type AiToolId = 'scene' | 'remove' | 'edit' | 'restyle' | 'cutout' | 'upscale' | 'animate';

export const AI_TOOLS: { id: AiToolId; label: string; icon: LucideIcon; blurb: string }[] = [
  { id: 'scene', label: 'Change scene', icon: Globe2, blurb: 'Keep the people and motion, move the whole video somewhere new.' },
  { id: 'remove', label: 'Remove object', icon: Eraser, blurb: 'Describe what to erase — the video eraser fills it in.' },
  { id: 'edit', label: 'Add / change', icon: Wand2, blurb: 'Add, replace or change anything by instruction.' },
  { id: 'restyle', label: 'Restyle', icon: Palette, blurb: 'Turn your clip into anime, claymation, film and more.' },
  { id: 'cutout', label: 'Remove BG', icon: Scissors, blurb: 'Cut the subject out of the background (transparent WebM).' },
  { id: 'upscale', label: 'Enhance', icon: Sparkles, blurb: 'Upscale and clean up low-quality footage.' },
  { id: 'animate', label: 'Animate photo', icon: ImagePlay, blurb: 'Bring a still photo to life as a video.' },
];

export const SCENES: { label: string; emoji: string; prompt: string }[] = [
  { label: 'Mars', emoji: '🪐', prompt: 'the surface of Mars: red dusty rocky terrain, rust-colored sky, distant craters, harsh low sunlight' },
  { label: 'Tokyo neon night', emoji: '🌃', prompt: 'a busy Tokyo street at night, glowing neon signs, wet reflective pavement, light rain' },
  { label: 'Snowy mountains', emoji: '🏔️', prompt: 'a snowy alpine mountain ridge, fresh powder snow, crisp blue sky, gentle snowfall' },
  { label: 'Underwater', emoji: '🐠', prompt: 'underwater in a tropical coral reef, caustic light rays, floating particles, fish swimming by' },
  { label: 'Beach sunset', emoji: '🌅', prompt: 'a tropical beach at golden-hour sunset, palm trees, warm orange light, gentle waves' },
  { label: 'Cyberpunk city', emoji: '🏙️', prompt: 'a futuristic cyberpunk megacity, holographic billboards, flying cars, purple and teal haze' },
  { label: 'Space station', emoji: '🛰️', prompt: 'inside an orbital space station, large window showing Earth, clean sci-fi interior, soft white panels' },
];

export const RESTYLES: { label: string; prompt: string }[] = [
  { label: 'Anime', prompt: 'Restyle the entire video as a high-quality 2D anime, cel shading, clean line art, vibrant colors. Keep motion and composition identical.' },
  { label: 'Claymation', prompt: 'Restyle the entire video as stop-motion claymation, plasticine textures, handmade look. Keep motion and composition identical.' },
  { label: '35mm film', prompt: 'Make the video look shot on 35mm film: natural film grain, soft halation, warm filmic colors, slight vignette. Keep everything else identical.' },
  { label: 'Watercolor', prompt: 'Restyle the entire video as a flowing watercolor painting, soft bleeding edges, paper texture. Keep motion and composition identical.' },
  { label: 'Pixar-like 3D', prompt: 'Restyle the entire video as a polished 3D animated film, stylized characters, soft global illumination. Keep motion and composition identical.' },
];

/** Models accept short clips; warn above this. */
export const MAX_AI_CLIP_MS = 10_000;
