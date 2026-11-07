import { ZoomIn, ZoomOut } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import { GestureDetector, ScrollView, usePanGesture, usePinchGesture } from 'react-native-gesture-handler';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, IconButton, radius, Text } from '@/ui';
import { fmtTime } from './timeline';

export type Selection = { a: number; b: number } | null;

const H = 168;
const BAR = 3; // px per bar (2 bar + 1 gap)
const MAX_ZOOM = 40;

function barsPath(peaks: number[], duration: number, width: number, from: number, to: number) {
  const count = Math.floor(width / BAR);
  if (!peaks.length || count <= 0 || duration <= 0) return '';
  const mid = H / 2;
  let d = '';
  const perBar = peaks.length / count;
  const i0 = Math.max(0, Math.floor((from / duration) * count));
  const i1 = Math.min(count, Math.ceil((to / duration) * count));
  for (let i = i0; i < i1; i++) {
    const s = Math.floor(i * perBar);
    const e = Math.max(s + 1, Math.floor((i + 1) * perBar));
    let v = 0;
    for (let j = s; j < e && j < peaks.length; j++) if (peaks[j] > v) v = peaks[j];
    const h = Math.max(2, v * (H - 28));
    d += `M${i * BAR} ${mid - h / 2}h2v${h}h-2z`;
  }
  return d;
}

function Handle({ x, which, onDrag, onEnd }: { x: number; which: 'a' | 'b'; onDrag: (which: 'a' | 'b', dx: number) => void; onEnd: () => void }) {
  const gesture = usePanGesture({
    runOnJS: true,
    minDistance: 0,
    onUpdate: (e) => onDrag(which, e.translationX),
    onFinalize: () => onEnd(),
  });
  return (
    <GestureDetector gesture={gesture}>
      <View
        hitSlop={{ left: 16, right: 16, top: 8, bottom: 8 }}
        style={{ position: 'absolute', left: x - 11, top: 0, bottom: 0, width: 22, alignItems: 'center' }}>
        <View style={{ width: 3, flex: 1, backgroundColor: colors.accent }} />
        <View
          style={{
            position: 'absolute',
            top: H / 2 - 18,
            width: 18,
            height: 36,
            borderRadius: 6,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <View style={{ width: 2, height: 14, borderRadius: 1, backgroundColor: colors.accentInk, opacity: 0.6 }} />
        </View>
      </View>
    </GestureDetector>
  );
}

export function Waveform({
  peaks,
  duration,
  time,
  selection,
  onSeek,
  onSelect,
  synthetic,
}: {
  peaks: number[];
  duration: number;
  time: number;
  selection: Selection;
  onSeek: (t: number) => void;
  onSelect: (s: Selection) => void;
  synthetic?: boolean;
}) {
  const [viewW, setViewW] = useState(0);
  const [zoom, setZoom] = useState(1);
  const pinchStart = useRef(1);
  const dragStart = useRef<{ a: number; b: number } | null>(null);
  const width = Math.max(1, viewW * zoom);
  const pps = duration > 0 ? width / duration : 1;

  const dimPath = useMemo(() => barsPath(peaks, duration, width, 0, duration), [peaks, duration, width]);
  const selPath = useMemo(
    () => (selection ? barsPath(peaks, duration, width, selection.a, selection.b) : ''),
    [peaks, duration, width, selection],
  );

  const pinch = usePinchGesture({
    runOnJS: true,
    onBegin: () => {
      pinchStart.current = zoom;
    },
    onUpdate: (e) => setZoom(Math.max(1, Math.min(MAX_ZOOM, pinchStart.current * e.scale))),
  });

  // Long-press then drag on the waveform draws a new selection.
  const draw = usePanGesture({
    runOnJS: true,
    activateAfterLongPress: 220,
    onActivate: (e) => {
      const t = Math.max(0, Math.min(duration, e.x / pps));
      dragStart.current = { a: t, b: t };
      onSelect({ a: t, b: Math.min(duration, t + 0.05) });
    },
    onUpdate: (e) => {
      const s = dragStart.current;
      if (!s) return;
      const t = Math.max(0, Math.min(duration, e.x / pps));
      onSelect({ a: Math.min(s.a, t), b: Math.max(s.a, t, Math.min(s.a, t) + 0.05) });
    },
    onFinalize: () => {
      dragStart.current = null;
    },
  });

  const handleDrag = (which: 'a' | 'b', dx: number) => {
    if (!selection) return;
    if (!dragStart.current) dragStart.current = selection;
    const base = dragStart.current;
    const d = dx / pps;
    if (which === 'a') onSelect({ a: Math.max(0, Math.min(base.b - 0.05, base.a + d)), b: base.b });
    else onSelect({ a: base.a, b: Math.min(duration, Math.max(base.a + 0.05, base.b + d)) });
  };
  const endDrag = () => {
    dragStart.current = null;
  };

  const tickStep = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300].find((s) => s * pps >= 64) ?? 600;
  const ticks: number[] = [];
  for (let t = 0; t <= duration && ticks.length < 400; t += tickStep) ticks.push(t);

  return (
    <View onLayout={(e: LayoutChangeEvent) => setViewW(e.nativeEvent.layout.width)}>
      <GestureDetector gesture={pinch}>
        <View style={{ height: H + 22, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.bgElevated, borderWidth: 1, borderColor: colors.border }}>
          {viewW > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
              <View style={{ width, height: H + 22 }}>
                <View style={{ height: 22, flexDirection: 'row' }}>
                  {ticks.map((t) => (
                    <View key={t} style={{ position: 'absolute', left: t * pps, top: 4, flexDirection: 'row', gap: 4 }}>
                      <View style={{ width: 1, height: 14, backgroundColor: colors.borderStrong }} />
                      <Text variant="caption" faint style={{ fontSize: 9 }}>
                        {fmtTime(t, tickStep < 1)}
                      </Text>
                    </View>
                  ))}
                </View>
                <GestureDetector gesture={draw}>
                  <Pressable style={{ width, height: H }} onPress={(e) => onSeek(Math.max(0, Math.min(duration, e.nativeEvent.locationX / pps)))}>
                    <Svg width={width} height={H}>
                      {selection ? (
                        <Rect x={selection.a * pps} y={0} width={(selection.b - selection.a) * pps} height={H} fill="rgba(200,255,77,0.10)" />
                      ) : null}
                      <Path d={dimPath} fill={selection ? 'rgba(161,161,173,0.45)' : colors.audio} />
                      {selPath ? <Path d={selPath} fill={colors.accent} /> : null}
                      <Rect x={Math.min(width - 2, time * pps)} y={0} width={2} height={H} fill="#fff" />
                    </Svg>
                  </Pressable>
                </GestureDetector>
                {selection ? (
                  <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, top: 22, width, height: H }}>
                    <Handle x={selection.a * pps} which="a" onDrag={handleDrag} onEnd={endDrag} />
                    <Handle x={selection.b * pps} which="b" onDrag={handleDrag} onEnd={endDrag} />
                  </View>
                ) : null}
              </View>
            </ScrollView>
          ) : null}
        </View>
      </GestureDetector>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
        <Text variant="caption" faint style={{ flex: 1 }}>
          {synthetic ? 'Preview waveform · ' : ''}Tap to seek · long-press & drag to select · pinch to zoom
        </Text>
        <IconButton icon={ZoomOut} size={32} accessibilityLabel="Zoom out" onPress={() => setZoom((z) => Math.max(1, z / 1.6))} />
        <IconButton icon={ZoomIn} size={32} accessibilityLabel="Zoom in" onPress={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.6))} />
      </View>
    </View>
  );
}
