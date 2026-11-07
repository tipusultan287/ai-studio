import { BlurView } from 'expo-blur';
import { useVideoPlayer, VideoView } from 'expo-video';
import { CheckCircle2, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, IconButton, Text, colors, radius } from '@/ui';
import { ResultActions } from './ResultActions';

/** Glass sheet shown after a successful export: plays the MP4, Save / Share / open in Library. */
export function ExportDone({ uri, onOpen, onClose }: { uri: string; onOpen: () => void; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return (
    <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
      <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16, gap: 14 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 }}>
          <CheckCircle2 size={22} color={colors.success} />
          <Text variant="heading" style={{ flex: 1 }}>
            Exported to Library
          </Text>
          <IconButton icon={X} onPress={onClose} accessibilityLabel="Close" />
        </View>
        <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.video}>
          <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls />
        </Animated.View>
        <ResultActions uri={uri} />
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
          <Button variant="secondary" title="View in Library" onPress={onOpen} style={{ flex: 1 }} full />
          <Button variant="primary" title="Keep editing" onPress={onClose} style={{ flex: 1 }} full />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  video: { flex: 1, marginHorizontal: 16, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000' },
});
