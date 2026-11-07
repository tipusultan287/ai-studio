import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, ImagePlus, type LucideIcon } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureWithCamera, pickMedia } from '@/lib/media';
import { useLibrary } from '@/store/library';
import { Button, colors, gradients, radius, ScalePressable, Text, TopBar } from '@/ui';

/** Empty state for photo routes opened without a uri: library, camera, or a recent asset. */
export function PickPhoto({
  title,
  subtitle,
  icon: Icon,
  ai,
  onPicked,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  ai?: boolean;
  onPicked: (uri: string, assetId?: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const recent = useLibrary((s) => s.assets).filter((a) => a.kind === 'image').slice(0, 12);
  const pick = async () => {
    const [p] = await pickMedia('image');
    if (p) onPicked(p.uri);
  };
  const shoot = async () => {
    const p = await captureWithCamera('image');
    if (p) onPicked(p.uri);
  };
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title={title} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 20 }}>
        <Animated.View entering={FadeInDown.springify()} style={{ borderRadius: radius.xl, overflow: 'hidden' }}>
          <LinearGradient
            colors={ai ? ['rgba(255,122,89,0.22)', 'rgba(139,123,255,0.10)'] : ['rgba(77,225,255,0.18)', 'rgba(77,123,255,0.06)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: 24, gap: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl }}>
            <LinearGradient
              colors={ai ? [...gradients.ai] : [...gradients.photo]}
              style={{ width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={26} color="#fff" />
            </LinearGradient>
            <Text variant="title">Choose a photo</Text>
            <Text dim>{subtitle}</Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              <Button title="Photo library" icon={ImagePlus} variant={ai ? 'ai' : 'primary'} onPress={pick} />
              <Button title="Camera" icon={Camera} variant="secondary" onPress={shoot} />
            </View>
          </LinearGradient>
        </Animated.View>
        {recent.length ? (
          <View style={{ gap: 12 }}>
            <Text variant="heading">From your library</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {recent.map((a) => (
                <ScalePressable key={a.id} onPress={() => onPicked(a.uri, a.id)} style={{ width: '31.5%', aspectRatio: 1, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.surface }}>
                  <Image source={{ uri: a.thumbUri ?? a.uri }} style={{ flex: 1 }} contentFit="cover" transition={150} />
                </ScalePressable>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
