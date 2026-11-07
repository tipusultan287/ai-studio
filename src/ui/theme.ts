import { Platform } from 'react-native';

/** AI Studio design tokens. Dark-first: media pops on a near-black canvas. */
export const colors = {
  bg: '#09090C',
  bgElevated: '#111116',
  surface: '#16161D',
  surfaceHigh: '#1E1E27',
  surfacePressed: '#262631',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  text: '#F5F5F7',
  textDim: '#A1A1AD',
  textFaint: '#6B6B78',
  accent: '#C8FF4D', // volt lime: primary actions
  accentInk: '#0B0F00', // text on accent
  ai: '#FF7A59', // warm signal: anything AI
  aiSoft: 'rgba(255,122,89,0.14)',
  violet: '#8B7BFF',
  cyan: '#4DE1FF',
  danger: '#FF4D6A',
  success: '#3DDC97',
  overlay: 'rgba(5,5,8,0.72)',
  photo: '#4DE1FF',
  video: '#FF7A59',
  audio: '#8B7BFF',
} as const;

export const gradients = {
  ai: ['#FF7A59', '#FF4DA6', '#8B7BFF'] as const,
  accent: ['#E4FF8A', '#C8FF4D'] as const,
  photo: ['#4DE1FF', '#4D7BFF'] as const,
  video: ['#FF7A59', '#FF4D6A'] as const,
  audio: ['#8B7BFF', '#C84DFF'] as const,
  fadeBottom: ['transparent', 'rgba(9,9,12,0.95)'] as const,
};

export const radius = { xs: 8, sm: 12, md: 16, lg: 22, xl: 28, pill: 999 } as const;
export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 28, xxl: 40 } as const;

export const font = {
  family: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const type = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -1.1, lineHeight: 38 },
  title: { fontSize: 24, fontWeight: '700', letterSpacing: -0.6, lineHeight: 28 },
  heading: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '500', letterSpacing: -0.1, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0, lineHeight: 16 },
  caption: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, lineHeight: 14 },
} as const;

export type MediaKind = 'image' | 'video' | 'audio';
export const kindColor: Record<MediaKind, string> = {
  image: colors.photo,
  video: colors.video,
  audio: colors.audio,
};
