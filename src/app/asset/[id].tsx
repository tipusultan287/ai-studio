import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AudioLines, Clapperboard, Download, Pause, Play, Share2, SlidersHorizontal, Sparkles, Trash2 } from 'lucide-react-native';
import { Alert, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteLocal, formatDuration, saveToDevice, shareMedia } from '@/lib/media';
import { openAi, openEditor } from '@/features/shell/navigate';
import { Asset, useLibrary } from '@/store/library';
import { Button, colors, EmptyState, gradients, IconButton, Text, TopBar } from '@/ui';

export default function AssetViewer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const asset = useLibrary((s) => s.assets.find((a) => a.id === id));
  const remove = useLibrary((s) => s.remove);
  const insets = useSafeAreaInsets();

  if (!asset) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <TopBar />
        <EmptyState icon={Sparkles} title="This item is gone" />
      </View>
    );
  }

  const del = () =>
    Alert.alert('Delete from Library?', 'This removes the file from AI Studio.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteLocal(asset.uri);
          if (asset.thumbUri && asset.thumbUri !== asset.uri) deleteLocal(asset.thumbUri);
          remove(asset.id);
          router.back();
        },
      },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopBar
        title={asset.title}
        subtitle={`${asset.source === 'generated' ? 'Generated' : asset.source === 'ai-edit' ? 'AI edit' : asset.source === 'edit' ? 'Edited' : 'Imported'} · ${new Date(asset.createdAt).toLocaleString()}`}
        right={<IconButton icon={Trash2} color={colors.danger} onPress={del} accessibilityLabel="Delete" />}
      />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        {asset.kind === 'image' ? <Image source={{ uri: asset.uri }} style={{ flex: 1 }} contentFit="contain" /> : asset.kind === 'video' ? <VideoPreview uri={asset.uri} /> : <AudioPreview asset={asset} />}
      </View>
      {asset.prompt ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Text variant="caption" faint>
            PROMPT
          </Text>
          <Text dim numberOfLines={3}>
            {asset.prompt}
          </Text>
        </View>
      ) : null}
      <View style={{ padding: 16, paddingBottom: insets.bottom + 16, gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Edit" icon={SlidersHorizontal} style={{ flex: 1 }} full onPress={() => openEditor(asset.kind, asset.uri, asset.id)} />
          {asset.kind !== 'audio' ? (
            <Button title="AI edit" icon={Sparkles} variant="ai" style={{ flex: 1 }} full onPress={() => openAi(asset.kind as 'image' | 'video', asset.uri, undefined, asset.id)} />
          ) : (
            <Button title="Use in video" icon={Clapperboard} variant="secondary" style={{ flex: 1 }} full onPress={() => router.push({ pathname: '/video/editor', params: { musicUri: asset.uri } })} />
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {asset.kind === 'image' ? (
            <Button title="Animate" icon={Clapperboard} variant="secondary" size="sm" style={{ flex: 1 }} full onPress={() => router.push({ pathname: '/generate/video', params: { imageUri: asset.uri } })} />
          ) : null}
          {asset.kind !== 'audio' ? (
            <Button
              title="Save to Photos"
              icon={Download}
              variant="secondary"
              size="sm"
              style={{ flex: 1 }}
              full
              onPress={async () => Alert.alert((await saveToDevice(asset.uri)) ? 'Saved to Photos' : 'Permission needed')}
            />
          ) : null}
          <Button title="Share" icon={Share2} variant="secondary" size="sm" style={{ flex: 1 }} full onPress={() => shareMedia(asset.uri)} />
        </View>
      </View>
    </View>
  );
}

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.play();
  });
  return <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />;
}

function AudioPreview({ asset }: { asset: Asset }) {
  const player = useAudioPlayer(asset.uri);
  const st = useAudioPlayerStatus(player);
  const bars = Array.from({ length: 48 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7 + asset.id.length) * Math.cos(i * 0.31)));
  const pct = st.duration ? st.currentTime / st.duration : 0;
  return (
    <View style={{ alignItems: 'center', gap: 28, padding: 24 }}>
      <LinearGradient colors={[...gradients.audio]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 180, height: 180, borderRadius: 48, alignItems: 'center', justifyContent: 'center' }}>
        <AudioLines size={72} color="#fff" />
      </LinearGradient>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 64 }}>
        {bars.map((h, i) => (
          <View key={i} style={{ width: 4, height: 64 * h, borderRadius: 2, backgroundColor: i / bars.length <= pct ? colors.audio : colors.surfacePressed }} />
        ))}
      </View>
      <Text variant="label" dim style={{ fontVariant: ['tabular-nums'] }}>
        {formatDuration(st.currentTime * 1000)} / {formatDuration((st.duration || 0) * 1000)}
      </Text>
      <IconButton
        icon={st.playing ? Pause : Play}
        size={72}
        active
        onPress={() => {
          if (st.playing) player.pause();
          else {
            if (st.duration && st.currentTime >= st.duration - 0.1) player.seekTo(0);
            player.play();
          }
        }}
      />
    </View>
  );
}
