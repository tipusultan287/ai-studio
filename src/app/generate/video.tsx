import { useLocalSearchParams } from 'expo-router';
import { ArrowRight, Clock, Film, Lightbulb, Move3d, Wand2 } from 'lucide-react-native';
import { useState } from 'react';
import { Image, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { addToLibrary } from '@/lib/media';
import { Aspect, generateVideo, GenerateVideoParams } from '@/lib/runware';
import { useTask } from '@/lib/useTask';
import { useSettings } from '@/store/settings';
import { Chip, ChipRow, colors, gradients, haptics, ProgressOverlay, PromptInput, radius, Screen, Segmented, Text, TopBar } from '@/ui';
import { FramePicker } from '@/features/generate/FramePicker';
import { ModelField, ModelPicker } from '@/features/generate/ModelPicker';
import { ChipScroller, Field, GenerateBar, GenHero, ToggleChips } from '@/features/generate/parts';
import { CAMERA_MOTIONS, enhancePrompt, VIDEO_ASPECTS, VIDEO_DURATIONS, VIDEO_INSPIRATION, withSuffix } from '@/features/generate/presets';
import type { GenResult } from '@/features/generate/ResultActions';
import { VideoResult } from '@/features/generate/VideoResult';

type Mode = 't2v' | 'i2v';
const MODES = [
  { value: 't2v' as const, label: 'Text → Video' },
  { value: 'i2v' as const, label: 'Image → Video' },
];
const DURATIONS = VIDEO_DURATIONS.map((d) => ({ value: String(d) as `${typeof d}`, label: `${d}s` }));
const ratio = (a: Aspect) => {
  const [w, h] = a.split(':').map(Number);
  return w / h;
};

export default function GenerateVideo() {
  const params = useLocalSearchParams<{ prompt?: string; imageUri?: string }>();
  const defaultModel = useSettings((s) => s.models.video);
  const [mode, setMode] = useState<Mode>(params.imageUri ? 'i2v' : 't2v');
  const [prompt, setPrompt] = useState(params.prompt ?? '');
  const [first, setFirst] = useState<string | undefined>(params.imageUri);
  const [last, setLast] = useState<string | undefined>();
  const [motion, setMotion] = useState<string | null>(null);
  const [duration, setDuration] = useState<string>('5');
  const [aspect, setAspect] = useState<Aspect>('9:16');
  const [model, setModel] = useState(defaultModel);
  const [picker, setPicker] = useState(false);
  const [result, setResult] = useState<{ r: GenResult; aspect: number } | null>(null);
  const [lastRun, setLastRun] = useState<GenerateVideoParams | null>(null);
  const t = useTask();

  const needsImage = mode === 'i2v' && !first;
  const canGo = !t.running && !needsImage && (mode === 'i2v' || !!prompt.trim());

  const run = async (p: GenerateVideoParams) => {
    haptics.impact();
    setLastRun(p);
    setResult(null);
    const out = await t.start(async (opts) => {
      const url = await generateVideo(p, opts);
      if (!url) throw new Error('The model returned no video. Try again or pick another model.');
      opts.onProgress?.({ status: 'Saving to Library…' });
      const a = await addToLibrary({ uri: url, kind: 'video', source: 'generated', prompt: p.prompt, model: p.model });
      return { uri: a.uri, assetId: a.id };
    });
    if (!out) return;
    let ar = ratio(p.aspect ?? '9:16');
    if (p.firstFrameUri) {
      try {
        const s = await Image.getSize(p.firstFrameUri);
        if (s.width && s.height) ar = s.width / s.height;
      } catch {}
    }
    setResult({ r: out, aspect: ar });
  };

  const generate = () => {
    const m = CAMERA_MOTIONS.find((c) => c.value === motion);
    const base = prompt.trim() || 'Bring this image to life with natural, cinematic motion';
    run({
      prompt: withSuffix(base, m?.suffix),
      duration: Number(duration),
      aspect,
      model,
      firstFrameUri: mode === 'i2v' ? first : undefined,
      lastFrameUri: mode === 'i2v' ? last : undefined,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen header={<TopBar title="Generate video" subtitle="Text or image → Video · Runware" />}>
        <GenHero icon={Film} title="Direct a shot" body="Describe the scene and camera — AI films it." grad={gradients.video} />

        <View style={{ marginTop: 18 }}>
          <Segmented options={MODES} value={mode} onChange={setMode} />
        </View>

        {mode === 'i2v' ? (
          <Animated.View entering={FadeIn.duration(250)}>
            <Field label="Frames" hint="first frame required · last optional">
              <ChipScroller>
                <FramePicker label="First frame" uri={first} onChange={setFirst} size={120} />
                <View style={{ justifyContent: 'center', height: 120 }}>
                  <ArrowRight size={20} color={colors.textFaint} />
                </View>
                <FramePicker label="Last frame" uri={last} onChange={setLast} size={120} />
              </ChipScroller>
            </Field>
          </Animated.View>
        ) : null}

        <Field label={mode === 'i2v' ? 'Motion prompt' : 'Prompt'} hint={mode === 'i2v' ? 'optional' : undefined}>
          <PromptInput
            value={prompt}
            onChangeText={setPrompt}
            minHeight={100}
            placeholder={mode === 'i2v' ? 'The camera slowly pulls back as wind moves through her hair…' : 'A red vintage car drives along a coastal road at sunset…'}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Enhance prompt" icon={Wand2} onPress={() => prompt.trim() && setPrompt(enhancePrompt(prompt))} />
          </View>
          {mode === 't2v' && !prompt.trim() ? (
            <ChipScroller>
              {VIDEO_INSPIRATION.map((s) => (
                <Chip key={s} label={s.length > 34 ? `${s.slice(0, 32)}…` : s} icon={Lightbulb} onPress={() => setPrompt(s)} />
              ))}
            </ChipScroller>
          ) : null}
        </Field>

        <Field label="Camera motion">
          <ToggleChips options={CAMERA_MOTIONS} value={motion} onChange={setMotion} icon={Move3d} />
        </Field>

        <Field label="Duration">
          <View style={{ marginHorizontal: -16 }}>
            <ChipRow options={DURATIONS} value={duration as (typeof DURATIONS)[number]['value']} onChange={setDuration} />
          </View>
        </Field>

        {mode === 't2v' ? (
          <Field label="Aspect ratio">
            <View style={{ marginHorizontal: -16 }}>
              <ChipRow options={VIDEO_ASPECTS} value={aspect} onChange={setAspect} />
            </View>
          </Field>
        ) : (
          <Text variant="caption" faint style={{ marginTop: 10 }}>
            Aspect ratio follows your first frame.
          </Text>
        )}

        <Field label="Model">
          <ModelField slot="video" value={model} onPress={() => setPicker(true)} />
        </Field>

        <View style={{ marginTop: 16, flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.aiSoft }}>
          <Clock size={18} color={colors.ai} />
          <Text variant="label" dim style={{ flex: 1 }}>
            Videos usually take 1–5 minutes to render. Keep the app open — you can cancel anytime. Longer clips and premium models cost more credits.
          </Text>
        </View>

        {result ? <VideoResult key={result.r.assetId} result={result.r} aspect={result.aspect} onRemix={() => lastRun && run(lastRun)} /> : null}
      </Screen>

      <GenerateBar
        title={needsImage ? 'Add a first frame' : 'Generate video'}
        icon={Wand2}
        disabled={!canGo}
        onPress={generate}
        caption={`${duration}s · ${mode === 'i2v' ? 'from image' : aspect}`}
      />
      <ModelPicker slot="video" value={model} onChange={setModel} visible={picker} onClose={() => setPicker(false)} />
      <ProgressOverlay visible={t.running} title="Rendering video…" status={t.status ?? 'This can take a few minutes'} progress={t.progress} onCancel={t.cancel} />
    </View>
  );
}
