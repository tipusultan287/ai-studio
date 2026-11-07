import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  AudioLines,
  Clapperboard,
  Eraser,
  Film,
  ImagePlus,
  Images,
  Mic,
  Music4,
  Orbit,
  Scissors,
  Shirt,
  Sparkles,
  Wand2,
  type LucideIcon,
} from 'lucide-react-native';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AssetTile } from '@/features/shell/AssetTile';
import { KeyBanner } from '@/features/shell/KeyBanner';
import { openAsset, pickAndAi, pickAndEdit } from '@/features/shell/navigate';
import { useLibrary } from '@/store/library';
import { colors, gradients, radius, ScalePressable, Screen, SectionHeader, Text } from '@/ui';

type Tile = { title: string; sub: string; icon: LucideIcon; grad: readonly [string, string, ...string[]]; onPress: () => void };

export default function Studio() {
  const { width } = useWindowDimensions();
  const assets = useLibrary((s) => s.assets);
  const half = (width - 16 * 2 - 12) / 2;

  const create: Tile[] = [
    { title: 'Image', sub: 'Text to image', icon: ImagePlus, grad: gradients.photo, onPress: () => router.push('/generate/image') },
    { title: 'Video', sub: 'Text or photo to video', icon: Clapperboard, grad: gradients.video, onPress: () => router.push('/generate/video') },
    { title: 'Audio', sub: 'Voice, music, SFX', icon: Music4, grad: gradients.audio, onPress: () => router.push('/generate/audio') },
  ];
  const edit: Tile[] = [
    { title: 'Photo', sub: 'Adjust, filters, text', icon: Images, grad: gradients.photo, onPress: () => pickAndEdit('image') },
    { title: 'Video', sub: 'Trim, timeline, music', icon: Film, grad: gradients.video, onPress: () => pickAndEdit('video') },
    { title: 'Audio', sub: 'Cut, fade, effects', icon: AudioLines, grad: gradients.audio, onPress: () => router.push('/audio/editor') },
  ];
  const quick: { label: string; icon: LucideIcon; onPress: () => void }[] = [
    { label: 'Replace background', icon: Wand2, onPress: () => pickAndAi('image', 'bg') },
    { label: 'Remove object', icon: Eraser, onPress: () => pickAndAi('image', 'remove') },
    { label: 'Change outfit', icon: Shirt, onPress: () => pickAndAi('image', 'edit') },
    { label: 'Cut out subject', icon: Scissors, onPress: () => pickAndAi('image', 'cutout') },
    { label: 'Erase from video', icon: Eraser, onPress: () => pickAndAi('video', 'remove') },
    { label: 'Voiceover', icon: Mic, onPress: () => router.push({ pathname: '/generate/audio', params: { mode: 'speech' } }) },
  ];

  return (
    <Screen>
      <Animated.View entering={FadeInDown.duration(500)} style={{ marginTop: 8 }}>
        <Text variant="caption" color={colors.accent} style={{ letterSpacing: 2 }}>
          AI STUDIO
        </Text>
        <Text variant="display" style={{ marginTop: 6 }}>
          Make anything.{'\n'}
          <Text variant="display" color={colors.textDim}>
            Edit everything.
          </Text>
        </Text>
      </Animated.View>

      <KeyBanner />

      {/* Hero: video scene change */}
      <Animated.View entering={FadeInDown.delay(80).duration(500)}>
        <ScalePressable onPress={() => pickAndAi('video', 'scene')} scaleTo={0.98} style={{ marginTop: 20 }}>
          <LinearGradient colors={['#2A0F08', '#5A1E10', '#B8442A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.xl, padding: 20, height: 200, overflow: 'hidden' }}>
            <View style={{ position: 'absolute', right: -50, top: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: '#E2683E', opacity: 0.85 }} />
            <View style={{ position: 'absolute', right: 10, top: 40, width: 60, height: 14, borderRadius: 7, backgroundColor: '#9C3A22', opacity: 0.7 }} />
            <View style={{ position: 'absolute', right: 70, top: 100, width: 30, height: 10, borderRadius: 5, backgroundColor: '#9C3A22', opacity: 0.6 }} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill }}>
              <Orbit size={13} color={colors.ai} />
              <Text variant="caption" color="#fff">
                AI SCENE CHANGE
              </Text>
            </View>
            <View style={{ flex: 1 }} />
            <Text variant="title" color="#fff">
              Shot it in your room.{'\n'}Now it&apos;s on Mars.
            </Text>
            <Text variant="label" color="rgba(255,255,255,0.75)" style={{ marginTop: 6 }}>
              Pick a video and move it anywhere →
            </Text>
          </LinearGradient>
        </ScalePressable>
      </Animated.View>

      <SectionHeader title="Generate" action={<Sparkles size={18} color={colors.ai} />} />
      <TileRow tiles={create} width={(width - 32 - 20) / 3} />

      <SectionHeader title="Edit" />
      <TileRow tiles={edit} width={(width - 32 - 20) / 3} />

      <SectionHeader title="AI quick actions" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
        {quick.map((q) => (
          <ScalePressable
            key={q.label}
            onPress={q.onPress}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
            <q.icon size={16} color={colors.ai} />
            <Text variant="label">{q.label}</Text>
          </ScalePressable>
        ))}
      </ScrollView>

      {assets.length ? (
        <>
          <SectionHeader
            title="Recent"
            action={
              <ScalePressable onPress={() => router.push('/library')}>
                <Text variant="label" color={colors.accent}>
                  See all
                </Text>
              </ScalePressable>
            }
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}>
            {assets.slice(0, 12).map((a) => (
              <AssetTile key={a.id} asset={a} size={half * 0.7} onPress={() => openAsset(a)} showTitle />
            ))}
          </ScrollView>
        </>
      ) : null}
    </Screen>
  );
}

function TileRow({ tiles, width }: { tiles: Tile[]; width: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {tiles.map((t, i) => (
        <Animated.View key={t.title} entering={FadeInDown.delay(120 + i * 60).duration(450)}>
          <ScalePressable onPress={t.onPress} style={{ width, height: width * 1.15, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 12, justifyContent: 'space-between' }}>
            <LinearGradient colors={[...t.grad]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <t.icon size={20} color="#fff" strokeWidth={2.2} />
            </LinearGradient>
            <View>
              <Text variant="heading">{t.title}</Text>
              <Text variant="caption" dim numberOfLines={2}>
                {t.sub}
              </Text>
            </View>
          </ScalePressable>
        </Animated.View>
      ))}
    </View>
  );
}
