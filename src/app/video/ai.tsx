import { useEventListener } from 'expo';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AlertTriangle, ImagePlus, RefreshCw, Scissors, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Chip, ProgressOverlay, Text, TopBar, colors, radius } from '@/ui';
import { changeVideoScene, editVideo, eraseFromVideo, generateVideo, removeVideoBackground, upscaleVideo, type RunOptions } from '@/lib/runware';
import { addToLibrary, formatDuration, pickMedia } from '@/lib/media';
import { useTask } from '@/lib/useTask';
import { useLibrary } from '@/store/library';
import { AiOptions, aiFormReady, type AiForm } from '@/features/video/AiOptions';
import { AI_TOOLS, MAX_AI_CLIP_MS, SCENES, type AiToolId } from '@/features/video/aiPresets';
import { PickSource } from '@/features/video/PickSource';
import { ResultActions } from '@/features/video/ResultActions';
import { VideoCompare } from '@/features/video/VideoCompare';

type Source = { uri: string; kind: 'video' | 'image'; assetId?: string; durationMs?: number };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const isTool = (t?: string): t is AiToolId => !!t && AI_TOOLS.some((x) => x.id === t);

function initialSource(uri?: string, assetId?: string): Source | null {
  const asset = assetId ? useLibrary.getState().get(assetId) : undefined;
  const u = uri ?? asset?.uri;
  if (!u) return null;
  const kind = asset?.kind === 'image' || /\.(jpe?g|png|webp|heic)(\?|$)/i.test(u) ? 'image' : 'video';
  return { uri: u, kind, assetId: asset?.id, durationMs: asset?.durationMs };
}

