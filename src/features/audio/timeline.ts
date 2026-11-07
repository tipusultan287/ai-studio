import type { Segment } from './types';

/** Pure helpers mapping the virtual (edited) timeline to source time. */

const EPS = 1e-4;

export const totalLength = (segs: Segment[]) => segs.reduce((s, x) => s + (x.end - x.start), 0);

/** Virtual time -> { source time, segment index }. */
export function virtToSrc(segs: Segment[], t: number): { src: number; index: number } {
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    const len = segs[i].end - segs[i].start;
    if (t < acc + len - EPS || i === segs.length - 1) return { src: segs[i].start + Math.min(Math.max(0, t - acc), len), index: i };
    acc += len;
  }
  return { src: 0, index: 0 };
}

/** Source time -> virtual time (segments are disjoint; clamps when outside all of them). */
export function srcToVirt(segs: Segment[], src: number): number {
  let acc = 0;
  for (const s of segs) {
    if (src >= s.start - EPS && src <= s.end + EPS) return acc + Math.max(0, src - s.start);
    if (src < s.start) return acc;
    acc += s.end - s.start;
  }
  return acc;
}

/** Keep only virtual range [a,b]. */
export function sliceRange(segs: Segment[], a: number, b: number): Segment[] {
  const out: Segment[] = [];
  let acc = 0;
  for (const s of segs) {
    const len = s.end - s.start;
    const lo = Math.max(a, acc);
    const hi = Math.min(b, acc + len);
    if (hi - lo > EPS) out.push({ start: s.start + (lo - acc), end: s.start + (hi - acc) });
    acc += len;
  }
  return out;
}

/** Remove virtual range [a,b]. */
export function removeRange(segs: Segment[], a: number, b: number): Segment[] {
  const total = totalLength(segs);
  return [...sliceRange(segs, 0, a), ...sliceRange(segs, b, total)];
}

/** Concatenate the peaks of each kept segment so the waveform shows the edited timeline. */
export function segmentPeaks(peaks: number[], perSec: number, segs: Segment[]): number[] {
  if (!peaks.length) return [];
  const out: number[] = [];
  for (const s of segs) {
    const i0 = Math.max(0, Math.floor(s.start * perSec));
    const i1 = Math.min(peaks.length, Math.ceil(s.end * perSec));
    for (let i = i0; i < i1; i++) out.push(peaks[i]);
  }
  return out;
}

export const fmtTime = (s: number, precise = true) => {
  const v = Math.max(0, s);
  const m = Math.floor(v / 60);
  const sec = v - m * 60;
  return precise ? `${m}:${sec.toFixed(1).padStart(4, '0')}` : `${m}:${String(Math.floor(sec)).padStart(2, '0')}`;
};
