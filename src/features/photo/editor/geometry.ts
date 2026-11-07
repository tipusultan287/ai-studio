import type { EditState, Pt } from './types';

export type Rect = { x: number; y: number; width: number; height: number };

/** Map every layer coordinate through `f` (positions are image px; text/sticker x,y are centers). */
function mapLayers(s: EditState, f: (p: Pt) => Pt, scale = 1): Pick<EditState, 'strokes' | 'texts' | 'stickers'> {
  return {
    strokes: s.strokes.map((st) => ({ ...st, size: st.size * scale, points: st.points.map(f) })),
    texts: s.texts.map((t) => ({ ...t, ...f(t), size: t.size * scale })),
    stickers: s.stickers.map((t) => ({ ...t, ...f(t), size: t.size * scale })),
  };
}

export const cropLayers = (s: EditState, r: Rect) => mapLayers(s, (p) => ({ x: p.x - r.x, y: p.y - r.y }));
/** 90° clockwise: (x,y) -> (H - y, x). */
export const rotateLayers = (s: EditState) => mapLayers(s, (p) => ({ x: s.height - p.y, y: p.x }));
export const flipLayers = (s: EditState, axis: 'horizontal' | 'vertical') =>
  mapLayers(s, (p) => (axis === 'horizontal' ? { x: s.width - p.x, y: p.y } : { x: p.x, y: s.height - p.y }));
/** When the base bitmap is resampled (e.g. downscaled on load) keep layers aligned. */
export const scaleLayers = (s: EditState, k: number) => mapLayers(s, (p) => ({ x: p.x * k, y: p.y * k }), k);

/** Fit an image of (w,h) into a box (cw,ch); returns scale and offset. */
export function fitContain(w: number, h: number, cw: number, ch: number) {
  const s = Math.min(cw / w, ch / h);
  return { s, ox: (cw - w * s) / 2, oy: (ch - h * s) / 2 };
}

/** Largest centered rect of the given ratio (w/h) inside (W,H). */
export function centeredRect(W: number, H: number, ratio: number | null): Rect {
  if (!ratio) return { x: 0, y: 0, width: W, height: H };
  let w = W;
  let h = W / ratio;
  if (h > H) {
    h = H;
    w = H * ratio;
  }
  return { x: (W - w) / 2, y: (H - h) / 2, width: w, height: h };
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
