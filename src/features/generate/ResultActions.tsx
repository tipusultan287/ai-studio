import { router } from 'expo-router';
import { Clapperboard, Download, Film, type LucideIcon, RefreshCw, Share2, SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { saveToDevice, shareMedia } from '@/lib/media';
import { colors, haptics, radius, ScalePressable, Text } from '@/ui';
import type { MediaKind } from '@/ui/theme';

export type GenResult = { uri: string; assetId: string };

const editorPath = { image: '/photo/editor', video: '/video/editor', audio: '/audio/editor' } as const;

export function openEditor(kind: MediaKind, r: GenResult) {
  router.push({ pathname: editorPath[kind], params: { uri: r.uri, assetId: r.assetId } });
}

function Action({ icon: Icon, label, onPress, tint, busy }: { icon: LucideIcon; label: string; onPress: () => void; tint?: string; busy?: boolean }) {
  return (
    <ScalePressable onPress={onPress} disabled={busy} style={[styles.action, busy && { opacity: 0.5 }]} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.actionIcon, tint ? { backgroundColor: tint } : null]}>
        <Icon size={19} color={tint ? '#fff' : colors.text} strokeWidth={2.2} />
      </View>
      <Text variant="caption" dim numberOfLines={1}>
        {label}
      </Text>
    </ScalePressable>
  );
}

/** Save / Share / Edit / Remix (+ Animate for images, + Use in video for audio). */
export function ResultActions({
  kind,
  result,
  onRemix,
  extra,
}: {
  kind: MediaKind;
  result: GenResult;
  onRemix?: () => void;
  extra?: { icon: LucideIcon; label: string; onPress: () => void }[];
}) {
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const save = async () => {
    setBusy('save');
    try {
      const ok = await saveToDevice(result.uri);
      if (ok) {
        haptics.success();
        Alert.alert('Saved', kind === 'audio' ? 'Saved to your device.' : 'Saved to Photos.');
      } else Alert.alert('Permission needed', 'Allow photo library access to save.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  const share = async () => {
    setBusy('share');
    try {
      await shareMedia(result.uri);
    } catch (e) {
      Alert.alert('Could not share', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <View style={styles.row}>
      {kind !== 'audio' ? <Action icon={Download} label="Save" onPress={save} busy={busy === 'save'} /> : null}
      <Action icon={Share2} label="Share" onPress={share} busy={busy === 'share'} />
      <Action icon={SlidersHorizontal} label="Edit" onPress={() => openEditor(kind, result)} />
      {onRemix ? <Action icon={RefreshCw} label="Remix" onPress={onRemix} /> : null}
      {extra?.map((x) => <Action key={x.label} icon={x.icon} label={x.label} onPress={x.onPress} tint={colors.ai} />)}
    </View>
  );
}

export const animateAction = (uri: string) => ({
  icon: Film,
  label: 'Animate',
  onPress: () => router.push({ pathname: '/generate/video', params: { imageUri: uri } }),
});

export const videoEditorAction = (r: GenResult) => ({
  icon: Clapperboard,
  label: 'Use in video',
  onPress: () => router.push({ pathname: '/video/editor', params: { audioUri: r.uri, audioAssetId: r.assetId } }),
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 6, marginTop: 14 },
  action: { flex: 1, alignItems: 'center', gap: 6 },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
