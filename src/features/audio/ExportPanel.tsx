import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { AlertTriangle, CheckCircle2, Download, ExternalLink, Share2, X } from 'lucide-react-native';
import { Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { ffmpegAvailable } from '@/lib/ffmpeg';
import { formatDuration, saveToDevice, shareMedia } from '@/lib/media';
import type { Asset } from '@/store/library';
import { Button, colors, IconButton, radius, Segmented, Text } from '@/ui';
import type { ExportFormat } from './types';

const FORMATS = [
  { value: 'm4a', label: 'M4A · AAC' },
  { value: 'mp3', label: 'MP3' },
  { value: 'wav', label: 'WAV' },
] as const;

export function ExportPanel(p: {
  format: ExportFormat;
  onFormat: (f: ExportFormat) => void;
  durationSec: number;
  result: Asset | null;
  onExport: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const available = ffmpegAvailable();

  const save = async () => {
    if (!p.result) return;
    try {
      const ok = await saveToDevice(p.result.uri);
      if (!ok) Alert.alert('Permission needed', 'Allow media access to save, or use Share to save to Files.');
      else Alert.alert('Saved', 'The audio was saved to your device.');
    } catch {
      Alert.alert('Use Share to save', 'Your device does not accept audio in the media gallery. Use Share → Save to Files.');
    }
  };

  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}>
      <Animated.View entering={SlideInDown.springify().damping(20)} exiting={SlideOutDown} style={{ borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, overflow: 'hidden' }}>
        <BlurView intensity={60} tint="dark" style={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 16, backgroundColor: 'rgba(17,17,22,0.85)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text variant="heading" style={{ flex: 1 }}>
              {p.result ? 'Exported' : 'Export audio'}
            </Text>
            <IconButton icon={X} size={34} accessibilityLabel="Close" onPress={p.onClose} />
          </View>
          {p.result ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.surface }}>
                <CheckCircle2 size={22} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text variant="label">{p.result.title}</Text>
                  <Text variant="caption" faint>
                    Saved to Library · {formatDuration(p.result.durationMs)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Button title="Share" icon={Share2} onPress={() => p.result && shareMedia(p.result.uri)} style={{ flex: 1 }} />
                <Button title="Save" icon={Download} variant="secondary" onPress={save} style={{ flex: 1 }} />
              </View>
              <Button title="View in library" icon={ExternalLink} variant="ghost" onPress={() => p.result && router.push(`/asset/${p.result.id}`)} />
            </>
          ) : (
            <>
              <Segmented options={FORMATS} value={p.format} onChange={p.onFormat} />
              <Text variant="caption" faint>
                {p.format === 'm4a'
                  ? 'Small, high quality, plays everywhere (192 kbps AAC).'
                  : p.format === 'mp3'
                    ? 'Universal MP3 (VBR ~190 kbps). Needs an FFmpeg build with LAME.'
                    : 'Lossless 16-bit PCM. Large files, best for further editing.'}{' '}
                Length {formatDuration(p.durationSec * 1000)}.
              </Text>
              {!available ? (
                <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: colors.aiSoft }}>
                  <AlertTriangle size={18} color={colors.ai} />
                  <Text variant="label" style={{ flex: 1 }} color={colors.ai}>
                    Export needs the full app build with FFmpeg (npx expo run:ios / run:android). Preview works here.
                  </Text>
                </View>
              ) : null}
              <Button title="Export" icon={Download} size="lg" disabled={!available} onPress={p.onExport} full />
            </>
          )}
        </BlurView>
      </Animated.View>
    </Animated.View>
  );
}
