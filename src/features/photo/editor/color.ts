import { Skia } from '@shopify/react-native-skia';
import type { Adjustments } from './types';

/** 3x3 color matrix + offset, row-major: [m00,m01,m02, m10..., m20...] and [o0,o1,o2]. Values in 0..1 domain. */
export type CM = { m: number[]; o: number[] };

export const IDENTITY: CM = { m: [1, 0, 0, 0, 1, 0, 0, 0, 1], o: [0, 0, 0] };

const LR = 0.2126;
const LG = 0.7152;
const LB = 0.0722;

/** a ∘ b: apply b first, then a. */
export function compose(a: CM, b: CM): CM {
  const m: number[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m.push(a.m[r * 3] * b.m[c] + a.m[r * 3 + 1] * b.m[3 + c] + a.m[r * 3 + 2] * b.m[6 + c]);
  const o = [0, 1, 2].map((r) => a.m[r * 3] * b.o[0] + a.m[r * 3 + 1] * b.o[1] + a.m[r * 3 + 2] * b.o[2] + a.o[r]);
  return { m, o };
}
export const chain = (...ms: CM[]) => ms.reduce((acc, x) => compose(x, acc), IDENTITY); // applied left to right

export const lerpCM = (a: CM, b: CM, t: number): CM => ({
  m: a.m.map((v, i) => v + (b.m[i] - v) * t),
  o: a.o.map((v, i) => v + (b.o[i] - v) * t),
});

export const gain = (r: number, g: number, b: number, or = 0, og = 0, ob = 0): CM => ({ m: [r, 0, 0, 0, g, 0, 0, 0, b], o: [or, og, ob] });
export const contrastM = (k: number): CM => gain(k, k, k, 0.5 * (1 - k), 0.5 * (1 - k), 0.5 * (1 - k));
export const brightM = (b: number): CM => gain(1, 1, 1, b, b, b);
export function saturationM(s: number): CM {
  const i = 1 - s;
  return {
    m: [LR * i + s, LG * i, LB * i, LR * i, LG * i + s, LB * i, LR * i, LG * i, LB * i + s],
    o: [0, 0, 0],
  };
}
export const mix = (m: number[], o: number[] = [0, 0, 0]): CM => ({ m, o });
export const SEPIA: CM = mix([0.393, 0.769, 0.189, 0.349, 0.686, 0.168, 0.272, 0.534, 0.131]);

/** The linear part of the Adjust panel (exposure, brightness, contrast, saturation, warmth, tint). */
export function adjustMatrix(a: Adjustments): CM {
  const ex = Math.pow(2, (a.exposure / 100) * 1.5);
  const w = a.warmth / 100;
  const t = a.tint / 100;
  return chain(
    gain(ex, ex, ex),
    brightM((a.brightness / 100) * 0.25),
    contrastM(1 + (a.contrast / 100) * (a.contrast > 0 ? 0.8 : 0.6)),
    saturationM(1 + a.saturation / 100),
    gain(1 + w * 0.12, 1 + w * 0.02, 1 - w * 0.14, 0, 0, 0),
    gain(1 + t * 0.06, 1 - t * 0.1, 1 + t * 0.06),
  );
}

export type Look = { id: string; name: string; cm: CM; fade?: number; vignette?: number };

export const LOOKS: Look[] = [
  { id: 'none', name: 'Original', cm: IDENTITY },
  { id: 'vivid', name: 'Vivid', cm: chain(saturationM(1.45), contrastM(1.12)) },
  { id: 'golden', name: 'Golden', cm: chain(gain(1.1, 1.02, 0.84, 0.02, 0.01, 0), saturationM(1.1)) },
  { id: 'arctic', name: 'Arctic', cm: chain(gain(0.9, 1.0, 1.14, 0, 0.01, 0.03), saturationM(0.9), contrastM(1.05)) },
  { id: 'mono', name: 'Mono', cm: saturationM(0) },
  { id: 'noir', name: 'Noir', cm: chain(saturationM(0), contrastM(1.45), brightM(-0.04)), vignette: 0.45 },
  { id: 'sepia', name: 'Sepia', cm: SEPIA },
  { id: 'vintage', name: 'Vintage', cm: chain(lerpCM(IDENTITY, SEPIA, 0.45), contrastM(0.92), gain(1.04, 1, 0.92)), fade: 0.35, vignette: 0.3 },
  { id: 'matte', name: 'Matte', cm: chain(saturationM(0.85), contrastM(0.9)), fade: 0.6 },
  {
    id: 'cinema',
    name: 'Cinema',
    cm: chain(mix([1.12, -0.06, -0.06, -0.02, 1.02, 0.0, 0.08, 0.06, 0.86], [0, 0.0, 0.04]), contrastM(1.12), saturationM(1.05)),
    vignette: 0.25,
  },
  { id: 'portra', name: 'Portra', cm: chain(gain(1.06, 1.0, 0.94, 0.02, 0.01, 0.01), saturationM(0.92), contrastM(0.96)), fade: 0.18 },
  { id: 'polaroid', name: 'Polaroid', cm: chain(mix([1.438, -0.062, -0.062, -0.122, 1.378, -0.122, -0.016, -0.016, 1.483], [-0.03, 0.05, -0.02]), contrastM(0.9)), fade: 0.2 },
  { id: 'chrome', name: 'Chrome', cm: chain(contrastM(1.2), saturationM(1.2), gain(1.02, 1.0, 1.04)) },
  { id: 'dusk', name: 'Dusk', cm: chain(gain(1.06, 0.92, 1.1, 0.02, 0, 0.04), saturationM(0.95)), vignette: 0.25 },
  { id: 'emerald', name: 'Emerald', cm: chain(gain(0.92, 1.08, 0.98, 0, 0.02, 0), saturationM(1.1), contrastM(1.05)) },
  { id: 'lomo', name: 'Lomo', cm: chain(saturationM(1.35), contrastM(1.3)), vignette: 0.7 },
  { id: 'faded', name: 'Faded', cm: chain(saturationM(0.65), contrastM(0.85)), fade: 0.5 },
];

export const lookById = (id: string) => LOOKS.find((l) => l.id === id) ?? LOOKS[0];

// ─── Runtime shader: identical in preview and export ────────────────────────
const SKSL = `
uniform shader image;
uniform float2 size;
uniform float3 a0; uniform float3 a1; uniform float3 a2; uniform float3 ao;
uniform float3 f0; uniform float3 f1; uniform float3 f2; uniform float3 fo;
uniform float vibrance;
uniform float highlights;
uniform float shadows;
uniform float fade;
uniform float vignette;

half4 main(float2 xy) {
  half4 src = image.eval(xy);
  float a = src.a;
  if (a <= 0.0) { return src; }
  float3 c = float3(src.rgb) / a;
  c = float3(dot(a0, c), dot(a1, c), dot(a2, c)) + ao;
  float L = dot(c, float3(0.2126, 0.7152, 0.0722));
  c += highlights * 0.3 * smoothstep(0.45, 1.0, L);
  c += shadows * 0.3 * (1.0 - smoothstep(0.0, 0.55, L));
  float mx = max(c.r, max(c.g, c.b));
  float mn = min(c.r, min(c.g, c.b));
  float sat = clamp(mx - mn, 0.0, 1.0);
  L = dot(c, float3(0.2126, 0.7152, 0.0722));
  c = mix(float3(L), c, 1.0 + vibrance * (1.0 - sat));
  c = clamp(c, 0.0, 1.0);
  c = float3(dot(f0, c), dot(f1, c), dot(f2, c)) + fo;
  c = mix(c, c * 0.82 + 0.12, fade);
  float2 uv = xy / size - 0.5;
  float d = length(uv) * 1.4142;
  c *= 1.0 - vignette * 0.85 * smoothstep(0.3, 1.05, d);
  c = clamp(c, 0.0, 1.0);
  return half4(half3(c * a), half(a));
}`;

export const toneEffect = Skia.RuntimeEffect.Make(SKSL);

export function toneUniforms(adj: Adjustments, filterId: string, amount: number, width: number, height: number) {
  const A = adjustMatrix(adj);
  const look = lookById(filterId);
  const F = lerpCM(IDENTITY, look.cm, amount);
  const row = (cm: CM, r: number) => [cm.m[r * 3], cm.m[r * 3 + 1], cm.m[r * 3 + 2]];
  return {
    size: [width, height],
    a0: row(A, 0),
    a1: row(A, 1),
    a2: row(A, 2),
    ao: A.o,
    f0: row(F, 0),
    f1: row(F, 1),
    f2: row(F, 2),
    fo: F.o,
    vibrance: adj.vibrance / 100,
    highlights: adj.highlights / 100,
    shadows: adj.shadows / 100,
    fade: Math.min(1, adj.fade / 100 + (look.fade ?? 0) * amount),
    vignette: Math.min(1, adj.vignette / 100 + (look.vignette ?? 0) * amount),
  };
}
