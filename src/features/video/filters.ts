import type { Adjustments } from './types';

/**
 * Filter looks. `ff` is the ffmpeg filter chain used at export.
 * `tint` is an approximate overlay for live preview (expo-video can't run shaders).
 */
export type FilterLook = { id: string; label: string; ff: string; tint?: string; swatch: string };

export const FILTERS: FilterLook[] = [
  { id: 'none', label: 'Original', ff: '', swatch: '#3A3A46' },
  { id: 'vivid', label: 'Vivid', ff: 'eq=saturation=1.35:contrast=1.08', tint: 'rgba(255,90,60,0.06)', swatch: '#FF6A3D' },
  { id: 'warm', label: 'Warm', ff: 'colorchannelmixer=rr=1.08:gg=1.0:bb=0.88', tint: 'rgba(255,150,60,0.14)', swatch: '#FFA94D' },
  { id: 'cool', label: 'Cool', ff: 'colorchannelmixer=rr=0.9:gg=1.0:bb=1.1', tint: 'rgba(60,140,255,0.14)', swatch: '#4D9BFF' },
  { id: 'mono', label: 'Mono', ff: 'hue=s=0', tint: 'rgba(128,128,128,0.35)', swatch: '#9A9A9A' },
  { id: 'noir', label: 'Noir', ff: 'hue=s=0,eq=contrast=1.35:brightness=-0.04', tint: 'rgba(0,0,0,0.38)', swatch: '#202020' },
  {
    id: 'sepia',
    label: 'Sepia',
    ff: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
    tint: 'rgba(160,110,50,0.3)',
    swatch: '#A0703A',
  },
  { id: 'fade', label: 'Fade', ff: "curves=all='0/0.08 1/0.92',eq=saturation=0.8", tint: 'rgba(255,255,255,0.12)', swatch: '#C9C2B8' },
  { id: 'teal', label: 'Teal & Orange', ff: "curves=r='0/0 0.5/0.55 1/1':b='0/0.06 0.5/0.48 1/0.9',eq=saturation=1.15", tint: 'rgba(0,150,160,0.12)', swatch: '#1FA3A8' },
  { id: 'cinema', label: 'Cinema', ff: "curves=preset=medium_contrast,eq=saturation=0.9", tint: 'rgba(20,30,60,0.18)', swatch: '#2E3A5C' },
  { id: 'vintage', label: 'Vintage', ff: 'curves=preset=vintage', tint: 'rgba(200,160,90,0.2)', swatch: '#C8A05A' },
  { id: 'cross', label: 'Cross', ff: 'curves=preset=cross_process', tint: 'rgba(180,255,120,0.12)', swatch: '#B4FF78' },
];

export const filterById = (id: string) => FILTERS.find((f) => f.id === id) ?? FILTERS[0];

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** ffmpeg eq filter for manual adjustments, or '' when neutral. */
export function adjustFilter(a: Adjustments): string {
  if (!a.brightness && !a.contrast && !a.saturation) return '';
  const brightness = r3((a.brightness / 100) * 0.3); // eq: -1..1, keep it subtle
  const contrast = r3(1 + (a.contrast / 100) * 0.6); // 0.4..1.6
  const saturation = r3(1 + a.saturation / 100); // 0..2
  return `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`;
}

/** Approximate preview overlay for adjustments (brightness → white/black veil). */
export function adjustPreview(a: Adjustments): { color: string; opacity: number } | null {
  if (a.brightness > 0) return { color: '#FFFFFF', opacity: (a.brightness / 100) * 0.3 };
  if (a.brightness < 0) return { color: '#000000', opacity: (-a.brightness / 100) * 0.5 };
  return null;
}
