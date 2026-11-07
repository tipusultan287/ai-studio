import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowUpRight, Clapperboard, Eraser, ImagePlus, Layers, Mic, Music4, Orbit, Palette, Scissors, Sparkles, Volume2, Wand2, Zap, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { KeyBanner } from '@/features/shell/KeyBanner';
import { pickAndAi } from '@/features/shell/navigate';
import { colors, gradients, PromptInput, radius, ScalePressable, Screen, SectionHeader, Segmented, Text, Button } from '@/ui';

type Mode = 'image' | 'video' | 'audio';

const IDEAS: Record<Mode, string[]> = {
  image: ['A lone astronaut in a field of sunflowers, golden hour, 35mm', 'Minimal perfume bottle on wet black stone, studio light', 'Cozy Kyoto alley at night in the rain, neon reflections'],
  video: ['Drone shot over a misty fjord at sunrise', 'A paper boat sailing through a flooded neon city', 'Slow motion coffee pour, macro, warm light'],
  audio: ['Warm lo-fi beat with vinyl crackle and soft keys', 'Epic cinematic trailer hit with deep boom', 'Friendly narrator: "Welcome to AI Studio"'],
};

export default function Create() {
  const [mode, setMode] = useState<Mode>('image');
  const [prompt, setPrompt] = useState('');

  const go = () => {
    const p = prompt.trim();
    if (mode === 'image') router.push({ pathname: '/generate/image', params: p ? { prompt: p } : {} });
    else if (mode === 'video') router.push({ pathname: '/generate/video', params: p ? { prompt: p } : {} });
    else router.push({ pathname: '/generate/audio', params: { mode: 'music', ...(p ? { prompt: p } : {}) } });
  };

  return (
    <Screen>
      <Text variant="display" style={{ marginTop: 8 }}>
        Create
      </Text>
      <Text dim style={{ marginTop: 4 }}>
        Generate and transform with Runware AI.
      </Text>
      <KeyBanner />

      <View style={{ marginTop: 20, gap: 12 }}>
        <Segmented
          options={[
            { value: 'image', label: 'Image' },
            { value: 'video', label: 'Video' },
            { value: 'audio', label: 'Audio' },
          ]}
          value={mode}
          onChange={setMode}
        />
        <PromptInput value={prompt} onChangeText={setPrompt} placeholder={`Describe the ${mode} you want…`} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {IDEAS[mode].map((i) => (
            <ScalePressable key={i} onPress={() => setPrompt(i)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, maxWidth: '100%' }}>
              <Text variant="caption" dim numberOfLines={1}>
                {i}
              </Text>
            </ScalePressable>
          ))}
        </View>
        <Button title={`Generate ${mode}`} icon={Sparkles} variant="ai" size="lg" full onPress={go} />
      </View>

      <SectionHeader title="Generate" />
      <View style={{ gap: 10 }}>
        <BigRow icon={ImagePlus} grad={gradients.photo} title="Image generation" sub="FLUX.2, Nano Banana, Seedream, Ideogram" onPress={() => router.push('/generate/image')} />
        <BigRow icon={Clapperboard} grad={gradients.video} title="Video generation" sub="Text → video or animate a photo. Kling, Veo, Seedance" onPress={() => router.push('/generate/video')} />
        <BigRow icon={Mic} grad={gradients.audio} title="Voice & speech" sub="Natural text-to-speech voiceovers" onPress={() => router.push({ pathname: '/generate/audio', params: { mode: 'speech' } })} />
        <BigRow icon={Music4} grad={gradients.audio} title="Music" sub="Songs and beats from a prompt, with lyrics" onPress={() => router.push({ pathname: '/generate/audio', params: { mode: 'music' } })} />
        <BigRow icon={Volume2} grad={gradients.audio} title="Sound effects" sub="Any sound, described in words" onPress={() => router.push({ pathname: '/generate/audio', params: { mode: 'sfx' } })} />
      </View>

      <SectionHeader title="Transform a photo" />
      <Grid
        items={[
          { icon: Wand2, label: 'Replace background', onPress: () => pickAndAi('image', 'bg') },
          { icon: Eraser, label: 'Remove object', onPress: () => pickAndAi('image', 'remove') },
          { icon: Sparkles, label: 'Edit anything', onPress: () => pickAndAi('image', 'edit') },
          { icon: Scissors, label: 'Cut out', onPress: () => pickAndAi('image', 'cutout') },
          { icon: Zap, label: 'Upscale', onPress: () => pickAndAi('image', 'upscale') },
          { icon: Palette, label: 'Restyle', onPress: () => pickAndAi('image', 'restyle') },
        ]}
      />

      <SectionHeader title="Transform a video" />
      <Grid
        items={[
          { icon: Orbit, label: 'Change scene', onPress: () => pickAndAi('video', 'scene') },
          { icon: Eraser, label: 'Remove object', onPress: () => pickAndAi('video', 'remove') },
          { icon: Sparkles, label: 'Add / change', onPress: () => pickAndAi('video', 'edit') },
          { icon: Palette, label: 'Restyle', onPress: () => pickAndAi('video', 'restyle') },
          { icon: Layers, label: 'Remove BG', onPress: () => pickAndAi('video', 'cutout') },
          { icon: Zap, label: 'Enhance', onPress: () => pickAndAi('video', 'upscale') },
        ]}
      />
    </Screen>
  );
}

function BigRow({ icon: Icon, grad, title, sub, onPress }: { icon: LucideIcon; grad: readonly [string, string, ...string[]]; title: string; sub: string; onPress: () => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <ScalePressable onPress={onPress} scaleTo={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
        <LinearGradient colors={[...grad]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={22} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{title}</Text>
          <Text variant="caption" dim numberOfLines={2}>
            {sub}
          </Text>
        </View>
        <ArrowUpRight size={18} color={colors.textFaint} />
      </ScalePressable>
    </Animated.View>
  );
}

function Grid({ items }: { items: { icon: LucideIcon; label: string; onPress: () => void }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {items.map((i) => (
        <ScalePressable key={i.label} onPress={i.onPress} style={{ width: '31.5%', aspectRatio: 1, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 12, justifyContent: 'space-between' }}>
          <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.aiSoft, alignItems: 'center', justifyContent: 'center' }}>
            <i.icon size={18} color={colors.ai} />
          </View>
          <Text variant="label" numberOfLines={2}>
            {i.label}
          </Text>
        </ScalePressable>
      ))}
    </View>
  );
}
