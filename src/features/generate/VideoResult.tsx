import { useEvent } from 'expo';
import { useVideoPlayer, type VideoPlayer, VideoView } from 'expo-video';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, IconButton, radius, ScalePressable, Text } from '@/ui';
import { GenResult, ResultActions } from './ResultActions';

/** Native player objects are imperative; mutate outside render via a plain helper. */
function setPlayerMuted(p: VideoPlayer, m: boolean) {
  p.muted = m;
}

/** Looping result player with mute toggle + result actions. */
export function VideoResult({ result, aspect, onRemix }: { result: GenResult; aspect: number; onRemix: () => void }) {
  const { width } = useWindowDimensions();
  const player = useVideoPlayer(result.uri, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const { muted } = useEvent(player, 'mutedChange', { muted: player.muted });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const w = width - 32;
  const h = Math.min(w / aspect, 560);

  const toggleMute = () => setPlayerMuted(player, !muted);
  const togglePlay = () => (isPlaying ? player.pause() : player.play());

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ marginTop: 22 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <Text variant="heading">Your video</Text>
        <Text variant="caption" faint>
          Saved to Library
        </Text>
      </View>
      <ScalePressable scaleTo={0.99} haptic={false} onPress={togglePlay} style={[styles.frame, { width: w, height: h }]}>
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
        {!isPlaying ? (
          <View style={styles.center} pointerEvents="none">
            <View style={styles.play}>
              <Play size={28} color="#fff" fill="#fff" />
            </View>
          </View>
        ) : null}
        <View style={styles.controls}>
          <IconButton icon={isPlaying ? Pause : Play} size={36} bg="rgba(0,0,0,0.5)" onPress={togglePlay} accessibilityLabel={isPlaying ? 'Pause' : 'Play'} />
          <IconButton icon={muted ? VolumeX : Volume2} size={36} bg="rgba(0,0,0,0.5)" onPress={toggleMute} accessibilityLabel={muted ? 'Unmute' : 'Mute'} />
        </View>
      </ScalePressable>
      <ResultActions kind="video" result={result} onRemix={onRemix} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: { borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000', borderWidth: 1, borderColor: colors.border, alignSelf: 'center' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  play: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  controls: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', gap: 8 },
});
