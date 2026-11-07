export type Segment = { start: number; end: number }; // seconds in the source file

export type EffectId = 'none' | 'bass' | 'voice' | 'telephone' | 'radio' | 'echo' | 'reverb' | 'denoise';
export type ExportFormat = 'm4a' | 'mp3' | 'wav';

/**
 * Non-destructive edit state. Everything is described relative to `sourceUri`;
 * `segments` are the kept source ranges in playback order (trim / delete).
 */
export type EditState = {
  sourceUri: string;
  sourceDuration: number; // seconds
  segments: Segment[];
  fadeIn: number; // seconds
  fadeOut: number; // seconds
  gainDb: number;
  normalize: boolean;
  speed: number; // 0.5..2
  pitch: number; // semitones -12..12
  effect: EffectId;
};

export type HistoryEntry = { label: string; state: EditState };

export const initialState = (sourceUri: string, sourceDuration: number): EditState => ({
  sourceUri,
  sourceDuration,
  segments: [{ start: 0, end: sourceDuration }],
  fadeIn: 0,
  fadeOut: 0,
  gainDb: 0,
  normalize: false,
  speed: 1,
  pitch: 0,
  effect: 'none',
});

export const EFFECTS: readonly { value: EffectId; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'bass', label: 'Bass boost' },
  { value: 'voice', label: 'Voice clarity' },
  { value: 'telephone', label: 'Telephone' },
  { value: 'radio', label: 'Radio' },
  { value: 'echo', label: 'Echo' },
  { value: 'reverb', label: 'Reverb' },
  { value: 'denoise', label: 'Noise reduction' },
];
