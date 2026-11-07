import { useLocalSearchParams } from 'expo-router';
import { ChevronDown, ChevronUp, Dices, ImageIcon, Lightbulb, Minus, Plus, Wand2 } from 'lucide-react-native';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { addToLibrary } from '@/lib/media';
import { Aspect, ASPECTS, generateImage, GenerateImageParams } from '@/lib/runware';
import { useTask } from '@/lib/useTask';
import { useSettings } from '@/store/settings';
import { Chip, ChipRow, colors, haptics, IconButton, ProgressOverlay, PromptInput, radius, ScalePressable, Screen, Text, TopBar } from '@/ui';
import { FramePicker } from '@/features/generate/FramePicker';
import { ImageResults } from '@/features/generate/ImageResults';
import { ModelField, ModelPicker } from '@/features/generate/ModelPicker';
import { ChipScroller, Field, GenerateBar, GenHero, ToggleChips } from '@/features/generate/parts';
import { enhancePrompt, INSPIRATION, STYLE_PRESETS, withSuffix } from '@/features/generate/presets';
import type { GenResult } from '@/features/generate/ResultActions';

const ratio = (a: Aspect) => {
  const [w, h] = a.split(':').map(Number);
  return w / h;
};

export default function GenerateImage() {
  const params = useLocalSearchParams<{ prompt?: string }>();
  const defaultModel = useSettings((s) => s.models.textToImage);
  const [prompt, setPrompt] = useState(params.prompt ?? '');
  const [style, setStyle] = useState<string | null>(null);
  const [aspect, setAspect] = useState<Aspect>('1:1');
  const [count, setCount] = useState(1);
  const [model, setModel] = useState(defaultModel);
  const [picker, setPicker] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [negative, setNegative] = useState('');
  const [seed, setSeed] = useState('');
  const [reference, setReference] = useState<string | undefined>();
  const [results, setResults] = useState<GenResult[]>([]);
  const [resultAspect, setResultAspect] = useState(1);
  const [lastRun, setLastRun] = useState<GenerateImageParams | null>(null);
  const t = useTask();

  const run = async (p: GenerateImageParams) => {
    haptics.impact();
    setLastRun(p);
    const out = await t.start(async (opts) => {
      const urls = await generateImage(p, opts);
      opts.onProgress?.({ status: 'Saving to Library…' });
      const assets = await Promise.all(
        urls.map((uri) => addToLibrary({ uri, kind: 'image', source: 'generated', prompt: p.prompt, model: p.model })),
      );
      return assets.map((a) => ({ uri: a.uri, assetId: a.id }));
    });
    if (out?.length) {
      setResults(out);
      setResultAspect(ratio(p.aspect ?? '1:1'));
    }
  };

  const generate = () => {
    const preset = STYLE_PRESETS.find((s) => s.value === style);
    const seedNum = seed.trim() ? Number.parseInt(seed, 10) : undefined;
    run({
      prompt: withSuffix(prompt, preset?.suffix),
      negativePrompt: negative.trim() || undefined,
      aspect,
      count,
      model,
      seed: Number.isFinite(seedNum) ? seedNum : undefined,
      referenceImageUris: reference ? [reference] : undefined,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen header={<TopBar title="Generate image" subtitle="Text → Image · Runware" />}>
        <GenHero icon={ImageIcon} title="Imagine anything" body="Describe a scene, pick a look, and let AI paint it." />

        <View style={{ marginTop: 18 }}>
          <PromptInput value={prompt} onChangeText={setPrompt} minHeight={120} placeholder="A cozy cabin in a snowy forest at dusk, warm light in the windows…" />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Chip
              label="Enhance prompt"
              icon={Wand2}
              onPress={() => {
                if (!prompt.trim()) return;
                haptics.tap();
                setPrompt(enhancePrompt(prompt));
              }}
            />
            {prompt ? <Chip label="Clear" onPress={() => setPrompt('')} /> : null}
          </View>
        </View>

        {!prompt.trim() ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Field label="Inspiration" hint="tap to use">
              <View style={{ gap: 8 }}>
                {INSPIRATION.map((s) => (
                  <ScalePressable
                    key={s}
                    scaleTo={0.98}
                    onPress={() => setPrompt(s)}
                    style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
                    <Lightbulb size={16} color={colors.ai} />
                    <Text variant="label" style={{ flex: 1 }}>
                      {s}
                    </Text>
                  </ScalePressable>
                ))}
              </View>
            </Field>
          </Animated.View>
        ) : null}

        <Field label="Style">
          <ToggleChips options={STYLE_PRESETS} value={style} onChange={setStyle} />
        </Field>

        <Field label="Aspect ratio">
          <View style={{ marginHorizontal: -16 }}>
            <ChipRow options={ASPECTS} value={aspect} onChange={setAspect} />
          </View>
        </Field>

        <Field label="Images" hint="1–4">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <IconButton icon={Minus} disabled={count <= 1} onPress={() => setCount((c) => Math.max(1, c - 1))} accessibilityLabel="Fewer images" />
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {[1, 2, 3, 4].map((n) => (
                <ScalePressable
                  key={n}
                  onPress={() => setCount(n)}
                  style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: n <= count ? colors.ai : colors.surfaceHigh }}>
                  <Text weight="700" color={n <= count ? '#fff' : colors.textDim}>
                    {n}
                  </Text>
                </ScalePressable>
              ))}
            </View>
            <IconButton icon={Plus} disabled={count >= 4} onPress={() => setCount((c) => Math.min(4, c + 1))} accessibilityLabel="More images" />
          </View>
        </Field>

        <Field label="Model">
          <ModelField slot="textToImage" value={model} onPress={() => setPicker(true)} />
        </Field>

        <Field label="Reference image" hint="optional · guides composition & style">
          <ChipScroller>
            <FramePicker label="Reference" uri={reference} onChange={setReference} />
          </ChipScroller>
        </Field>

        <ScalePressable
          onPress={() => setAdvanced((a) => !a)}
          style={{ marginTop: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="caption" dim>
            ADVANCED
          </Text>
          {advanced ? <ChevronUp size={18} color={colors.textDim} /> : <ChevronDown size={18} color={colors.textDim} />}
        </ScalePressable>
        {advanced ? (
          <Animated.View entering={FadeIn.duration(200)} style={{ gap: 12, marginTop: 10 }}>
            <TextInput
              value={negative}
              onChangeText={setNegative}
              placeholder="Negative prompt: blurry, extra fingers, watermark…"
              placeholderTextColor={colors.textFaint}
              multiline
              style={inputStyle}
            />
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <TextInput
                value={seed}
                onChangeText={(v) => setSeed(v.replace(/[^0-9]/g, ''))}
                placeholder="Seed (random)"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                style={[inputStyle, { flex: 1 }]}
              />
              <IconButton icon={Dices} onPress={() => setSeed(String(Math.floor(Math.random() * 2 ** 31)))} accessibilityLabel="Random seed" />
            </View>
          </Animated.View>
        ) : null}

        {results.length ? <ImageResults results={results} aspect={resultAspect} onRemix={() => lastRun && run(lastRun)} /> : null}
      </Screen>

      <GenerateBar
        title={count > 1 ? `Generate ${count} images` : 'Generate'}
        icon={Wand2}
        disabled={!prompt.trim() || t.running}
        onPress={generate}
      />
      <ModelPicker slot="textToImage" value={model} onChange={setModel} visible={picker} onClose={() => setPicker(false)} />
      <ProgressOverlay visible={t.running} title="Generating…" status={t.status} progress={t.progress} onCancel={t.cancel} />
    </View>
  );
}

const inputStyle = {
  backgroundColor: colors.surface,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.text,
  fontSize: 15,
  paddingHorizontal: 14,
  paddingVertical: 12,
  minHeight: 46,
} as const;
