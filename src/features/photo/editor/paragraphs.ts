import { FontWeight, Skia, SkParagraph, TextAlign } from '@shopify/react-native-skia';
import type { StickerLayer, TextLayer } from './types';

const cache = new Map<string, SkParagraph>();

function build(key: string, text: string, size: number, color: string, weight: number, shadow: boolean) {
  const hit = cache.get(key);
  if (hit) return hit;
  const p = Skia.ParagraphBuilder.Make({ textAlign: TextAlign.Center })
    .pushStyle({
      color: Skia.Color(color),
      fontSize: size,
      fontStyle: { weight: weight as FontWeight },
      shadows: shadow ? [{ color: Skia.Color('rgba(0,0,0,0.35)'), offset: { x: 0, y: size * 0.04 }, blurRadius: size * 0.08 }] : undefined,
    })
    .addText(text || ' ')
    .build();
  p.layout(100000);
  const w = Math.ceil(p.getLongestLine()) + 2;
  p.layout(w);
  if (cache.size > 200) cache.clear();
  cache.set(key, p);
  return p;
}

export function textParagraph(t: TextLayer) {
  const color = t.bg ? (isLight(t.color) ? '#0B0B0F' : '#FFFFFF') : t.color;
  return build(`t|${t.text}|${Math.round(t.size)}|${color}|${t.weight}|${t.bg}`, t.text, t.size, color, t.weight, !t.bg);
}

export function stickerParagraph(s: StickerLayer) {
  return build(`s|${s.emoji}|${Math.round(s.size)}`, s.emoji, s.size, '#FFFFFF', 400, false);
}

/** Box (image px) of a paragraph centered at (x,y). */
export function boxOf(p: SkParagraph, x: number, y: number, pad = 0) {
  const w = p.getMaxWidth();
  const h = p.getHeight();
  return { x: x - w / 2 - pad, y: y - h / 2 - pad, width: w + pad * 2, height: h + pad * 2 };
}

export function isLight(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160;
}
