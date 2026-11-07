import { Image } from 'expo-image';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { Music, Plus, Type } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import { ScalePressable, Text, colors, haptics } from '@/ui';
import { formatDuration } from '@/lib/media';
import { clipLength, projectLength, type Clip, type VideoProject } from './types';
import { nearestFrame, useThumbs } from './useThumbs';

const CLIP_H = 56;
const FRAME_W = 40;

function TrimHandle({ side, onDrag, onEnd }: { side: 'l' | 'r'; onDrag: (dx: number) => void; onEnd: () => void }) {
  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 1,
    onBegin: () => haptics.tap(),
    onUpdate: (e) => onDrag(e.translationX),
    onFinalize: () => onEnd(),
  });
  return (
    <GestureDetector gesture={pan}>
      <View hitSlop={{ left: 12, right: 12, top: 8, bottom: 8 }} style={[styles.handle, side === 'l' ? { left: -14 } : { right: -14 }]}>
        <View style={styles.grip} />
      </View>
    </GestureDetector>
  );
}

function ClipBlock({
  clip,
  pxPerMs,
  selected,
  onPress,
  onTrim,
  onTrimEnd,
}: {
  clip: Clip;
  pxPerMs: number;
  selected: boolean;
  onPress: () => void;
  onTrim: (inMs: number, outMs: number) => void;
  onTrimEnd: () => void;
}) {
  const frames = useThumbs(clip.uri, clip.durationMs);
  const width = Math.max(8, clipLength(clip) * pxPerMs);
  const start = useRef({ inMs: clip.inMs, outMs: clip.outMs });
  const dragging = useRef(false);
  const begin = () => {
    if (!dragging.current) start.current = { inMs: clip.inMs, outMs: clip.outMs };
    dragging.current = true;
  };
  const end = () => {
    dragging.current = false;
    onTrimEnd();
  };
  const n = Math.max(1, Math.ceil(width / FRAME_W));
  return (
    <Pressable onPress={onPress} style={{ width, height: CLIP_H }}>
      <View style={[styles.clip, selected && styles.clipSel]}>
        {Array.from({ length: n }, (_, k) => {
          const src = clip.inMs + ((k * FRAME_W + FRAME_W / 2) / pxPerMs) * clip.speed;
          const u = nearestFrame(frames, src) ?? clip.thumbUri;
          return u ? (
            <Image key={k} source={{ uri: u }} style={{ width: FRAME_W, height: CLIP_H }} contentFit="cover" />
          ) : (
            <View key={k} style={{ width: FRAME_W, height: CLIP_H, backgroundColor: colors.surfaceHigh }} />
          );
        })}
        {clip.speed !== 1 ? (
          <View style={styles.badge}>
            <Text variant="caption">{clip.speed}x</Text>
          </View>
        ) : null}
      </View>
      {selected ? (
        <>
          <TrimHandle
            side="l"
            onDrag={(dx) => {
              begin();
              onTrim(start.current.inMs + (dx / pxPerMs) * clip.speed, start.current.outMs);
            }}
            onEnd={end}
          />
          <TrimHandle
            side="r"
            onDrag={(dx) => {
              begin();
              onTrim(start.current.inMs, start.current.outMs + (dx / pxPerMs) * clip.speed);
            }}
            onEnd={end}
          />
        </>
      ) : null}
    </Pressable>
  );
}

export type Selection = { type: 'clip' | 'text' | 'music'; id: string } | null;

