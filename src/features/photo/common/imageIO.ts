import { drawAsImage, ImageFormat, SkImage } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { newMediaPath } from '@/lib/media';

const MAX_SIDE = 4096;
const isPng = (uri: string) => /\.png(\?|$)/i.test(uri);

/** Bake EXIF orientation, cap size, and return a local file + pixel size. */
export async function normalizeImage(uri: string): Promise<{ uri: string; width: number; height: number }> {
  const ctx = ImageManipulator.manipulate(uri);
  let ref = await ctx.renderAsync();
  const big = Math.max(ref.width, ref.height);
  if (big > MAX_SIDE) {
    const k = MAX_SIDE / big;
    ctx.resize({ width: Math.round(ref.width * k), height: Math.round(ref.height * k) });
    ref = await ctx.renderAsync();
  }
  const out = await ref.saveAsync({ format: isPng(uri) ? SaveFormat.PNG : SaveFormat.JPEG, compress: 0.96 });
  return { uri: out.uri, width: out.width, height: out.height };
}

export type GeoOp =
  | { crop: { originX: number; originY: number; width: number; height: number } }
  | { rotate: number }
  | { flip: 'horizontal' | 'vertical' };

/** Apply a destructive geometry op (crop/rotate/flip) to the base bitmap. */
export async function applyGeometry(uri: string, op: GeoOp) {
  const ctx = ImageManipulator.manipulate(uri);
  if ('crop' in op) ctx.crop(op.crop);
  else if ('rotate' in op) ctx.rotate(op.rotate);
  else ctx.flip(op.flip);
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ format: isPng(uri) ? SaveFormat.PNG : SaveFormat.JPEG, compress: 0.97 });
  return { uri: out.uri, width: out.width, height: out.height };
}

/** Write an SkImage to disk. `temp` puts it in cache instead of the media folder. */
export function writeSkImage(img: SkImage, format: 'jpg' | 'png', temp = false): string {
  const b64 = img.encodeToBase64(format === 'png' ? ImageFormat.PNG : ImageFormat.JPEG, 95);
  if (Platform.OS === 'web') return `data:image/${format === 'png' ? 'png' : 'jpeg'};base64,${b64}`;
  const file = temp ? new File(Paths.cache, `ps-${Date.now().toString(36)}.${format}`) : new File(newMediaPath(format));
  file.create({ overwrite: true });
  file.write(b64, { encoding: 'base64' });
  return file.uri;
}

/** Render a Skia element offscreen at an exact pixel size and save it. */
export async function renderToFile(el: ReactElement, width: number, height: number, format: 'jpg' | 'png', temp = false) {
  const img = await drawAsImage(el, { width: Math.round(width), height: Math.round(height) });
  if (!img) throw new Error('Could not render image');
  return writeSkImage(img, format, temp);
}
