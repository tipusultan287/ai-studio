import { VideoView, type VideoPlayer } from 'expo-video';
import { Pause, Play } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Text, colors } from '@/ui';
import { adjustPreview, filterById } from './filters';
import { aspectRatioOf, locate, type TextOverlay, type VideoProject } from './types';

function OverlayText({ t, h }: { t: TextOverlay; h: number }) {
  const size = Math.max(10, h * t.size);
  const pos = t.position === 'top' ? { top: h * 0.08 } : t.position === 'bottom' ? { bottom: h * 0.08 } : { top: 0, bottom: 0, justifyContent: 'center' as const };
  return (
    <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(120)} pointerEvents="none" style={[styles.textWrap, pos]}>
      <Text
        style={[
          { fontSize: size, lineHeight: size * 1.2, color: t.color, fontWeight: t.style === 'clean' ? '600' : '900', textAlign: 'center' },
          t.style === 'box' && { backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: size * 0.35, paddingVertical: size * 0.15, borderRadius: 6 },
          (t.style === 'bold' || t.style === 'clean') && { textShadowColor: 'rgba(0,0,0,0.85)', textShadowRadius: t.style === 'bold' ? 4 : 3, textShadowOffset: { width: 1, height: 1 } },
          t.style === 'neon' && { textShadowColor: t.color, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } },
        ]}>
        {t.text}
      </Text>
    </Animated.View>
  );
}

/** Canvas-shaped live preview: video + approximate look tint + live text overlays. */
export function Preview({
  player,
  project,
  timeMs,
  playing,
  onToggle,
}: {
  player: VideoPlayer;
  project: VideoProject;
  timeMs: number;
  playing: boolean;
  onToggle: () => void;
}) {
  const [box, setBox] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const ratio = aspectRatioOf(project);
  let w = Math.max(0, box.w - 24);
  let h = w / ratio;
  if (h > box.h) {
    h = box.h;
    w = h * ratio;
  }
  const loc = locate(project, timeMs);
  const clip = loc ? project.clips[loc.index] : undefined;
  const look = clip ? filterById(clip.filter) : undefined;
  const veil = clip ? adjustPreview(clip.adjust) : null;
  const satDrop = clip && clip.adjust.saturation < 0 ? (-clip.adjust.saturation / 100) * 0.45 : 0;
  const visibleTexts = project.texts.filter((t) => timeMs >= t.startMs && timeMs <= t.endMs);

  return (
    <View style={styles.area} onLayout={onLayout}>
      {box.w > 0 && project.clips.length ? (
        <Pressable onPress={onToggle} style={{ width: w, height: h, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' }}>
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
          {look?.tint ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: look.tint }]} /> : null}
          {satDrop ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(128,128,128,${satDrop})` }]} /> : null}
          {veil ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: veil.color, opacity: veil.opacity }]} /> : null}
          {visibleTexts.map((t) => (
            <OverlayText key={t.id} t={t} h={h} />
          ))}
          {!playing ? (
            <Animated.View entering={FadeIn} exiting={FadeOut} pointerEvents="none" style={styles.playBadge}>
              <Play size={26} color="#fff" fill="#fff" />
            </Animated.View>
          ) : (
            <View pointerEvents="none" style={[styles.playBadge, { opacity: 0 }]}>
              <Pause size={26} color="#fff" />
            </View>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  textWrap: { position: 'absolute', left: '6%', right: '6%', alignItems: 'center' },
  playBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
});
