import { LinearGradient } from 'expo-linear-gradient';
import { Camera, Film, Library, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, ScalePressable, Text, colors, gradients, radius } from '@/ui';
import { captureWithCamera, formatDuration, pickMedia, type Picked } from '@/lib/media';
import { useLibrary, type Asset } from '@/store/library';

/** Polished "no media yet" state for the video screens: pick from Photos, record, or reuse a Library video. */
export function PickSource({
  icon: Icon = Film,
  title,
  body,
  onPicked,
  onAsset,
  footer,
  allowImage,
}: {
  icon?: LucideIcon;
  title: string;
  body: string;
  onPicked: (p: Picked) => void;
  onAsset?: (a: Asset) => void;
  footer?: ReactNode;
  allowImage?: boolean;
}) {
  const recent = useLibrary((s) => s.assets)
    .filter((a) => a.kind === 'video' || (allowImage && a.kind === 'image'))
    .slice(0, 12);
  const pick = async () => {
    const [p] = await pickMedia(allowImage ? 'any' : 'video');
    if (p) onPicked(p);
  };
  const record = async () => {
    const p = await captureWithCamera('video');
    if (p) onPicked(p);
  };
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 60 }}>
      <Animated.View entering={FadeInDown.duration(380)} style={styles.hero}>
        <LinearGradient colors={[...gradients.video]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroIcon}>
          <Icon size={30} color="#fff" />
        </LinearGradient>
        <Text variant="title" center>
          {title}
        </Text>
        <Text dim center>
          {body}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          <Button icon={Film} title={allowImage ? 'Choose media' : 'Choose video'} onPress={pick} />
          <Button icon={Camera} variant="secondary" title="Record" onPress={record} />
        </View>
      </Animated.View>
      {footer}
      {recent.length && onAsset ? (
        <Animated.View entering={FadeInDown.delay(120).duration(380)} style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Library size={16} color={colors.textDim} />
            <Text variant="label" dim>
              From your Library
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {recent.map((a) => (
              <ScalePressable key={a.id} onPress={() => onAsset(a)} style={styles.tile}>
                {a.thumbUri || a.kind === 'image' ? (
                  <Image source={{ uri: a.thumbUri ?? a.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <Film size={22} color={colors.textDim} />
                )}
                {a.durationMs ? (
                  <View style={styles.dur}>
                    <Text variant="caption">{formatDuration(a.durationMs)}</Text>
                  </View>
                ) : null}
              </ScalePressable>
            ))}
          </View>
        </Animated.View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 10,
    padding: 24,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroIcon: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tile: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dur: { position: 'absolute', right: 4, bottom: 4, backgroundColor: colors.overlay, borderRadius: 6, paddingHorizontal: 5 },
});
