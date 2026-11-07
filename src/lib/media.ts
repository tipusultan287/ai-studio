import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Platform } from 'react-native';
import { Asset, AssetSource, useLibrary } from '@/store/library';
import type { MediaKind } from '@/ui/theme';

export type Picked = { uri: string; kind: MediaKind; width?: number; height?: number; durationMs?: number; name?: string };

const isWeb = Platform.OS === 'web';

function mediaDir(): Directory {
  const d = new Directory(Paths.document, 'media');
  if (!d.exists) d.create({ intermediates: true });
  return d;
}

const extFor = (kind: MediaKind, uri: string) => {
  const e = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (e && e.length <= 4 && /^[a-z0-9]+$/.test(e)) return e;
  return kind === 'image' ? 'jpg' : kind === 'video' ? 'mp4' : 'mp3';
};

/** A fresh file path in app storage for outputs. */
export function newMediaPath(ext: string): string {
  if (isWeb) return `mem://${Date.now()}.${ext}`;
  return new File(mediaDir(), `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.${ext}`).uri;
}

/** Copy a picked/cache file or download a remote URL into persistent app storage. */
export async function persistMedia(uri: string, kind: MediaKind): Promise<string> {
  if (isWeb) return uri;
  if (uri.startsWith(Paths.document.uri)) return uri;
  const target = new File(newMediaPath(extFor(kind, uri)));
  if (/^https?:\/\//.test(uri)) {
    const f = await File.downloadFileAsync(uri, target);
    return f.uri;
  }
  if (uri.startsWith('data:')) {
    const b64 = uri.split(',')[1] ?? '';
    target.create();
    target.write(b64, { encoding: 'base64' });
    return target.uri;
  }
  await new File(uri).copy(target);
  return target.uri;
}

export async function makeVideoThumb(uri: string): Promise<string | undefined> {
  if (isWeb) return undefined;
  try {
    const { uri: t } = await VideoThumbnails.getThumbnailAsync(uri, { time: 500, quality: 0.6 });
    return await persistMedia(t, 'image');
  } catch {
    return undefined;
  }
}

/** Save a result (local or remote) to the library; returns the asset. */
export async function addToLibrary(p: {
  uri: string;
  kind: MediaKind;
  source: AssetSource;
  title?: string;
  prompt?: string;
  model?: string;
  parentId?: string;
  width?: number;
  height?: number;
  durationMs?: number;
}): Promise<Asset> {
  const local = await persistMedia(p.uri, p.kind);
  const thumbUri = p.kind === 'video' ? await makeVideoThumb(local) : p.kind === 'image' ? local : undefined;
  const title =
    p.title ??
    (p.prompt ? p.prompt.slice(0, 48) : `${p.kind === 'image' ? 'Photo' : p.kind === 'video' ? 'Video' : 'Audio'} ${new Date().toLocaleDateString()}`);
  return useLibrary.getState().add({ ...p, uri: local, thumbUri, title });
}

export async function pickMedia(kind: MediaKind | 'any' = 'any', opts: { multiple?: boolean } = {}): Promise<Picked[]> {
  if (kind === 'audio') {
    const r = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: !!opts.multiple, copyToCacheDirectory: true });
    if (r.canceled) return [];
    return r.assets.map((a) => ({ uri: a.uri, kind: 'audio' as const, name: a.name }));
  }
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind === 'image' ? ['images'] : kind === 'video' ? ['videos'] : ['images', 'videos'],
    allowsMultipleSelection: !!opts.multiple,
    quality: 1,
    videoQuality: ImagePicker.UIImagePickerControllerQualityType.High,
  });
  if (r.canceled) return [];
  return r.assets.map((a) => ({
    uri: a.uri,
    kind: a.type === 'video' ? 'video' : 'image',
    width: a.width,
    height: a.height,
    durationMs: a.duration ?? undefined,
    name: a.fileName ?? undefined,
  }));
}

export async function captureWithCamera(kind: 'image' | 'video'): Promise<Picked | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const r = await ImagePicker.launchCameraAsync({ mediaTypes: kind === 'image' ? ['images'] : ['videos'], quality: 1 });
  if (r.canceled) return null;
  const a = r.assets[0];
  return { uri: a.uri, kind: a.type === 'video' ? 'video' : 'image', width: a.width, height: a.height, durationMs: a.duration ?? undefined };
}

/** Save to the system Photos / Gallery (images & video). */
export async function saveToDevice(uri: string): Promise<boolean> {
  if (isWeb) {
    const a = document.createElement('a');
    a.href = uri;
    a.download = uri.split('/').pop() || 'export';
    a.click();
    return true;
  }
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) return false;
  const local = /^https?:/.test(uri) ? await persistMedia(uri, 'image') : uri;
  await MediaLibrary.Asset.create(local);
  return true;
}

export async function shareMedia(uri: string) {
  if (isWeb || !(await Sharing.isAvailableAsync())) return saveToDevice(uri);
  const local = /^https?:/.test(uri) ? await persistMedia(uri, 'image') : uri;
  await Sharing.shareAsync(local);
}

export function deleteLocal(uri?: string) {
  if (!uri || isWeb) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {}
}

export function formatDuration(ms?: number) {
  if (!ms && ms !== 0) return '';
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
