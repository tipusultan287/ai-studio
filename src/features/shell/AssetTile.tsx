import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { AudioLines, Play, Sparkles } from 'lucide-react-native';
import { View } from 'react-native';
import { formatDuration } from '@/lib/media';
import type { Asset } from '@/store/library';
import { colors, gradients, kindColor, radius, ScalePressable, Text } from '@/ui';

export function AssetTile({ asset, size, onPress, showTitle }: { asset: Asset; size: number; onPress?: () => void; showTitle?: boolean }) {
  const thumb = asset.thumbUri ?? (asset.kind === 'image' ? asset.uri : undefined);
  return (
    <ScalePressable onPress={onPress} style={{ width: size }}>
      <View style={{ width: size, height: size, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceHigh }}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={{ flex: 1 }} contentFit="cover" transition={150} />
        ) : (
          <LinearGradient colors={[...gradients.audio]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AudioLines size={size * 0.3} color="#fff" />
          </LinearGradient>
        )}
        <View style={{ position: 'absolute', top: 6, left: 6, flexDirection: 'row', gap: 4 }}>
          {asset.source === 'generated' || asset.source === 'ai-edit' ? (
            <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: 4 }}>
              <Sparkles size={11} color={colors.ai} />
            </View>
          ) : null}
        </View>
        {asset.kind !== 'image' ? (
          <View style={{ position: 'absolute', bottom: 6, left: 6, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 }}>
            {asset.kind === 'video' ? <Play size={10} color="#fff" fill="#fff" /> : <AudioLines size={10} color="#fff" />}
            {asset.durationMs ? (
              <Text variant="caption" color="#fff">
                {formatDuration(asset.durationMs)}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 3, backgroundColor: kindColor[asset.kind], borderTopLeftRadius: 2 }} />
      </View>
      {showTitle ? (
        <Text variant="caption" dim numberOfLines={1} style={{ marginTop: 6 }}>
          {asset.title}
        </Text>
      ) : null}
    </ScalePressable>
  );
}
