/** Editor document model. All layer coordinates are in SOURCE IMAGE PIXELS, so the
 *  same scene renders identically in the scaled preview and in the full-res export. */

export type AdjustKey =
  | 'exposure'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'vibrance'
  | 'warmth'
  | 'tint'
  | 'highlights'
  | 'shadows'
  | 'fade'
  | 'vignette';

export type Adjustments = Record<AdjustKey, number>; // each -100..100 (fade/vignette 0..100)

export const ADJUST_DEFAULTS: Adjustments = {
  exposure: 0,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  vibrance: 0,
  warmth: 0,
  tint: 0,
  highlights: 0,
  shadows: 0,
  fade: 0,
  vignette: 0,
};

export const ADJUST_META: { key: AdjustKey; label: string; min: number; max: number }[] = [
  { key: 'exposure', label: 'Exposure', min: -100, max: 100 },
  { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100 },
  { key: 'vibrance', label: 'Vibrance', min: -100, max: 100 },
  { key: 'warmth', label: 'Warmth', min: -100, max: 100 },
  { key: 'tint', label: 'Tint', min: -100, max: 100 },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100 },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100 },
  { key: 'fade', label: 'Fade', min: 0, max: 100 },
  { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
];

export type Pt = { x: number; y: number };

export type Stroke = {
  id: string;
  points: Pt[];
  color: string;
  size: number; // image px
  erase: boolean;
};

export type TextLayer = {
  id: string;
  text: string;
  x: number; // top-left, image px
  y: number;
  size: number; // font size, image px
  color: string;
  weight: 400 | 600 | 800;
  bg: boolean; // pill background behind text
};

export type StickerLayer = {
  id: string;
  emoji: string;
  x: number; // center, image px
  y: number;
  size: number; // image px
};

/** A full editor snapshot; history is a stack of these. */
export type EditState = {
  baseUri: string; // already-cropped/rotated base bitmap
  width: number;
  height: number;
  adjust: Adjustments;
  filter: string; // filter id
  filterAmount: number; // 0..1
  strokes: Stroke[];
  texts: TextLayer[];
  stickers: StickerLayer[];
};

export const uid = () => Math.random().toString(36).slice(2, 10);
