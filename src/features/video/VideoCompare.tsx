import { Image } from 'expo-image';
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Segmented, Text, colors, radius } from '@/ui';

function syncTime(dst: VideoPlayer, src: VideoPlayer) {
  dst.currentTime = src.currentTime;
}

/**
 * Before/after for AI video results: both players run in sync (muted "before");
 * toggle with the segmented control, or press-and-hold the video to peek at the original.
 */
export function VideoCompare({ before, after, beforeIsImage }: { before: string; after: string; beforeIsImage?: boolean }) {
  const [mode, setMode] = useState<'after' | 'before'>('after');
  const [holding, setHolding] = useState(false);
  const pa = useVideoPlayer(after, (p) => {
    p.loop = true;
    p.play();
  });
  const pb = useVideoPlayer(beforeIsImage ? null : before, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const showBefore = mode === 'before' || holding;
  useEffect(() => {
    // keep the hidden player roughly in sync when switching
    if (showBefore) syncTime(pb, pa);
    else syncTime(pa, pb);
  }, [showBefore, pa, pb]);
  return (
    <View style={{ flex: 1, gap: 10 }}>
      <Pressable onPressIn={() => setHolding(true)} onPressOut={() => setHolding(false)} style={styles.frame}>
        <VideoView player={pa} style={[StyleSheet.absoluteFill, { opacity: showBefore ? 0 : 1 }]} contentFit="contain" nativeControls={false} />
        {beforeIsImage ? (
          <Image source={{ uri: before }} style={[StyleSheet.absoluteFill, { opacity: showBefore ? 1 : 0 }]} contentFit="contain" />
        ) : (
          <VideoView player={pb} style={[StyleSheet.absoluteFill, { opacity: showBefore ? 1 : 0 }]} contentFit="contain" nativeControls={false} />
        )}
        <Animated.View key={String(showBefore)} entering={FadeIn.duration(150)} style={[styles.tag, { backgroundColor: showBefore ? colors.surfaceHigh : colors.ai }]}>
          <Text variant="caption" color={showBefore ? colors.text : '#fff'}>
            {showBefore ? 'BEFORE' : 'AFTER'}
          </Text>
        </Animated.View>
      </Pressable>
      <View style={{ paddingHorizontal: 16 }}>
        <Segmented
          options={[
            { value: 'before', label: 'Before' },
            { value: 'after', label: 'After' },
          ]}
          value={showBefore ? 'before' : 'after'}
          onChange={setMode}
        />
        <Text variant="caption" faint center style={{ marginTop: 6 }}>
          Press and hold the video to compare
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, marginHorizontal: 16, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000' },
  tag: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
});
