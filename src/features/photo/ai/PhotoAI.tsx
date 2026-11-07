import { useImage } from '@shopify/react-native-skia';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { PenLine, RotateCcw, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addToLibrary } from '@/lib/media';
import { useTask } from '@/lib/useTask';
import type { Asset } from '@/store/library';
import { Button, colors, ProgressOverlay, Text, TopBar } from '@/ui';
import { normalizeImage } from '../common/imageIO';
import { ResultActions } from '../common/ResultActions';
import { type AIToolId, AI_TOOLS, runAITool, toolById } from './aiTools';
import { CompareSlider } from './CompareSlider';
import { exportMask, MaskPainter, type MaskStroke } from './MaskPainter';
import { type Options, ToolOptions, ToolPicker } from './ToolOptions';

const asTool = (t?: string): AIToolId => (AI_TOOLS.some((x) => x.id === t) ? (t as AIToolId) : 'bg');

export function PhotoAI({ uri, assetId, initialTool }: { uri: string; assetId?: string; initialTool?: string }) {
  const insets = useSafeAreaInsets();
  const task = useTask();
  const [tool, setTool] = useState<AIToolId>(asTool(initialTool));
  const [src, setSrc] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [o, setO] = useState<Options>({ prompt: '', factor: 2, styleId: 'anime', brush: 34 });
  const [mask, setMask] = useState<MaskStroke[]>([]);
  const [result, setResult] = useState<Asset | null>(null);
  const [srcError, setSrcError] = useState(false);

  useEffect(() => {
    let alive = true;
    normalizeImage(uri)
      .then((n) => alive && setSrc(n))
      .catch(() => alive && setSrcError(true));
    return () => {
      alive = false;
    };
  }, [uri]);

  const skImage = useImage(tool === 'remove' ? (src?.uri ?? null) : null);
  const t = toolById(tool);
  const canRun = !!src && (tool === 'remove' ? mask.length > 0 : t.needsPrompt ? o.prompt.trim().length > 1 : true);

  const pickTool = (id: AIToolId) => {
    setTool(id);
    if (id !== tool) setO((p) => ({ ...p, prompt: '' }));
  };

  const run = async () => {
    if (!src) return;
    const out = await task.start(async (opts) => {
      let maskUri: string | undefined;
      if (tool === 'remove') {
        opts.onProgress?.({ status: 'Preparing mask…' });
        maskUri = await exportMask(mask, src.width, src.height);
      }
      const [url, prompt] = await runAITool({ tool, uri: src.uri, prompt: o.prompt.trim(), maskUri, refUri: o.refUri, factor: o.factor, styleId: o.styleId }, opts);
      if (!url) throw new Error('No image came back. Please try again.');
      opts.onProgress?.({ status: 'Saving to Library…' });
      return addToLibrary({ uri: url, kind: 'image', source: 'ai-edit', prompt, parentId: assetId, title: `${t.label}${o.prompt ? ` · ${o.prompt.slice(0, 32)}` : ''}` });
    });
    if (out) setResult(out);
  };

  const tryAgain = () => setResult(null);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar title={result ? 'Result' : 'AI Photo'} subtitle={t.label} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, marginHorizontal: 12, borderRadius: 22, overflow: 'hidden', backgroundColor: '#000' }}>
          {!src ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              {srcError ? <Text dim>Couldn’t open this photo.</Text> : <ActivityIndicator color={colors.ai} />}
            </View>
          ) : result ? (
            <Animated.View entering={FadeIn} style={{ flex: 1 }}>
              <CompareSlider before={src.uri} after={result.uri} checker={tool === 'cutout'} />
            </Animated.View>
          ) : tool === 'remove' && skImage ? (
            <MaskPainter image={skImage} strokes={mask} brush={o.brush} onStroke={(s) => setMask((m) => [...m, s])} />
          ) : (
            <Image source={{ uri: src.uri }} style={{ flex: 1 }} contentFit="contain" transition={200} />
          )}
        </View>

        <BlurView intensity={30} tint="dark" style={{ paddingTop: 14, paddingBottom: insets.bottom + 10, gap: 12 }}>
          {result ? (
            <Animated.View entering={FadeInDown} style={{ paddingHorizontal: 16, gap: 12 }}>
              <Text variant="caption" faint>
                Saved to your Library · drag the divider to compare
              </Text>
              <ResultActions
                uri={result.uri}
                extra={[
                  { title: 'Open in editor', icon: PenLine, variant: 'primary', onPress: () => router.push({ pathname: '/photo/editor', params: { uri: result.uri, assetId: result.id } }) },
                  { title: 'Try again', icon: RotateCcw, onPress: tryAgain },
                ]}
              />
              <Button
                title="Keep editing with AI"
                variant="ghost"
                icon={Sparkles}
                onPress={() => router.replace({ pathname: '/photo/ai', params: { uri: result.uri, assetId: result.id, tool } })}
              />
            </Animated.View>
          ) : (
            <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
              <ToolPicker value={tool} onChange={pickTool} />
              <ToolOptions tool={tool} o={o} onChange={(p) => setO((x) => ({ ...x, ...p }))} maskCount={mask.length} onUndoMask={() => setMask((m) => m.slice(0, -1))} onClearMask={() => setMask([])} />
              <View style={{ paddingHorizontal: 16 }}>
                <Button title={tool === 'remove' ? 'Erase' : tool === 'upscale' ? `Upscale ${o.factor}×` : 'Generate'} variant="ai" icon={Sparkles} size="lg" full disabled={!canRun || task.running} onPress={run} />
              </View>
            </ScrollView>
          )}
        </BlurView>
      </KeyboardAvoidingView>
      <ProgressOverlay visible={task.running} title={t.label} status={task.status} progress={task.progress} onCancel={task.cancel} />
    </View>
  );
}