/** CapCut-style timeline: fixed centre playhead, scroll to scrub. */
export function Timeline({
  project,
  timeMs,
  playing,
  selection,
  onSelect,
  onSeek,
  onTrim,
  onTrimEnd,
  onAddClip,
  onAddText,
  onAddMusic,
}: {
  project: VideoProject;
  timeMs: number;
  playing: boolean;
  selection: Selection;
  onSelect: (s: Selection) => void;
  onSeek: (t: number) => void;
  onTrim: (id: string, inMs: number, outMs: number) => void;
  onTrimEnd: () => void;
  onAddClip: () => void;
  onAddText: () => void;
  onAddMusic: () => void;
}) {
  const { width: screenW } = useWindowDimensions();
  const [zoom, setZoom] = useState(1);
  const pxPerMs = (60 / 1000) * zoom; // 60px per second at 1x
  const total = projectLength(project);
  const pad = screenW / 2;
  const scroller = useRef<ScrollViewInstance>(null);
  const userScrolling = useRef(false);

  useEffect(() => {
    if (userScrolling.current) return;
    scroller.current?.scrollTo({ x: timeMs * pxPerMs, animated: false });
  }, [timeMs, pxPerMs, playing]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!userScrolling.current) return;
    onSeek(e.nativeEvent.contentOffset.x / pxPerMs);
  };
  const endScroll = () => {
    userScrolling.current = false;
  };

  const contentW = total * pxPerMs;
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.timeRow}>
        <Text variant="label" style={{ fontVariant: ['tabular-nums'] }}>
          {formatDuration(timeMs)} <Text variant="label" faint>/ {formatDuration(total)}</Text>
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[0.5, 1, 2].map((z) => (
            <ScalePressable key={z} onPress={() => setZoom(z)} style={[styles.zoom, zoom === z && { backgroundColor: colors.surfacePressed }]}>
              <Text variant="caption" color={zoom === z ? colors.accent : colors.textDim}>
                {z === 0.5 ? '−' : z === 1 ? '1×' : '+'}
              </Text>
            </ScalePressable>
          ))}
        </View>
      </View>
      <View>
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScrollBeginDrag={() => (userScrolling.current = true)}
          onMomentumScrollEnd={endScroll}
          onScrollEndDrag={(e) => {
            if (!e.nativeEvent.velocity?.x) endScroll();
          }}
          onScroll={onScroll}
          contentContainerStyle={{ paddingHorizontal: pad, gap: 8, paddingVertical: 4 }}>
          {/* clips */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {project.clips.map((c) => (
              <ClipBlock
                key={c.id}
                clip={c}
                pxPerMs={pxPerMs}
                selected={selection?.type === 'clip' && selection.id === c.id}
                onPress={() => onSelect(selection?.id === c.id ? null : { type: 'clip', id: c.id })}
                onTrim={(i, o) => onTrim(c.id, i, o)}
                onTrimEnd={onTrimEnd}
              />
            ))}
            <ScalePressable onPress={onAddClip} style={styles.addClip} accessibilityLabel="Add clip">
              <Plus size={22} color={colors.accentInk} />
            </ScalePressable>
          </View>
          {/* text track */}
          <View style={{ height: 26, width: contentW }}>
            {project.texts.map((t) => {
              const sel = selection?.type === 'text' && selection.id === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => onSelect(sel ? null : { type: 'text', id: t.id })}
                  style={[styles.bar, { left: t.startMs * pxPerMs, width: Math.max(24, (t.endMs - t.startMs) * pxPerMs), backgroundColor: sel ? colors.violet : 'rgba(139,123,255,0.35)' }]}>
                  <Type size={12} color="#fff" />
                  <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                    {t.text}
                  </Text>
                </Pressable>
              );
            })}
            {!project.texts.length ? (
              <Pressable onPress={onAddText} style={[styles.bar, styles.ghost, { left: 0, width: Math.max(140, Math.min(contentW, 200)) }]}>
                <Type size={12} color={colors.textDim} />
                <Text variant="caption" dim>
                  Add text
                </Text>
              </Pressable>
            ) : null}
          </View>
          {/* music track */}
          <View style={{ height: 26, width: contentW }}>
            {project.music ? (
              <Pressable
                onPress={() => onSelect({ type: 'music', id: 'music' })}
                style={[styles.bar, { left: 0, width: Math.max(60, contentW), backgroundColor: selection?.type === 'music' ? colors.cyan : 'rgba(77,225,255,0.3)' }]}>
                <Music size={12} color={colors.accentInk} />
                <Text variant="caption" color={selection?.type === 'music' ? colors.accentInk : colors.text} numberOfLines={1} style={{ flex: 1 }}>
                  {project.music.name}
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={onAddMusic} style={[styles.bar, styles.ghost, { left: 0, width: Math.max(140, Math.min(contentW, 200)) }]}>
                <Music size={12} color={colors.textDim} />
                <Text variant="caption" dim>
                  Add music
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
        <View pointerEvents="none" style={[styles.playhead, { left: pad - 1 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  zoom: { minWidth: 30, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh },
  clip: { flex: 1, flexDirection: 'row', overflow: 'hidden', borderRadius: 8, marginRight: 2, borderWidth: 2, borderColor: 'transparent' },
  clipSel: { borderColor: colors.accent },
  badge: { position: 'absolute', right: 4, bottom: 4, backgroundColor: colors.overlay, borderRadius: 6, paddingHorizontal: 5 },
  handle: { position: 'absolute', top: 0, bottom: 0, width: 16, borderRadius: 6, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  grip: { width: 3, height: 18, borderRadius: 2, backgroundColor: colors.accentInk },
  addClip: { width: 44, height: 44, marginLeft: 10, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', top: 0, height: 26, borderRadius: 7, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 5, overflow: 'hidden' },
  ghost: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, backgroundColor: 'transparent' },
  playhead: { position: 'absolute', top: -2, bottom: -2, width: 2, borderRadius: 1, backgroundColor: '#fff' },
});
