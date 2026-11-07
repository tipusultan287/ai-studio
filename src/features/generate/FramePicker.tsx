import { Image } from 'expo-image';
import { ImagePlus, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { pickMedia } from '@/lib/media';
import { colors, radius, ScalePressable, Text } from '@/ui';

/** Square tile to pick (or clear) an image: used for reference images and video first/last frames. */
export function FramePicker({
  label,
  uri,
  onChange,
  size = 104,
}: {
  label: string;
  uri?: string;
  onChange: (uri: string | undefined) => void;
  size?: number;
}) {
  const pick = async () => {
    const [p] = await pickMedia('image');
    if (p) onChange(p.uri);
  };
  return (
    <View style={{ gap: 6, width: size }}>
      <ScalePressable onPress={pick} style={[styles.tile, { width: size, height: size }, uri ? styles.filled : null]} accessibilityLabel={`Pick ${label}`}>
        {uri ? (
          <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <ImagePlus size={22} color={colors.textDim} />
            <Text variant="caption" faint>
              Add
            </Text>
          </View>
        )}
      </ScalePressable>
      {uri ? (
        <ScalePressable onPress={() => onChange(undefined)} style={styles.clear} accessibilityLabel={`Remove ${label}`} hitSlop={8}>
          <X size={14} color="#fff" strokeWidth={3} />
        </ScalePressable>
      ) : null}
      <Text variant="caption" dim center numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  filled: { borderStyle: 'solid', borderColor: colors.ai },
  clear: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
