import { router } from 'expo-router';
import { pickMedia } from '@/lib/media';
import type { Asset } from '@/store/library';
import type { MediaKind } from '@/ui/theme';

export const editorPath = (kind: MediaKind) => (kind === 'image' ? '/photo/editor' : kind === 'video' ? '/video/editor' : '/audio/editor');
export const aiPath = (kind: MediaKind) => (kind === 'image' ? '/photo/ai' : '/video/ai');

export function openEditor(kind: MediaKind, uri: string, assetId?: string) {
  router.push({ pathname: editorPath(kind), params: { uri, ...(assetId ? { assetId } : {}) } });
}

export function openAi(kind: 'image' | 'video', uri: string, tool?: string, assetId?: string) {
  router.push({ pathname: aiPath(kind), params: { uri, ...(tool ? { tool } : {}), ...(assetId ? { assetId } : {}) } });
}

/** Pick media then jump into its editor. */
export async function pickAndEdit(kind: MediaKind) {
  const [p] = await pickMedia(kind);
  if (p) openEditor(p.kind, p.uri);
}

export async function pickAndAi(kind: 'image' | 'video', tool: string) {
  const [p] = await pickMedia(kind);
  if (p) openAi(kind, p.uri, tool);
}

export const openAsset = (a: Asset) => router.push({ pathname: '/asset/[id]', params: { id: a.id } });
