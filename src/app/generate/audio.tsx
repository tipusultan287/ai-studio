import { useLocalSearchParams } from 'expo-router';
import { AudioLines, Mic, Music, Wand2, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { addToLibrary } from '@/lib/media';
import { generateMusic, generateSoundEffect, ModelSlot, textToSpeech } from '@/lib/runware';
import { useTask } from '@/lib/useTask';
import { useSettings } from '@/store/settings';
import { Chip, colors, gradients, haptics, LabeledSlider, ProgressOverlay, PromptInput, radius, ScalePressable, Screen, Segmented, Text, TopBar } from '@/ui';
import { AudioResult } from '@/features/generate/AudioResult';
import { ModelField, ModelPicker } from '@/features/generate/ModelPicker';
import { ChipScroller, Field, GenerateBar, GenHero, ToggleChips } from '@/features/generate/parts';
import { GENRES, MOODS, MUSIC_DURATIONS, SFX_EXAMPLES, VOICES, withSuffix } from '@/features/generate/presets';
import type { GenResult } from '@/features/generate/ResultActions';

type Mode = 'speech' | 'music' | 'sfx';
const MODES = [
  { value: 'speech' as const, label: 'Speech' },
  { value: 'music' as const, label: 'Music' },
  { value: 'sfx' as const, label: 'Sound FX' },
];
const SLOT: Record<Mode, ModelSlot> = { speech: 'tts', music: 'music', sfx: 'sfx' };
const toOpts = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));
const DURS = MUSIC_DURATIONS.map((d) => ({ value: d, label: d >= 60 ? `${d / 60} min` : `${d}s` }));

type Job = { mode: Mode; prompt: string; title: string; voice?: string; lyrics?: string; duration?: number; model: string };

