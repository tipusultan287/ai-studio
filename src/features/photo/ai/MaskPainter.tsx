import { Canvas, Group, Image as SkiaImage, Path, Rect, SkImage } from '@shopify/react-native-skia';
import { useRef, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { renderToFile } from '../common/imageIO';
import { fitContain } from '../editor/geometry';
import { strokePath } from '../editor/Scene';
import type { Pt } from '../editor/types';

export type MaskStroke = { points: Pt[]; size: number }; // image px

const MASK_TINT = 'rgba(255,77,106,0.55)';

/** Paint over the object to remove. Strokes are stored in source image pixels. */
export function MaskPainter({ image, strokes, brush, onStroke }: { image: SkImage; strokes: MaskStroke[]; brush: number; onStroke: (s: MaskStroke) => void }) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [live, setLive] = useState<MaskStroke | null>(null);
  const liveRef = useRef<MaskStroke | null>(null);
  const W = image.width();
  const H = image.height();
  const fit = fitContain(W, H, Math.max(1, box.w), Math.max(1, box.h));
  const toImg = (x: number, y: number): Pt => ({ x: (x - fit.ox) / fit.s, y: (y - fit.oy) / fit.s });

  const pan = usePanGesture({
    disableReanimated: true,
    runOnJS: true,
    minDistance: 0,
    maxPointers: 1,
    onBegin: (e) => {
      liveRef.current = { points: [toImg(e.x, e.y)], size: brush / fit.s };
      setLive(liveRef.current);
    },
    onUpdate: (e) => {
      const l = liveRef.current;
      if (!l) return;
      liveRef.current = { ...l, points: [...l.points, toImg(e.x, e.y)] };
      setLive(liveRef.current);
    },
    onFinalize: () => {
      if (liveRef.current) onStroke(liveRef.current);
      liveRef.current = null;
      setLive(null);
    },
  });

  const all = live ? [...strokes, live] : strokes;
  return (
    <View style={{ flex: 1 }} onLayout={(e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {box.w > 0 ? (
        <GestureDetector gesture={pan}>
          <Canvas style={{ flex: 1 }}>
            <Group transform={[{ translateX: fit.ox }, { translateY: fit.oy }, { scale: fit.s }]}>
              <SkiaImage image={image} x={0} y={0} width={W} height={H} fit="fill" />
              <Group layer opacity={0.85}>
                {all.map((s, i) => (
                  <Path key={i} path={strokePath(s.points)} color={MASK_TINT} style="stroke" strokeWidth={s.size} strokeCap="round" strokeJoin="round" blendMode="src" />
                ))}
              </Group>
            </Group>
          </Canvas>
        </GestureDetector>
      ) : null}
    </View>
  );
}

/** Black/white PNG at exactly width×height (white = remove). */
export function exportMask(strokes: MaskStroke[], width: number, height: number) {
  return renderToFile(
    <Group>
      <Rect x={0} y={0} width={width} height={height} color="#000000" />
      {strokes.map((s, i) => (
        <Path key={i} path={strokePath(s.points)} color="#FFFFFF" style="stroke" strokeWidth={s.size} strokeCap="round" strokeJoin="round" antiAlias={false} />
      ))}
    </Group>,
    width,
    height,
    'png',
    true,
  );
}
