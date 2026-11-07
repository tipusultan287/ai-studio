/** Pure project edits used by the editor (each returns a new project). */
import { clipLength, clipStarts, locate, uid, type Clip, type TextOverlay, type VideoProject } from './types';

const MIN_CLIP = 200; // ms of source

export const patchClip = (p: VideoProject, id: string, patch: Partial<Clip>): VideoProject => ({
  ...p,
  clips: p.clips.map((c) => (c.id === id ? { ...c, ...patch } : c)),
});

export function setTrim(p: VideoProject, id: string, inMs: number, outMs: number): VideoProject {
  const c = p.clips.find((x) => x.id === id);
  if (!c) return p;
  const i = Math.max(0, Math.min(inMs, c.durationMs - MIN_CLIP));
  const o = Math.min(c.durationMs, Math.max(outMs, i + MIN_CLIP));
  return patchClip(p, id, { inMs: Math.round(i), outMs: Math.round(o) });
}

/** Split the clip under the playhead. Returns project and the id of the right-hand piece. */
export function splitAt(p: VideoProject, t: number): { project: VideoProject; newId?: string } {
  const loc = locate(p, t);
  if (!loc) return { project: p };
  const c = p.clips[loc.index];
  const cut = Math.round(loc.sourceMs);
  if (cut - c.inMs < MIN_CLIP || c.outMs - cut < MIN_CLIP) return { project: p };
  const right: Clip = { ...c, id: uid(), inMs: cut };
  const clips = [...p.clips];
  clips.splice(loc.index, 1, { ...c, outMs: cut }, right);
  return { project: { ...p, clips }, newId: right.id };
}

export function duplicateClip(p: VideoProject, id: string): { project: VideoProject; newId?: string } {
  const i = p.clips.findIndex((c) => c.id === id);
  if (i < 0) return { project: p };
  const copy: Clip = { ...p.clips[i], id: uid(), adjust: { ...p.clips[i].adjust } };
  const clips = [...p.clips];
  clips.splice(i + 1, 0, copy);
  return { project: { ...p, clips }, newId: copy.id };
}

export const deleteClip = (p: VideoProject, id: string): VideoProject => ({ ...p, clips: p.clips.filter((c) => c.id !== id) });

export function moveClip(p: VideoProject, id: string, dir: -1 | 1): VideoProject {
  const i = p.clips.findIndex((c) => c.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= p.clips.length) return p;
  const clips = [...p.clips];
  [clips[i], clips[j]] = [clips[j], clips[i]];
  return { ...p, clips };
}

export const addClips = (p: VideoProject, add: Clip[], afterId?: string): VideoProject => {
  const i = afterId ? p.clips.findIndex((c) => c.id === afterId) : -1;
  const clips = [...p.clips];
  clips.splice(i < 0 ? clips.length : i + 1, 0, ...add);
  return { ...p, clips };
};

export function addText(p: VideoProject, at: number): { project: VideoProject; id: string } {
  const total = p.clips.reduce((s, c) => s + clipLength(c), 0);
  const start = Math.max(0, Math.min(at, total - 500));
  const t: TextOverlay = {
    id: uid(),
    text: 'Your text',
    startMs: Math.round(start),
    endMs: Math.round(Math.min(total || 3000, start + 3000)),
    position: 'center',
    style: 'bold',
    color: '#FFFFFF',
    size: 0.06,
  };
  return { project: { ...p, texts: [...p.texts, t] }, id: t.id };
}

export const patchText = (p: VideoProject, id: string, patch: Partial<TextOverlay>): VideoProject => ({
  ...p,
  texts: p.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
});

export const deleteText = (p: VideoProject, id: string): VideoProject => ({ ...p, texts: p.texts.filter((t) => t.id !== id) });

/** Timeline start time of a clip id. */
export const startOf = (p: VideoProject, id: string) => {
  const i = p.clips.findIndex((c) => c.id === id);
  return i < 0 ? 0 : clipStarts(p)[i];
};