export default function GenerateAudio() {
  const params = useLocalSearchParams<{ mode?: string; prompt?: string }>();
  const initialMode: Mode = params.mode === 'music' || params.mode === 'sfx' ? params.mode : 'speech';
  const models = useSettings((s) => s.models);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [text, setText] = useState(initialMode === 'speech' ? (params.prompt ?? '') : '');
  const [musicPrompt, setMusicPrompt] = useState(initialMode === 'music' ? (params.prompt ?? '') : '');
  const [sfxPrompt, setSfxPrompt] = useState(initialMode === 'sfx' ? (params.prompt ?? '') : '');
  const [voice, setVoice] = useState<string>(VOICES[0].id);
  const [genre, setGenre] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState('');
  const [musicDur, setMusicDur] = useState<number | null>(30);
  const [sfxDur, setSfxDur] = useState(4);
  const [picked, setPicked] = useState<Partial<Record<Mode, string>>>({});
  const [picker, setPicker] = useState(false);
  const [result, setResult] = useState<{ r: GenResult; title: string } | null>(null);
  const [lastJob, setLastJob] = useState<Job | null>(null);
  const t = useTask();

  const slot = SLOT[mode];
  const model = picked[mode] ?? models[slot];
  const current = mode === 'speech' ? text : mode === 'music' ? musicPrompt : sfxPrompt;

  const run = async (j: Job) => {
    haptics.impact();
    setLastJob(j);
    const out = await t.start(async (opts) => {
      const url =
        j.mode === 'speech'
          ? await textToSpeech({ text: j.prompt, voice: j.voice, model: j.model }, opts)
          : j.mode === 'music'
            ? await generateMusic({ prompt: j.prompt, lyrics: j.lyrics, duration: j.duration, model: j.model }, opts)
            : await generateSoundEffect({ prompt: j.prompt, duration: j.duration, model: j.model }, opts);
      if (!url) throw new Error('The model returned no audio. Try again or pick another model.');
      opts.onProgress?.({ status: 'Saving to Library…' });
      const a = await addToLibrary({ uri: url, kind: 'audio', source: 'generated', prompt: j.prompt, model: j.model, title: j.title });
      return { uri: a.uri, assetId: a.id };
    });
    if (out) setResult({ r: out, title: j.title });
  };

  const generate = () => {
    if (mode === 'speech') run({ mode, prompt: text.trim(), voice, model, title: `Voice · ${text.trim().slice(0, 40)}` });
    else if (mode === 'music') {
      const p = withSuffix(musicPrompt, genre ?? undefined, mood ? `${mood.toLowerCase()} mood` : undefined);
      run({ mode, prompt: p, lyrics: lyrics.trim() || undefined, duration: musicDur ?? 30, model, title: `Music · ${musicPrompt.trim().slice(0, 40)}` });
    } else run({ mode, prompt: sfxPrompt.trim(), duration: sfxDur, model, title: `SFX · ${sfxPrompt.trim().slice(0, 40)}` });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen header={<TopBar title="Generate audio" subtitle="Speech · Music · Sound FX · Runware" />}>
        <GenHero icon={AudioLines} title="Make it sound right" body="Voiceovers, original music and sound effects." grad={gradients.audio} />
        <View style={{ marginTop: 18 }}>
          <Segmented options={MODES} value={mode} onChange={(m) => { setMode(m); setResult(null); }} />
        </View>

        {mode === 'speech' ? (
          <Animated.View key="speech" entering={FadeIn.duration(220)}>
            <Field label="Script" hint={`${text.length} chars`}>
              <PromptInput value={text} onChangeText={setText} minHeight={140} placeholder="Welcome back to the channel! Today we're building something wild…" />
            </Field>
            <Field label="Voice" hint="voice ids are model-specific">
              <ChipScroller>
                {VOICES.map((v) => (
                  <ScalePressable
                    key={v.id}
                    onPress={() => setVoice(v.id)}
                    style={{ width: 112, padding: 12, gap: 4, borderRadius: radius.md, borderWidth: 1, borderColor: voice === v.id ? colors.audio : colors.border, backgroundColor: voice === v.id ? 'rgba(139,123,255,0.16)' : colors.surface }}>
                    <Mic size={16} color={voice === v.id ? colors.audio : colors.textDim} />
                    <Text weight="700">{v.label}</Text>
                    <Text variant="caption" faint numberOfLines={1}>{v.hint}</Text>
                  </ScalePressable>
                ))}
              </ChipScroller>
              <Text variant="caption" faint>Voices differ per TTS model; if a voice isn&apos;t supported, the model uses its default.</Text>
            </Field>
          </Animated.View>
        ) : mode === 'music' ? (
          <Animated.View key="music" entering={FadeIn.duration(220)}>
            <Field label="Style prompt">
              <PromptInput value={musicPrompt} onChangeText={setMusicPrompt} minHeight={90} placeholder="Warm lo-fi beat with vinyl crackle, mellow keys and soft rain…" />
            </Field>
            <Field label="Genre"><ToggleChips options={toOpts(GENRES)} value={genre} onChange={setGenre} tint={colors.audio} /></Field>
            <Field label="Mood"><ToggleChips options={toOpts(MOODS)} value={mood} onChange={setMood} tint={colors.audio} /></Field>
            <Field label="Lyrics" hint="optional · leave empty for instrumental">
              <TextInput value={lyrics} onChangeText={setLyrics} multiline placeholder={'[verse]\nCity lights are calling out my name…'} placeholderTextColor={colors.textFaint} style={inputStyle} />
            </Field>
            <Field label="Duration"><ToggleChips options={DURS} value={musicDur} onChange={setMusicDur} allowNone={false} tint={colors.audio} /></Field>
          </Animated.View>
        ) : (
          <Animated.View key="sfx" entering={FadeIn.duration(220)}>
            <Field label="Describe the sound">
              <PromptInput value={sfxPrompt} onChangeText={setSfxPrompt} minHeight={80} placeholder="Heavy wooden door creaking open in an empty hall…" />
            </Field>
            <Field label="Examples">
              <ChipScroller>
                {SFX_EXAMPLES.map((s) => <Chip key={s} label={s} icon={Zap} onPress={() => setSfxPrompt(s)} />)}
              </ChipScroller>
            </Field>
            <Field label="Duration">
              <LabeledSlider label="Length" value={sfxDur} min={2} max={10} step={1} onChange={setSfxDur} format={(v) => `${Math.round(v)}s`} tint={colors.audio} />
            </Field>
          </Animated.View>
        )}

        <Field label="Model">
          <ModelField slot={slot} value={model} onPress={() => setPicker(true)} />
        </Field>

        {result ? <AudioResult key={result.r.assetId} result={result.r} title={result.title} onRemix={() => lastJob && run(lastJob)} /> : null}
      </Screen>

      <GenerateBar
        title={mode === 'speech' ? 'Generate speech' : mode === 'music' ? 'Compose music' : 'Create sound'}
        icon={mode === 'music' ? Music : Wand2}
        disabled={!current.trim() || t.running}
        onPress={generate}
        caption={mode === 'music' ? 'Music can take up to a minute' : undefined}
      />
      <ModelPicker slot={slot} value={model} onChange={(id) => setPicked((p) => ({ ...p, [mode]: id }))} visible={picker} onClose={() => setPicker(false)} />
      <ProgressOverlay visible={t.running} title={mode === 'music' ? 'Composing…' : 'Generating audio…'} status={t.status} progress={t.progress} onCancel={t.cancel} />
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
  padding: 14,
  minHeight: 110,
  textAlignVertical: 'top',
} as const;
