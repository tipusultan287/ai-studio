/** Video editor project model (pure data, serialisable). Times are in ms. */

export type CanvasAspect = '9:16' | '1:1' | '16:9' | '4:5' | 'original';

export type Adjustments = { brightness: number; contrast: number; saturation: number }; // each -100..100

export type Clip = {
  id: string;
  uri: string;
  /** Source media duration (ms). */
  durationMs: number;
  width?: number;
  height?: number;
  inMs: number;
  outMs: number;
  speed: number; // 0.25..4
  volume: number; // 0..2 (1 = 100%)
  filter: string; // FilterId
  adjust: Adjustments;
  thumbUri?: string;
  /** Duration/size not known yet (opened by uri) — filled from the player's sourceLoad. */
  needsProbe?: boolean;
};

export type TextPosition = 'top' | 'center' | 'bottom';
export type TextStyleId = 'clean' | 'bold' | 'box' | 'neon';

export type TextOverlay = {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
  position: TextPosition;
  style: TextStyleId;
  color: string; // #RRGGBB
  size: number; // relative: 0.04..0.12 of canvas height
};

export type MusicTrack = {
  uri: string;
  name: string;
  volume: number; // 0..2
  fadeInMs: number;
  fadeOutMs: number;
  assetId?: string;
};

export type VideoProject = {
  clips: Clip[];
  texts: TextOverlay[];
  music: MusicTrack | null;
  canvas: CanvasAspect;
  muteOriginal: boolean;
};

export const EMPTY_PROJECT: VideoProject = { clips: [], texts: [], music: null, canvas: 'original', muteOriginal: false };

export const NEUTRAL_ADJUST: Adjustments = { brightness: 0, contrast: 0, saturation: 0 };

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function makeClip(p: { uri: string; durationMs?: number; width?: number; height?: number; thumbUri?: string }): Clip {
  const known = !!p.durationMs && p.durationMs > 0;
  const d = known ? Math.max(100, Math.round(p.durationMs ?? 0)) : 5000;
  return {
    id: uid(),
    uri: p.uri,
    durationMs: d,
    width: p.width,
    height: p.height,
    inMs: 0,
    outMs: d,
    speed: 1,
    volume: 1,
    filter: 'none',
    adjust: { ...NEUTRAL_ADJUST },
    thumbUri: p.thumbUri,
    needsProbe: !known,
  };
}

/** Length of a clip on the timeline (after trim & speed). */
export const clipLength = (c: Clip) => Math.max(0, (c.outMs - c.inMs) / c.speed);

export const projectLength = (p: VideoProject) => p.clips.reduce((s, c) => s + clipLength(c), 0);

/** Timeline start of each clip. */
export function clipStarts(p: VideoProject): number[] {
  const out: number[] = [];
  let t = 0;
  for (const c of p.clips) {
    out.push(t);
    t += clipLength(c);
  }
  return out;
}

/** Map a timeline time to (clip index, source time in ms). */
export function locate(p: VideoProject, t: number): { index: number; sourceMs: number; offsetMs: number } | null {
  if (!p.clips.length) return null;
  let acc = 0;
  for (let i = 0; i < p.clips.length; i++) {
    const c = p.clips[i];
    const len = clipLength(c);
    if (t < acc + len || i === p.clips.length - 1) {
      const off = Math.max(0, Math.min(len, t - acc));
      return { index: i, sourceMs: c.inMs + off * c.speed, offsetMs: off };
    }
    acc += len;
  }
  return null;
}

/** Output canvas size (even numbers) for the chosen aspect. Long edge 1920 or the source size. */
export function canvasSize(p: VideoProject): { width: number; height: number } {
  const first = p.clips[0];
  const ratio: Record<Exclude<CanvasAspect, 'original'>, [number, number]> = {
    '9:16': [1080, 1920],
    '1:1': [1080, 1080],
    '16:9': [1920, 1080],
    '4:5': [1080, 1350],
  };
  if (p.canvas !== 'original') {
    const [width, height] = ratio[p.canvas];
    return { width, height };
  }
  const w = first?.width ?? 1080;
  const h = first?.height ?? 1920;
  const scale = Math.min(1, 1920 / Math.max(w, h));
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(w), height: even(h) };
}

export const aspectRatioOf = (p: VideoProject) => {
  const { width, height } = canvasSize(p);
  return width / height;
};