function SourcePreview({ src, onDuration }: { src: Source; onDuration: (ms: number) => void }) {
  const player = useVideoPlayer(src.kind === 'video' ? src.uri : null, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  useEventListener(player, 'sourceLoad', ({ duration }) => duration > 0 && onDuration(Math.round(duration * 1000)));
  return (
    <View style={styles.preview}>
      {src.kind === 'video' ? (
        <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls={false} />
      ) : (
        <Image source={{ uri: src.uri }} style={StyleSheet.absoluteFill} contentFit="contain" />
      )}
      {src.durationMs ? (
        <View style={styles.badge}>
          <Text variant="caption">{formatDuration(src.durationMs)}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function VideoAI() {
  const params = useLocalSearchParams<{ uri?: string; assetId?: string; tool?: string }>();
  const insets = useSafeAreaInsets();
  const [initial] = useState(() => initialSource(one(params.uri), one(params.assetId)));
  const paramTool = one(params.tool);
  const [tool, setTool] = useState<AiToolId>(initial?.kind === 'image' ? 'animate' : isTool(paramTool) ? paramTool : 'scene');
  const [src, setSrc] = useState<Source | null>(initial);
  const [photo, setPhoto] = useState<string | undefined>(initial?.kind === 'image' ? initial.uri : undefined);
  const [form, setForm] = useState<AiForm>({ scene: SCENES[0].prompt, custom: '', restyle: '' });
  const [result, setResult] = useState<{ uri: string; assetId: string } | null>(null);
  const task = useTask();

  const meta = AI_TOOLS.find((t) => t.id === tool)!;
  const isAnimate = tool === 'animate';
  const tooLong = !isAnimate && src?.kind === 'video' && (src.durationMs ?? 0) > MAX_AI_CLIP_MS;
  const needsVideo = !isAnimate && src?.kind !== 'video';
  const ready = aiFormReady(tool, form) && (isAnimate ? !!photo : src?.kind === 'video');

  const run = async () => {
    if (!src) return;
    const instruction = form.custom.trim();
    const prompt =
      tool === 'scene' ? instruction || form.scene
      : tool === 'restyle' ? [form.restyle, instruction].filter(Boolean).join(' ')
      : tool === 'animate' ? instruction || 'Subtle natural motion, gentle cinematic camera push-in'
      : instruction || meta.label;
    const job = (opts: RunOptions) => {
      switch (tool) {
        case 'scene':
          return changeVideoScene({ uri: src.uri, scene: prompt }, opts);
        case 'remove':
          return eraseFromVideo({ uri: src.uri, what: instruction }, opts);
        case 'edit':
        case 'restyle':
          return editVideo({ uri: src.uri, instruction: prompt }, opts);
        case 'cutout':
          return removeVideoBackground({ uri: src.uri }, opts);
        case 'upscale':
          return upscaleVideo({ uri: src.uri }, opts);
        case 'animate':
          return generateVideo({ prompt, firstFrameUri: photo, duration: 5 }, opts);
      }
    };
    const url = await task.start(job);
    if (!url) return;
    task.setStatus('Saving to Library…');
    const asset = await addToLibrary({ uri: url, kind: 'video', source: 'ai-edit', prompt: `${meta.label}: ${prompt}`, parentId: src.assetId });
    setResult({ uri: asset.uri, assetId: asset.id });
  };

  const pickPhoto = async () => {
    const [p] = await pickMedia('image');
    if (p) setPhoto(p.uri);
  };

  const header = <TopBar title="AI video" subtitle={meta.label} />;

  if (!src) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {header}
        <PickSource
          icon={Sparkles}
          title={isAnimate ? 'Pick a photo or video' : 'Pick a short clip'}
          body={isAnimate ? 'Choose a photo to bring to life.' : 'Move it to Mars, erase objects, restyle it — AI works best on clips under 10 seconds.'}
          allowImage
          onPicked={(p) => {
            setSrc({ uri: p.uri, kind: p.kind === 'image' ? 'image' : 'video', durationMs: p.durationMs });
            if (p.kind === 'image') {
              setPhoto(p.uri);
              setTool('animate');
            }
          }}
          onAsset={(a) => {
            setSrc({ uri: a.uri, kind: a.kind === 'image' ? 'image' : 'video', assetId: a.id, durationMs: a.durationMs });
            if (a.kind === 'image') {
              setPhoto(a.uri);
              setTool('animate');
            }
          }}
        />
      </View>
    );
  }

  if (result) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingBottom: insets.bottom + 12, gap: 12 }}>
        {header}
        <Animated.View entering={FadeIn} style={{ flex: 1 }}>
          {isAnimate && photo ? <VideoCompare before={photo} beforeIsImage after={result.uri} /> : <VideoCompare before={src.uri} after={result.uri} />}
        </Animated.View>
        <ResultActions
          uri={result.uri}
          onOpenEditor={() => router.push({ pathname: '/video/editor', params: { uri: result.uri, assetId: result.assetId } })}
        />
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', gap: 10 }}>
          <Button variant="secondary" icon={RefreshCw} title="Try again" full style={{ flex: 1 }} onPress={() => setResult(null)} />
          <Button
            variant="ai"
            icon={Sparkles}
            title="Edit result"
            full
            style={{ flex: 1 }}
            onPress={() => {
              setSrc({ uri: result.uri, kind: 'video', assetId: result.assetId });
              setResult(null);
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: colors.bg }}>
      {header}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: insets.bottom + 110, gap: 16 }}>
        <View style={{ paddingHorizontal: 16, gap: 8 }}>
          {isAnimate && photo ? (
            <SourcePreview key={photo} src={{ uri: photo, kind: 'image' }} onDuration={() => {}} />
          ) : (
            <SourcePreview key={src.uri} src={src} onDuration={(ms) => setSrc((s) => (s && s.uri === src.uri && !s.durationMs ? { ...s, durationMs: ms } : s))} />
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button size="sm" variant="secondary" icon={RefreshCw} title="Change" onPress={() => setSrc(null)} />
            {isAnimate ? <Button size="sm" variant="secondary" icon={ImagePlus} title={photo ? 'Other photo' : 'Pick photo'} onPress={pickPhoto} /> : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {AI_TOOLS.map((t) => (
            <Chip key={t.id} label={t.label} icon={t.icon} tint={colors.ai} selected={t.id === tool} onPress={() => setTool(t.id)} />
          ))}
        </ScrollView>

        <Animated.View key={tool} entering={FadeInDown.duration(260)} style={{ paddingHorizontal: 16, gap: 14 }}>
          <Text dim>{meta.blurb}</Text>
          {tooLong ? (
            <Card style={{ borderColor: 'rgba(255,200,77,0.4)', gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <AlertTriangle size={18} color="#FFC84D" />
                <Text variant="label" style={{ flex: 1 }}>
                  This clip is {formatDuration(src.durationMs)} long. AI video models accept short clips (~10s); longer ones may be cut or fail.
                </Text>
              </View>
              <Button size="sm" variant="secondary" icon={Scissors} title="Trim it first" onPress={() => router.push({ pathname: '/video/editor', params: { uri: src.uri, ...(src.assetId ? { assetId: src.assetId } : {}) } })} />
            </Card>
          ) : null}
          {needsVideo ? (
            <Card style={{ gap: 8 }}>
              <Text variant="label">This tool needs a video.</Text>
              <Button size="sm" variant="secondary" title="Pick a video" onPress={() => setSrc(null)} />
            </Card>
          ) : null}
          <AiOptions tool={tool} form={form} setForm={setForm} />
          {isAnimate ? (
            <Button
              size="sm"
              variant="ghost"
              title="More options in Generate video →"
              onPress={() => router.push({ pathname: '/generate/video', params: { ...(photo ? { imageUri: photo } : {}), ...(form.custom ? { prompt: form.custom } : {}) } })}
            />
          ) : null}
        </Animated.View>
      </ScrollView>
      <View style={[styles.cta, { paddingBottom: insets.bottom + 12 }]}>
        <Button variant="ai" size="lg" icon={Sparkles} title={isAnimate ? 'Animate' : tool === 'scene' ? 'Change scene' : 'Apply AI'} full disabled={!ready} onPress={run} />
      </View>
      <ProgressOverlay visible={task.running} title={isAnimate ? 'Animating…' : 'AI is editing your video…'} status={task.status} progress={task.progress} onCancel={task.cancel} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  preview: { height: 300, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#000', borderWidth: 1, borderColor: colors.border },
  badge: { position: 'absolute', right: 10, bottom: 10, backgroundColor: colors.overlay, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  cta: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'rgba(9,9,12,0.92)', borderTopWidth: 1, borderTopColor: colors.border },
});
