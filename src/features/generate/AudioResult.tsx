import RNSlider from '@react-native-community/slider';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { Pause, Play } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, SharedValue, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { formatDuration } from '@/lib/media';
import { colors, gradients, radius, ScalePressable, Text } from '@/ui';
import { GenResult, ResultActions, videoEditorAction } from './ResultActions';

const BARS = 28;
const seeds = Array.from({ length: BARS }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)));

function Bar({ i, level }: { i: number; level: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const wobble = 0.5 + 0.5 * Math.sin(level.value * Math.PI * 2 * (1 + (i % 5) * 0.3) + i);
    const h = 6 + 46 * seeds[i] * (0.25 + 0.75 * wobble * Math.min(1, level.value * 4 + 0.15));
    return { height: h };
  });
  return <Animated.View style={[styles.bar, style]} />;
}

/** Animated visualizer: bars breathe while playing, settle while paused. */
function Visualizer({ playing }: { playing: boolean }) {
  const level = useSharedValue(0);
  useEffect(() => {
    if (playing) level.set(withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(0.2, { duration: 700 })), -1, true));
    else level.set(withTiming(0, { duration: 400 }));
  }, [playing, level]);
  return (
    <View style={styles.viz}>
      {seeds.map((_, i) => (
        <Bar key={i} i={i} level={level} />
      ))}
    </View>
  );
}

/** expo-audio result player: play/pause, scrubber, time, visualizer + actions. */
export function AudioResult({ result, title, onRemix }: { result: GenResult; title: string; onRemix: () => void }) {
  const player = useAudioPlayer(result.uri);
  const st = useAudioPlayerStatus(player);
  const dur = st.duration || 0;

  const toggle = () => {
    if (st.playing) player.pause();
    else {
      if (dur && st.currentTime >= dur - 0.05) player.seekTo(0);
      player.play();
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ marginTop: 22 }}>
      <View style={styles.card}>
        <LinearGradient colors={['rgba(139,123,255,0.28)', 'rgba(200,77,255,0.06)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Text variant="caption" dim>
          YOUR AUDIO · SAVED TO LIBRARY
        </Text>
        <Text variant="heading" numberOfLines={2} style={{ marginTop: 4 }}>
          {title}
        </Text>
        <Visualizer playing={st.playing} />
        <RNSlider
          value={st.currentTime}
          minimumValue={0}
          maximumValue={Math.max(dur, 0.01)}
          onSlidingComplete={(v) => player.seekTo(v)}
          minimumTrackTintColor={colors.audio}
          maximumTrackTintColor={colors.surfacePressed}
          thumbTintColor="#fff"
          disabled={!st.isLoaded}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="caption" faint style={{ width: 48 }}>
            {formatDuration(st.currentTime * 1000)}
          </Text>
          <ScalePressable onPress={toggle} disabled={!st.isLoaded} accessibilityLabel={st.playing ? 'Pause' : 'Play'} style={{ opacity: st.isLoaded ? 1 : 0.5 }}>
            <LinearGradient colors={[...gradients.audio]} style={styles.play}>
              {st.playing ? <Pause size={26} color="#fff" fill="#fff" /> : <Play size={26} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />}
            </LinearGradient>
          </ScalePressable>
          <Text variant="caption" faint style={{ width: 48, textAlign: 'right' }}>
            {formatDuration(dur * 1000)}
          </Text>
        </View>
      </View>
      <ResultActions kind="audio" result={result} onRemix={onRemix} extra={[videoEditorAction(result)]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, overflow: 'hidden', padding: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  viz: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 14 },
  bar: { width: 5, borderRadius: 3, backgroundColor: colors.audio },
  play: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
});
