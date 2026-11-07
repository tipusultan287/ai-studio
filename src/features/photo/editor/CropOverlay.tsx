import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { colors } from '@/ui';
import { clamp, type Rect } from './geometry';

type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'move';
const MIN = 48; // min crop size in image px

/** Interactive crop rectangle drawn over the fitted image. Rect is in image pixels. */
export function CropOverlay({
  rect,
  ratio,
  imgW,
  imgH,
  scale,
  ox,
  oy,
  onChange,
}: {
  rect: Rect;
  ratio: number | null;
  imgW: number;
  imgH: number;
  scale: number;
  ox: number;
  oy: number;
  onChange: (r: Rect) => void;
}) {
  const start = useRef<{ h: Handle; r: Rect } | null>(null);
  const v = { left: ox + rect.x * scale, top: oy + rect.y * scale, width: rect.width * scale, height: rect.height * scale };

  const pan = usePanGesture({
    disableReanimated: true,
    runOnJS: true,
    minDistance: 0,
    maxPointers: 1,
    onBegin: (e) => {
      const corners: [Handle, number, number][] = [
        ['tl', v.left, v.top],
        ['tr', v.left + v.width, v.top],
        ['bl', v.left, v.top + v.height],
        ['br', v.left + v.width, v.top + v.height],
      ];
      let best: Handle = 'move';
      let bd = 36;
      for (const [h, x, y] of corners) {
        const d = Math.hypot(e.x - x, e.y - y);
        if (d < bd) {
          bd = d;
          best = h;
        }
      }
      start.current = { h: best, r: rect };
    },
    onUpdate: (e) => {
      const st = start.current;
      if (!st) return;
      const dx = e.translationX / scale;
      const dy = e.translationY / scale;
      const r0 = st.r;
      if (st.h === 'move') {
        onChange({ ...r0, x: clamp(r0.x + dx, 0, imgW - r0.width), y: clamp(r0.y + dy, 0, imgH - r0.height) });
        return;
      }
      // anchor = opposite corner
      const right = r0.x + r0.width;
      const bottom = r0.y + r0.height;
      const ax = st.h === 'tl' || st.h === 'bl' ? right : r0.x;
      const ay = st.h === 'tl' || st.h === 'tr' ? bottom : r0.y;
      let px = (st.h === 'tl' || st.h === 'bl' ? r0.x : right) + dx;
      let py = (st.h === 'tl' || st.h === 'tr' ? r0.y : bottom) + dy;
      px = clamp(px, 0, imgW);
      py = clamp(py, 0, imgH);
      let w = Math.max(MIN, Math.abs(px - ax));
      let h = Math.max(MIN, Math.abs(py - ay));
      if (ratio) {
        if (w / h > ratio) w = h * ratio;
        else h = w / ratio;
        const maxW = st.h === 'tl' || st.h === 'bl' ? ax : imgW - ax;
        const maxH = st.h === 'tl' || st.h === 'tr' ? ay : imgH - ay;
        const k = Math.min(1, maxW / w, maxH / h);
        w *= k;
        h *= k;
      }
      const x = st.h === 'tl' || st.h === 'bl' ? ax - w : ax;
      const y = st.h === 'tl' || st.h === 'tr' ? ay - h : ay;
      onChange({ x: clamp(x, 0, imgW - w), y: clamp(y, 0, imgH - h), width: Math.min(w, imgW), height: Math.min(h, imgH) });
    },
    onFinalize: () => {
      start.current = null;
    },
  });

  const shade = 'rgba(0,0,0,0.6)';
  return (
    <GestureDetector gesture={pan}>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: v.top, backgroundColor: shade }} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: v.top + v.height, bottom: 0, backgroundColor: shade }} />
        <View style={{ position: 'absolute', left: 0, width: v.left, top: v.top, height: v.height, backgroundColor: shade }} />
        <View style={{ position: 'absolute', left: v.left + v.width, right: 0, top: v.top, height: v.height, backgroundColor: shade }} />
        <View pointerEvents="none" style={{ position: 'absolute', ...v, borderWidth: 1.5, borderColor: '#fff' }}>
          {[1, 2].map((i) => (
            <View key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: `${(i * 100) / 3}%`, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.5)' }} />
          ))}
          {[1, 2].map((i) => (
            <View key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: `${(i * 100) / 3}%`, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.5)' }} />
          ))}
          {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
            <View
              key={c}
              style={{
                position: 'absolute',
                width: 22,
                height: 22,
                borderColor: colors.accent,
                [c[0] === 't' ? 'top' : 'bottom']: -3,
                [c[1] === 'l' ? 'left' : 'right']: -3,
                [c[0] === 't' ? 'borderTopWidth' : 'borderBottomWidth']: 4,
                [c[1] === 'l' ? 'borderLeftWidth' : 'borderRightWidth']: 4,
              }}
            />
          ))}
        </View>
      </View>
    </GestureDetector>
  );
}
