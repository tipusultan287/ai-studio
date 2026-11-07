import { Canvas, Group, Image as SkiaImage, Rect, SkImage } from '@shopify/react-native-skia';
import { useRef, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import { colors } from '@/ui';
import { CropOverlay } from './CropOverlay';
import { fitContain, type Rect as R } from './geometry';
import { boxOf, stickerParagraph, textParagraph } from './paragraphs';
import { SceneContent } from './Scene';
import { type EditState, type Pt, type Stroke, uid } from './types';

export type Brush = { color: string; size: number; erase: boolean };
export type Selection = { kind: 'text' | 'sticker'; id: string } | null;
type Drag = { kind: 'text' | 'sticker'; id: string; ox: number; oy: number; osize: number };

const PAD = 14;

export function EditorCanvas({
  image,
  original,
  s,
  mode,
  comparing,
  brush,
  selection,
  crop,
  cropRatio,
  onCropChange,
  onSelect,
  onTapText,
  onStroke,
  onDraft,
  onCommit,
}: {
  image: SkImage;
  original: SkImage | null;
  s: EditState;
  mode: string | null;
  comparing: boolean;
  brush: Brush;
  selection: Selection;
  crop: R;
  cropRatio: number | null;
  onCropChange: (r: R) => void;
  onSelect: (sel: Selection) => void;
  onTapText: (id: string) => void;
  onStroke: (st: Stroke) => void;
  onDraft: (s: EditState) => void;
  onCommit: () => void;
}) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [live, setLive] = useState<Stroke | null>(null);
  const drag = useRef<Drag | null>(null);
  const pinchBase = useRef<Drag | null>(null);
  const moved = useRef(false);
  const liveRef = useRef<Stroke | null>(null);

  const fit = fitContain(s.width, s.height, Math.max(1, box.w - PAD * 2), Math.max(1, box.h - PAD * 2));
  const ox = fit.ox + PAD;
  const oy = fit.oy + PAD;
  const toImg = (x: number, y: number): Pt => ({ x: (x - ox) / fit.s, y: (y - oy) / fit.s });

  const hit = (p: Pt): Drag | null => {
    for (let i = s.stickers.length - 1; i >= 0; i--) {
      const st = s.stickers[i];
      const b = boxOf(stickerParagraph(st), st.x, st.y, st.size * 0.1);
      if (p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height) return { kind: 'sticker', id: st.id, ox: st.x, oy: st.y, osize: st.size };
    }
    for (let i = s.texts.length - 1; i >= 0; i--) {
      const t = s.texts[i];
      const b = boxOf(textParagraph(t), t.x, t.y, t.size * 0.35);
      if (p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height) return { kind: 'text', id: t.id, ox: t.x, oy: t.y, osize: t.size };
    }
    return null;
  };

  const patch = (d: Drag, x: number, y: number, size: number): EditState =>
    d.kind === 'text'
      ? { ...s, texts: s.texts.map((t) => (t.id === d.id ? { ...t, x, y, size } : t)) }
      : { ...s, stickers: s.stickers.map((t) => (t.id === d.id ? { ...t, x, y, size } : t)) };

  const drawing = mode === 'draw';
  const interactive = mode !== 'crop' && !comparing;

  const pan = usePanGesture({
    disableReanimated: true,
    runOnJS: true,
    enabled: interactive,
    minDistance: drawing ? 0 : 4,
    maxPointers: 1,
    onBegin: (e) => {
      const p = toImg(e.x, e.y);
      moved.current = false;
      if (drawing) {
        liveRef.current = { id: uid(), points: [p], color: brush.color, size: brush.size / fit.s, erase: brush.erase };
        setLive(liveRef.current);
        return;
      }
      const d = hit(p);
      drag.current = d;
      onSelect(d ? { kind: d.kind, id: d.id } : null);
    },
    onUpdate: (e) => {
      moved.current = true;
      if (drawing) {
        const p = toImg(e.x, e.y);
        const l = liveRef.current;
        if (!l) return;
        const last = l.points[l.points.length - 1];
        if (Math.hypot(last.x - p.x, last.y - p.y) < 1.5 / fit.s) return;
        liveRef.current = { ...l, points: [...l.points, p] };
        setLive(liveRef.current);
        return;
      }
      const d = drag.current;
      if (d) onDraft(patch(d, d.ox + e.translationX / fit.s, d.oy + e.translationY / fit.s, d.osize));
    },
    onFinalize: () => {
      if (drawing) {
        if (liveRef.current) onStroke(liveRef.current);
        liveRef.current = null;
        setLive(null);
        return;
      }
      const d = drag.current;
      drag.current = null;
      if (d && moved.current) onCommit();
      else if (d && d.kind === 'text') onTapText(d.id);
    },
  });

  const pinch = usePinchGesture({
    disableReanimated: true,
    runOnJS: true,
    enabled: interactive && !drawing,
    onActivate: () => {
      if (!selection) return;
      const L = selection.kind === 'text' ? s.texts.find((t) => t.id === selection.id) : s.stickers.find((t) => t.id === selection.id);
      pinchBase.current = L ? { kind: selection.kind, id: L.id, ox: L.x, oy: L.y, osize: L.size } : null;
    },
    onUpdate: (e) => {
      const b = pinchBase.current;
      if (!b) return;
      const cur = b.kind === 'text' ? s.texts.find((t) => t.id === b.id) : s.stickers.find((t) => t.id === b.id);
      if (cur) onDraft(patch(b, cur.x, cur.y, Math.max(8, b.osize * e.scale)));
    },
    onFinalize: () => {
      if (pinchBase.current) onCommit();
      pinchBase.current = null;
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch);

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const sel = selection
    ? selection.kind === 'text'
      ? (() => {
          const t = s.texts.find((x) => x.id === selection.id);
          return t ? boxOf(textParagraph(t), t.x, t.y, t.size * 0.35) : null;
        })()
      : (() => {
          const t = s.stickers.find((x) => x.id === selection.id);
          return t ? boxOf(stickerParagraph(t), t.x, t.y, t.size * 0.08) : null;
        })()
    : null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {box.w > 0 ? (
        <GestureDetector gesture={gesture}>
          <View style={{ flex: 1 }}>
            <Canvas style={{ flex: 1 }}>
              {comparing && original ? (
                <SkiaImage image={original} x={PAD} y={PAD} width={box.w - PAD * 2} height={box.h - PAD * 2} fit="contain" />
              ) : (
                <Group transform={[{ translateX: ox }, { translateY: oy }, { scale: fit.s }]}>
                  <SceneContent image={image} s={s} extraStroke={live} hideLayers={mode === 'crop'} />
                  {sel && mode !== 'crop' && !comparing ? (
                    <Rect x={sel.x} y={sel.y} width={sel.width} height={sel.height} color={colors.accent} style="stroke" strokeWidth={1.5 / fit.s} />
                  ) : null}
                </Group>
              )}
            </Canvas>
            {mode === 'crop' && !comparing ? (
              <CropOverlay rect={crop} ratio={cropRatio} imgW={s.width} imgH={s.height} scale={fit.s} ox={ox} oy={oy} onChange={onCropChange} />
            ) : null}
          </View>
        </GestureDetector>
      ) : null}
    </View>
  );
}
